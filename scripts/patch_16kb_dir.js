
const fs = require("fs");
const path = require("path");

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
            if (buf.readUInt32LE(offset) === 1) { // PT_LOAD
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
            if (buf.readUInt32LE(offset) === 1) { // PT_LOAD
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

function scanDir(dir) {
    let patchedCount = 0;
    if (!fs.existsSync(dir)) return 0;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) patchedCount += scanDir(full);
        else if (ent.name.endsWith(".so")) {
            const buf = fs.readFileSync(full);
            if (patchElf(buf)) {
                fs.writeFileSync(full, buf);
                patchedCount++;
            }
        }
    }
    return patchedCount;
}

const targetDir = process.argv[2];
if (targetDir && fs.existsSync(targetDir)) {
    console.log(`Scanning and patching native libs for 16KB alignment in: ${targetDir}`);
    const count = scanDir(targetDir);
    console.log(`Patched ${count} native libraries.`);
} else {
    console.error(`Invalid directory: ${targetDir}`);
    process.exit(1);
}

