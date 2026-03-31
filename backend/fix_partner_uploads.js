const fs = require('fs');
const path = require('path');

const baseDir = 'd:/khetify/krishinex-partner/app';
const pattern = /'Content-Type':\s*'multipart\/form-data',?/g;

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.match(pattern)) {
                console.log(`Fixing: ${fullPath}`);
                content = content.replace(pattern, '');
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    });
}

walk(baseDir);
console.log('Bulk fix for multipart/form-data headers completed!');
