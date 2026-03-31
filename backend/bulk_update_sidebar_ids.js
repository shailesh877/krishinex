const fs = require('fs');
const path = require('path');

const dir = 'd:/khetify/khetify_admin';
const files = fs.readdirSync(dir);

let updatedCount = 0;

files.forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        let changed = false;

        // 1. Update Sidebar Name
        const sidebarTarget = '<p class="text-xs font-black text-slate-900 truncate">Super Admin</p>';
        const sidebarReplacement = '<p id="sidebarUserName" class="text-xs font-black text-slate-900 truncate">Super Admin</p>';
        if (content.includes(sidebarTarget)) {
            content = content.split(sidebarTarget).join(sidebarReplacement);
            changed = true;
        }

        // 2. Update Header Initial/Name
        const headerTarget = '<span class="ml-2 mr-2 hidden sm:inline text-slate-900 font-black text-xs">SA</span>';
        const headerReplacement = '<span id="headerUserName" class="ml-2 mr-2 hidden sm:inline text-slate-900 font-black text-xs">SA</span>';
        if (content.includes(headerTarget)) {
            content = content.split(headerTarget).join(headerReplacement);
            changed = true;
        }

        if (changed) {
            fs.writeFileSync(filePath, content, 'utf8');
            updatedCount++;
        }
    }
});

console.log(`Updated IDs in ${updatedCount} HTML files!`);
