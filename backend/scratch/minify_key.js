const fs = require('fs');
const path = require('path');

const keyPath = path.join(__dirname, '../serviceAccountKey.json');

try {
    const rawData = fs.readFileSync(keyPath, 'utf8');
    const json = JSON.parse(rawData);
    
    // Minify the JSON string (removes all spaces, newlines, etc.)
    const minified = JSON.stringify(json);
    
    // Wrap in single quotes for Coolify Raw Env format
    const coolifyFormat = `FIREBASE_SERVICE_ACCOUNT='${minified}'`;
    
    console.log("\n=================== COPY THIS ENTIRE LINE ===================");
    console.log(coolifyFormat);
    console.log("=============================================================\n");
    
    console.log(`Length of private key inside minified JSON: ${json.private_key.length} (Should be 1704)`);
} catch (e) {
    console.error("❌ Error minifying key:", e.message);
}
