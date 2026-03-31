const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const EXCLUDES = ['node_modules', '.git', '.next', 'build', 'dist', 'bin', 'obj', '.expo', '.gradle', 'android', 'ios'];

// Replacement mapping
const REPLACEMENTS = [
    { old: 'https://demo.ranx24.com', new: 'https://demo.ranx24.com' },
    { old: 'demo.ranx24.com', new: 'demo.ranx24.com' },
    { old: 'demo.ranx24.com', new: 'demo.ranx24.com' }
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
            if (['.html', '.js', '.ts', '.tsx', '.ps1', '.env', '.json', '.md'].includes(ext)) {
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
console.log('Update Complete! All local IPs replaced with demo.ranx24.com');
