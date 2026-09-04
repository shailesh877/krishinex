const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? 
      walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./app', function(filePath) {
  if (filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if it has the notifications icon
    if (content.includes('name="notifications-outline"')) {
      let modified = false;

      // 1. Add import if not present
      if (!content.includes('NotificationIcon')) {
        const importStatement = "import NotificationIcon from '@/components/NotificationIcon';\n";
        // Put it after the last import
        const lastImportIndex = content.lastIndexOf('import ');
        if (lastImportIndex !== -1) {
          const endOfLastImport = content.indexOf('\n', lastImportIndex);
          content = content.slice(0, endOfLastImport + 1) + importStatement + content.slice(endOfLastImport + 1);
        } else {
          content = importStatement + content;
        }
        modified = true;
      }

      // 2. Replace all instances of <Ionicons name="notifications-outline" ... />
      // Example: <Ionicons name="notifications-outline" size={20} color="#4B5563" />
      // We will replace with: <NotificationIcon size={20} color="#4B5563" />
      const regex = /<Ionicons\s+name="notifications-outline"\s+size=\{([^}]+)\}\s+color=(["'][^"']+["']|\{[^}]+\})\s*\/>/g;
      
      if (regex.test(content)) {
        content = content.replace(regex, '<NotificationIcon size={$1} color=$2 />');
        modified = true;
      } else {
        // sometimes there's no color or size
        const regex2 = /<Ionicons\s+name="notifications-outline"\s*\/>/g;
        if (regex2.test(content)) {
          content = content.replace(regex2, '<NotificationIcon />');
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Patched:', filePath);
      }
    }
  }
});
