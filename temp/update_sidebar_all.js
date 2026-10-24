const fs = require('fs');
const path = require('path');

const adminDir = path.resolve(__dirname, '../krishinex-admin');
const files = fs.readdirSync(adminDir).filter(f => f.endsWith('.html'));

const milkSnippet = `
        <div class="pt-3">
          <p class="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500 font-black">Milk Services</p>
        </div>

        <a href="milk_management.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-glass-water text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Milk Management</span>
        </a>`;

let updatedCount = 0;

for (const file of files) {
  if (file === 'milk_management.html') continue; // Handled separately
  const filePath = path.join(adminDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already contains milk_management.html
  if (content.includes('milk_management.html')) {
    console.log(`[SKIP] Already present in: ${file}`);
    continue;
  }

  // Find insertion point: Before System category or before settings.html or before </nav>
  let inserted = false;

  // Pattern 1: Before System header
  const systemHeaderRegex = /(<div class="pt-3">\s*<p[^>]*>System<\/p>\s*<\/div>)/i;
  if (systemHeaderRegex.test(content)) {
    content = content.replace(systemHeaderRegex, `${milkSnippet}\n\n        $1`);
    inserted = true;
  } else {
    // Pattern 2: After payout_management.html anchor tag
    const payoutRegex = /(<a\s+href="payout_management\.html"[^>]*>[\s\S]*?<\/a>)/i;
    if (payoutRegex.test(content)) {
      content = content.replace(payoutRegex, `$1\n${milkSnippet}`);
      inserted = true;
    } else {
      // Pattern 3: Before settings.html anchor
      const settingsRegex = /(<a\s+href="settings\.html"[^>]*>)/i;
      if (settingsRegex.test(content)) {
        content = content.replace(settingsRegex, `${milkSnippet}\n\n        $1`);
        inserted = true;
      }
    }
  }

  if (inserted) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`[UPDATED] Added Milk link to: ${file}`);
    updatedCount++;
  } else {
    console.log(`[NO-MATCH] Sidebar not found or pattern missing in: ${file}`);
  }
}

console.log(`\nSuccessfully updated ${updatedCount} files.`);
