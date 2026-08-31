const sharp = require('sharp');
const path = require('path');

const INPUT = path.join(__dirname, 'assets', 'images', 'Krishinex App logo PNG.png');
const OUTPUT = path.join(__dirname, 'assets', 'images', 'android-icon-foreground.png');

// Android adaptive icon is 1024x1024
// Safe zone (won't be cropped) is center 66% = ~676px
// We want logo to fill ~55% of the total = ~563px to look smaller
const CANVAS = 1024;
const LOGO_SIZE = Math.round(CANVAS * 0.65); // 65% = very large logo, minimal padding (Safe Zone limit)

async function run() {
    const resized = await sharp(INPUT)
        .resize(LOGO_SIZE, LOGO_SIZE, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .toBuffer();

    await sharp({
        create: {
            width: CANVAS,
            height: CANVAS,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
    .composite([{
        input: resized,
        gravity: 'center'
    }])
    .png()
    .toFile(OUTPUT);

    console.log(`✅ Done! Foreground icon saved to: ${OUTPUT}`);
    console.log(`   Canvas: ${CANVAS}x${CANVAS}, Logo: ${LOGO_SIZE}x${LOGO_SIZE} (55% of canvas)`);
}

run().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
