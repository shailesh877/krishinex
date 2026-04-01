import os
import glob
import re

html_files = glob.glob('d:/khetify/khetify_admin/*.html')

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # We must completely remove the !important tag from the CSS because 
    # !important on body propagates down and breaks FontAwesome icons.
    # The Tailwind configuration (fontFamily: { sans: [...] }) we injected
    # earlier is sufficient to apply the font to all normal text globally.
    
    # Remove variations of the CSS block
    content = re.sub(
        r'<style>\s*body\s*\{\s*font-family:\s*\'Inter\',\s*sans-serif\s*!important;\s*\}\s*',
        '<style>\n    ', 
        content
    )
    content = re.sub(
        r'body\s*\{\s*font-family:\s*\'Inter\',\s*sans-serif\s*!important;\s*\}',
        '', 
        content
    )

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Removed !important body font styles from {len(html_files)} files to fix FontAwesome icons.")
