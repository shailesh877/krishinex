const fs = require('fs');

const replacements = [
  {
    file: 'app/(equipment)/terms.tsx',
    search: '<TouchableOpacity style={styles.iconCircle}>\\s*<Ionicons name="notifications-outline" size={20} color="#4B5563" />\\s*</TouchableOpacity>',
    replace: '<TouchableOpacity style={styles.iconCircle} onPress={() => router.push(\'/(equipment)/notifications\' as any)}>\n          <Ionicons name="notifications-outline" size={20} color="#4B5563" />\n        </TouchableOpacity>'
  },
  {
    file: 'app/(equipment)/profile.tsx',
    search: 'onPress={() => router.push(\'/notifications\')}',
    replace: 'onPress={() => router.push(\'/(equipment)/notifications\' as any)}'
  },
  {
    file: 'app/(shop-partner)/accept.tsx',
    search: '<TouchableOpacity style={styles.iconCircle}>\\s*<Ionicons name="notifications-outline" size={20} color="#4B5563" />\\s*</TouchableOpacity>',
    replace: '<TouchableOpacity style={styles.iconCircle} onPress={() => router.push(\'/(shop-partner)/notifications\' as any)}>\n          <Ionicons name="notifications-outline" size={20} color="#4B5563" />\n        </TouchableOpacity>'
  },
  {
    file: 'app/(shop-partner)/orders.tsx',
    search: '<TouchableOpacity style={styles.iconCircle}>\\s*<Ionicons name="notifications-outline" size={20} color="#4B5563" />\\s*</TouchableOpacity>',
    replace: '<TouchableOpacity style={styles.iconCircle} onPress={() => router.push(\'/(shop-partner)/notifications\' as any)}>\n          <Ionicons name="notifications-outline" size={20} color="#4B5563" />\n        </TouchableOpacity>'
  },
  {
    file: 'app/(soil-lab)/profile.tsx',
    search: '<TouchableOpacity style={styles.iconCircle}>\\s*<Ionicons name="notifications-outline" size={20} color="#4B5563" />\\s*</TouchableOpacity>',
    replace: '<TouchableOpacity style={styles.iconCircle} onPress={() => router.push(\'/(soil-lab)/notifications\' as any)}>\n          <Ionicons name="notifications-outline" size={20} color="#4B5563" />\n        </TouchableOpacity>'
  },
  {
    file: 'app/(soil-lab)/requests.tsx',
    search: '<TouchableOpacity style={styles.iconCircle}>\\s*<Ionicons name="notifications-outline" size={20} color="#4B5563" />\\s*</TouchableOpacity>',
    replace: '<TouchableOpacity style={styles.iconCircle} onPress={() => router.push(\'/(soil-lab)/notifications\' as any)}>\n          <Ionicons name="notifications-outline" size={20} color="#4B5563" />\n        </TouchableOpacity>'
  }
];

replacements.forEach(({file, search, replace}) => {
  let content = fs.readFileSync(file, 'utf8');
  let regex = new RegExp(search);
  if (regex.test(content)) {
    fs.writeFileSync(file, content.replace(regex, replace));
    console.log(`Updated ${file}`);
  } else {
    // try exact string replace
    if (content.includes(search)) {
       fs.writeFileSync(file, content.replace(search, replace));
       console.log(`Updated ${file} (exact string)`);
    } else {
       console.log(`Failed to find target in ${file}`);
    }
  }
});
