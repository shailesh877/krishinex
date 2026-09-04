const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'routes');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regular expression to match res.status(500).json({ error: 'Server error ...' })
    // and also check for similar variants
    const regex = /res\.status\(500\)\.json\(\{\s*error:\s*['"`]Server error[^'"`]*['"`]\s*\}\)/gi;
    
    // Replace them all with 'Network issue. Please try again later.'
    if (regex.test(content) || content.includes('Server error')) {
        let newContent = content.replace(
            /res\.status\(500\)\.json\(\{\s*error:\s*['"`]Server error[^'"`]*['"`]\s*\}\)/gi, 
            "res.status(500).json({ error: 'Network issue. Please try again later.' })"
        );
        
        // Let's also catch any manual res.status(500).send or similar strings
        newContent = newContent.replace(
            /['"`]Server error[^'"`]*['"`]/gi,
            "'Network issue. Please try again later.'"
        );
        
        // Avoid replacing console.error('Server error')
        // We'll write the new file
        if (content !== newContent) {
            // Restore console.errors if any got affected
            newContent = newContent.replace(/console\.error\('Network issue\. Please try again later\.'/gi, "console.error('Server error'");
            newContent = newContent.replace(/console\.log\('Network issue\. Please try again later\.'/gi, "console.log('Server error'");
            
            fs.writeFileSync(filePath, newContent, 'utf8');
            console.log(`Updated ${filePath}`);
        }
    }
}

fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.js')) {
        replaceInFile(path.join(routesDir, file));
    }
});

console.log('Done replacing in routes.');
