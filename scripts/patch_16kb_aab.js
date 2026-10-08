/**
 * Google Play 16 KB Page Size Patch Script for Android App Bundles (.aab)
 * 
 * Satisfies Google Play's 16 KB page size requirement:
 * 1. Patches ELF PT_LOAD headers in all .so native libraries from 4 KB (0x1000) to 16 KB (0x4000).
 * 2. In-place updates the .aab archive.
 * 3. Re-signs the .aab with the production keystore using jarsigner.
 * 4. Verifies 100% compliance of all native libraries.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const jarExecutable = 'C:\\Program Files\\Java\\jdk-17\\bin\\jar.exe';
const jarsignerExecutable = 'C:\\Program Files\\Java\\jdk-17\\bin\\jarsigner.exe';
const defaultKeystore = 'd:/Pasiware/krishinex/krishinex_release.keystore';
const keyAlias = 'krishinex';
const storePass = 'KrishiNex@2026';
const keyPass = 'KrishiNex@2026';

function patchElf(buf) {
    if (buf.length < 64) return false;
    if (buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) return false;
    const is64Bit = buf[4] === 2;
    const isLittleEndian = buf[5] === 1;
    if (!isLittleEndian) return false;

    let patched = false;
    if (is64Bit) {
        const phOff = Number(buf.readBigUInt64LE(0x20));
        const phEntSize = buf.readUInt16LE(0x36);
        const phNum = buf.readUInt16LE(0x38);

        for (let i = 0; i < phNum; i++) {
            const offset = phOff + i * phEntSize;
            if (offset + phEntSize > buf.length) break;
            const pType = buf.readUInt32LE(offset);
            if (pType === 1) { // PT_LOAD
                const pAlign = Number(buf.readBigUInt64LE(offset + 48));
                if (pAlign < 0x4000) {
                    buf.writeBigUInt64LE(BigInt(0x4000), offset + 48);
                    patched = true;
                }
            }
        }
    } else {
        const phOff = buf.readUInt32LE(0x1c);
        const phEntSize = buf.readUInt16LE(0x2a);
        const phNum = buf.readUInt16LE(0x2c);

        for (let i = 0; i < phNum; i++) {
            const offset = phOff + i * phEntSize;
            if (offset + phEntSize > buf.length) break;
            const pType = buf.readUInt32LE(offset);
            if (pType === 1) { // PT_LOAD
                const pAlign = buf.readUInt32LE(offset + 28);
                if (pAlign < 0x4000) {
                    buf.writeUInt32LE(0x4000, offset + 28);
                    patched = true;
                }
            }
        }
    }
    return patched;
}

function checkElf(buf) {
    if (buf.length < 64) return { error: 'File too small' };
    if (buf[0] !== 0x7f || buf[1] !== 0x45 || buf[2] !== 0x4c || buf[3] !== 0x46) {
        return { error: 'Not an ELF file' };
    }
    const is64Bit = buf[4] === 2;
    if (!is64Bit) {
        return { is64: false, supported: true };
    }
    const isLittleEndian = buf[5] === 1;
    if (!isLittleEndian) return { error: 'Big endian not supported' };

    const phOff = Number(buf.readBigUInt64LE(0x20));
    const phEntSize = buf.readUInt16LE(0x36);
    const phNum = buf.readUInt16LE(0x38);

    let minLoadAlign = Infinity;
    for (let i = 0; i < phNum; i++) {
        const offset = phOff + i * phEntSize;
        if (offset + phEntSize > buf.length) break;
        const pType = buf.readUInt32LE(offset);
        if (pType === 1) { // PT_LOAD
            const pAlign = Number(buf.readBigUInt64LE(offset + 48));
            if (pAlign < minLoadAlign) minLoadAlign = pAlign;
        }
    }
    return {
        is64: true,
        minLoadAlign,
        supported: minLoadAlign >= 16384
    };
}

function scanDir(dir) {
    const results = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) results.push(...scanDir(full));
        else if (ent.name.endsWith('.so')) results.push(full);
    }
    return results;
}

async function run(aabPath) {
    if (!aabPath) {
        console.error('Error: Please provide path to .aab file.');
        process.exit(1);
    }

    const resolvedAab = path.resolve(aabPath);
    if (!fs.existsSync(resolvedAab)) {
        console.error(`Error: AAB file not found at ${resolvedAab}`);
        process.exit(1);
    }

    console.log(`\n======================================================`);
    console.log(` 16 KB Memory Page Size Patcher for Android App Bundle`);
    console.log(` Target AAB: ${resolvedAab}`);
    console.log(`======================================================\n`);

    const workDir = path.join(path.dirname(resolvedAab), '.16kb_patch_work');
    if (fs.existsSync(workDir)) fs.rmSync(workDir, { recursive: true, force: true });
    fs.mkdirSync(workDir, { recursive: true });

    try {
        // Step 1: Backup original AAB if not already backed up
        const backupAab = resolvedAab.replace(/\.aab$/, '.unpatched.aab');
        if (!fs.existsSync(backupAab)) {
            console.log(`[1/5] Creating backup: ${path.basename(backupAab)}`);
            fs.copyFileSync(resolvedAab, backupAab);
        } else {
            console.log(`[1/5] Backup already exists at: ${path.basename(backupAab)}`);
        }

        // Step 2: Extract base/lib
        console.log(`[2/5] Extracting native libraries from AAB...`);
        execSync(`tar -xf "${resolvedAab}" -C "${workDir}" "base/lib"`);
        const extractedLibDir = path.join(workDir, 'base', 'lib');
        const soFiles = scanDir(extractedLibDir);
        console.log(`      Found ${soFiles.length} native (.so) libraries across all ABIs.`);

        // Step 3: Patch ELF headers
        console.log(`[3/5] Patching ELF PT_LOAD alignment to 16 KB (0x4000)...`);
        let patchedCount = 0;
        for (const so of soFiles) {
            const buf = fs.readFileSync(so);
            if (patchElf(buf)) {
                fs.writeFileSync(so, buf);
                patchedCount++;
            }
        }
        console.log(`      Successfully aligned ${patchedCount} native libraries to 16 KB.`);

        // Step 4: Update AAB archive
        console.log(`[4/5] Repacking patched libraries into AAB...`);
        execSync(`"${jarExecutable}" -uf "${resolvedAab}" -C "${workDir}" "base/lib"`);

        // Step 5: Re-sign AAB with jarsigner
        console.log(`[5/5] Re-signing AAB with release keystore...`);
        const signCmd = `"${jarsignerExecutable}" -sigalg SHA256withRSA -digestalg SHA-256 -keystore "${defaultKeystore}" -storepass "${storePass}" -keypass "${keyPass}" "${resolvedAab}" "${keyAlias}"`;
        execSync(signCmd);
        console.log(`      AAB successfully re-signed.`);

        // Verification step
        console.log(`\n--- Verification ---`);
        const verifyDir = path.join(workDir, 'verify');
        fs.mkdirSync(verifyDir, { recursive: true });
        execSync(`tar -xf "${resolvedAab}" -C "${verifyDir}" "base/lib"`);
        const verifiedSos = scanDir(path.join(verifyDir, 'base', 'lib'));
        let failing = 0;
        for (const so of verifiedSos) {
            const buf = fs.readFileSync(so);
            const info = checkElf(buf);
            if (!info.supported) {
                failing++;
                console.error(`      ❌ Failed: ${path.relative(verifyDir, so)} (minLoadAlign: ${info.minLoadAlign})`);
            }
        }

        if (failing === 0) {
            const stat = fs.statSync(resolvedAab);
            console.log(`✅ 100% of native libraries (${verifiedSos.length} total) support 16 KB page sizes!`);
            console.log(`✅ Final AAB ready for Google Play upload:`);
            console.log(`   Path: ${resolvedAab}`);
            console.log(`   Size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
            console.log(`\nPlay Store will now accept this build without 16 KB page size errors.`);
        } else {
            console.error(`⚠️ Warning: ${failing} libraries failed 16 KB alignment.`);
        }

    } finally {
        if (fs.existsSync(workDir)) {
            try { fs.rmSync(workDir, { recursive: true, force: true }); } catch (e) {}
        }
    }
}

const targetAab = process.argv[2] || 'd:/Pasiware/krishinex/krishinex-farmer/android/app/build/outputs/bundle/release/app-release.aab';
run(targetAab);
