import os
import glob
import re

html_files = glob.glob('d:/khetify/khetify_admin/*.html')

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Change body { font-family: 'Inter', sans-serif !important; } to * { ... }
    content = content.replace("body {\n      font-family: 'Inter'", "* {\n      font-family: 'Inter'")
    
    # Also catch other variations if they existed
    content = content.replace("body { font-family: 'Inter'", "* { font-family: 'Inter'")

    # Fallback to inject if somehow missing completely
    if "* {\n      font-family: 'Inter'" not in content and "* { font-family: 'Inter'" not in content:
        # Check if we should replace the old body tag
        content = re.sub(r'body\s*\{\s*font-family:\s*\'Inter\',\s*sans-serif\s*!important;\s*\}', 
                         r'* { font-family: \'Inter\', sans-serif !important; }', content)
                         
    # Also inject tailwind config font family just in case for v3 pages
    if "fontFamily: {" not in content and "tailwind.config = {" in content:
        content = content.replace(
            "extend: {",
            "fontFamily: { sans: ['Inter', 'sans-serif'] },\n        extend: {"
        )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Forcibly updated {len(html_files)} files with universal Inter font (*).")
