const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, '../uploads');
if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    console.log(`Uploads directory exists! Total files: ${files.length}`);
    console.log('Sample files:', files.slice(0, 10));
} else {
    console.log('Uploads directory does NOT exist!');
}
