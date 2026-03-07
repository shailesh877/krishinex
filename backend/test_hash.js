const bcrypt = require('bcryptjs');

async function test() {
    const hash = '$2b$10$W2c2hQRyFV5/vAhWadTYROTP4ZGKvjxBqr1AXy63upmYPsMSsbPL6';
    const passwords = ['admin123', 'admin@123', '12345678', '123456789'];

    console.log('Testing hash:', hash);
    for (const p of passwords) {
        const match = await bcrypt.compare(p, hash);
        console.log(`Password [${p}] Match: ${match}`);
    }
}

test();
