const sharp = require('d:/khetify/backend/node_modules/sharp');
const path = require('path');

const inputPath = 'd:/khetify/krishinex-partner/assets/images/Krishinex Partner App logo PNG 2.png';
const outputPath = 'd:/khetify/krishinex-partner/assets/images/partner-icon-foreground.png';

async function createPaddedIcon() {
    try {
        const metadata = await sharp(inputPath).metadata();
        console.log('Original Metadata:', metadata);

        // Adaptive icon size is 1080x1080
        // Safe area is roughly 66% of the size (720x720)
        // I'll make the logo 600x600 within the 1080x1080 to give it nice "padding"
        const targetLogoSize = 700;

        await sharp(inputPath)
            .resize(targetLogoSize, targetLogoSize, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .extend({
                top: (1080 - targetLogoSize) / 2,
                bottom: (1080 - targetLogoSize) / 2,
                left: (1080 - targetLogoSize) / 2,
                right: (1080 - targetLogoSize) / 2,
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .toFile(outputPath);

        console.log('Padded icon created at:', outputPath);
    } catch (err) {
        console.error('Error:', err);
    }
}

createPaddedIcon();
