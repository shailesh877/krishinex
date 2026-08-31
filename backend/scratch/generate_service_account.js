const fs = require('fs');
const path = require('path');
require('dotenv').config();

try {
    const rawConfig = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!rawConfig) {
        console.error('❌ FIREBASE_SERVICE_ACCOUNT is not defined in .env');
        process.exit(1);
    }

    const config = JSON.parse(rawConfig);
    
    // Clean up private key to ensure it has actual newlines inside the parsed object,
    // then when we stringify it, JSON.stringify will automatically write it as a perfectly
    // formatted JSON string with \n character escapes on a single line!
    if (config.private_key) {
        config.private_key = config.private_key
            .split('\\n').join('\n')
            .split('\\r').join('\r')
            .trim();
    }

    const outputPath = path.join(__dirname, '../serviceAccountKey.json');
    fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
    console.log('✅ Successfully generated serviceAccountKey.json with 100% valid JSON formatting!');
} catch (e) {
    console.error('❌ Generation failed:', e);
}
