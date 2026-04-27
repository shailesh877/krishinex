const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const EXCLUDES = ['node_modules', '.git', '.next', 'build', 'dist', 'bin', 'obj', '.expo', '.gradle', 'android', 'ios'];

const NEW_IP = process.argv[2];

if (!NEW_IP) {
    console.error('Please provide a new IP. Usage: node bulk_update_ip.js <NEW_IP>');
    process.exit(1);
}

const PAST_IPS = ['192.168.31.124', '192.168.31.124', '192.168.31.124', '192.168.31.124'];

// Replacement mapping
const REPLACEMENTS = [
    { old: 'http://192.168.31.124:5500', new: 'http://192.168.31.124:5500' },
    { old: '192.168.31.124', new: '192.168.31.124' }
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            if (!EXCLUDES.includes(file)) {
                walk(fullPath);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (['.html', '.js', '.ts', '.tsx', '.ps1', '.env', '.json', '.md'].includes(ext) || file === '.env') {
                let content = fs.readFileSync(fullPath, 'utf8');
                let updated = false;

                for (const rep of REPLACEMENTS) {
                    if (content.includes(rep.old)) {
                        console.log(`Updating: ${fullPath} (${rep.old} -> ${rep.new})`);
                        content = content.split(rep.old).join(rep.new);
                        updated = true;
                    }
                }

                if (updated) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                }
            }
        }
    }
}

console.log(`Starting Universal Server Flip...`);
walk(ROOT_DIR);
console.log(`Update Complete! All local IPs replaced with ${NEW_IP}`);
