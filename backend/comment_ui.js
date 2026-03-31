const fs = require('fs');
const path = 'd:/khetify/khetify_admin/machine_partners_management.html';
let content = fs.readFileSync(path, 'utf8');

// 1. Comment out the Cash Collections section
// We'll use a regex that matches the section from the comment to the closing section tag.
const htmlRegex = /<!-- CASH COLLECTIONS TABLE -->\s*<section[\s\S]*?<\/section>/;
const htmlMatch = content.match(htmlRegex);
if (htmlMatch) {
    console.log('Found HTML section. Commenting out...');
    content = content.replace(htmlMatch[0], `<!--\n${htmlMatch[0]}\n-->`);
} else {
    console.log('HTML section not found via regex.');
}

// 2. Add guard to JS function
// Match the function start and the next line
const jsRegex = /async function fetchCashCollections\(\) \{\s*const tbody = document\.getElementById\('cashCollectionBody'\);/;
const jsMatch = content.match(jsRegex);
if (jsMatch) {
    console.log('Found JS function. Adding guard...');
    content = content.replace(jsMatch[0], `${jsMatch[0]}\n      if (!tbody) return;`);
} else {
    console.log('JS function not found via regex.');
}

fs.writeFileSync(path, content, 'utf8');
console.log('Done!');
