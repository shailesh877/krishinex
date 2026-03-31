const path = require('path');
const fs = require('fs');

console.log('Current __dirname:', __dirname);
const envPath = path.join(__dirname, 'backend', '.env');
console.log('Checking .env at:', envPath);
if (fs.existsSync(envPath)) {
    console.log('.env exists');
    const content = fs.readFileSync(envPath, 'utf8');
    console.log('.env first 20 chars:', content.substring(0, 20));
} else {
    console.log('.env DOES NOT exist');
}
