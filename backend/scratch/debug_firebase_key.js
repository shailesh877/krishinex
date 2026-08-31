// Deep debug: check exact bytes in private_key
require('dotenv').config();

const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
const parsed = JSON.parse(raw);
const pk = parsed.private_key;

console.log('=== Char codes around first \\n sequence ===');
const idx = pk.indexOf('\\');
if (idx >= 0) {
    for (let i = Math.max(0, idx - 2); i < Math.min(pk.length, idx + 6); i++) {
        console.log(`  [${i}] char='${pk[i]}' code=${pk.charCodeAt(i)}`);
    }
}

console.log('\n=== Tests ===');
console.log('includes actual newline (charCode 10):', pk.includes('\n'));
console.log('includes backslash (charCode 92):', pk.includes('\\'));
console.log('includes literal \\n (2 chars):', pk.includes('\\n'));

// Try different fixes
const fix1 = pk.split('\\n').join('\n');
console.log('\nFix1 (split \\n join \\n): hasNewlines=', fix1.includes('\n'));

const fix2 = pk.replace(/\\n/g, '\n');
console.log('Fix2 (replace /\\n/): hasNewlines=', fix2.includes('\n'));

const fix3 = new Function('return ' + JSON.stringify(pk).replace(/\\\\n/g, '\\n'))();
console.log('Fix3 (double parse): hasNewlines=', typeof fix3 === 'string' && fix3.includes('\n'));
