import os
import re

def repair_sidebar(directory):
    # Regex to find the broken fragment we likely created: 
    # It starts with the Farmers & Users span/link and ends before the next link (usually Nex Card Management or Field Executive)
    
    # This pattern matches the broken link (missing <a> tag) and the Nex Card Management link if it exists
    broken_pattern = re.compile(
        r'<span\s+class="truncate font-(?:semibold|black)">Farmers & Users</span>\s+</a>\s*(?:<a href="nex_card_management\.html".*?</a>)?',
        re.DOTALL
    )

    # The corrected block: Includes both Farmers & Users AND Nex Card Management
    corrected_block = '''        <a href="users_managment.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-green-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-green-100 transition-all">
            <i class="fas fa-seedling text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Farmers & Users</span>
        </a>

        <a href="nex_card_management.html"
          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">
          <span
            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">
            <i class="fas fa-id-card text-slate-600 group-hover:text-emerald-600 transition-colors"></i>
          </span>
          <span class="truncate font-semibold">Nex Card Management</span>
        </a>'''

    for filename in os.listdir(directory):
        if filename.endswith(".html"):
            filepath = os.path.join(directory, filename)
            with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()

            if broken_pattern.search(content):
                new_content = broken_pattern.sub(corrected_block, content)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Repaired: {filename}")
            else:
                # If it's not broken but missing Nex Card entirely (optional check)
                if "nex_card_management.html" not in content and "Farmers & Users" in content:
                    # Target the Farmers & Users block to insert after it
                    insert_pattern = re.compile(
                        r'(<a href="users_managment\.html".*?</a>)',
                        re.DOTALL
                    )
                    if insert_pattern.search(content):
                        new_content = insert_pattern.sub(r'\1\n\n        <a href="nex_card_management.html"\n          class="group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-slate-700 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-sky-50 hover:text-emerald-700 transition-all duration-200">\n          <span\n            class="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-gradient-to-br group-hover:from-emerald-100 group-hover:to-sky-100 transition-all">\n            <i class="fas fa-id-card text-slate-600 group-hover:text-emerald-600 transition-colors"></i>\n          </span>\n          <span class="truncate font-semibold">Nex Card Management</span>\n        </a>', content)
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Updated (Added Nex Card): {filename}")

if __name__ == "__main__":
    admin_dir = r"d:\khetify\khetify_admin"
    repair_sidebar(admin_dir)
    print("Sidebar repair completed.")
