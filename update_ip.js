const fs = require('fs');
const path = require('path');

const OLD_IP = 'demo.ranx24.com';
const NEW_IP = 'demo.ranx24.com';

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!dirFile.includes('node_modules') && !dirFile.includes('.git') && !dirFile.includes('.expo')) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (
        dirFile.endsWith('.html') || 
        dirFile.endsWith('.ts') || 
        dirFile.endsWith('.ps1') || 
        dirFile.endsWith('.js') || 
        dirFile.endsWith('.tsx')
      ) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
}

const files = walkSync('d:\\khetify');
let changedCount = 0;

for (const file of files) {
  try {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(OLD_IP)) {
      content = content.replace(new RegExp(OLD_IP.replace(/\./g, '\\.'), 'g'), NEW_IP);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
      changedCount++;
    }
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
  }
}

console.log(`Total files updated: ${changedCount}`);
