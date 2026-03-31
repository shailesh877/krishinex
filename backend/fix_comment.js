const fs = require('fs');
const path = 'd:/khetify/khetify_admin/machine_partners_management.html';
let content = fs.readFileSync(path, 'utf8');

// The issue is nested comments: <!-- <!-- ... --> ... -->
// The first --> closes the outer comment.
// I will remove the nested comment markers.

content = content.replace('<!--\n<!-- CASH COLLECTIONS TABLE -->', '<!--\nCASH COLLECTIONS TABLE');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed nested comment issue!');
