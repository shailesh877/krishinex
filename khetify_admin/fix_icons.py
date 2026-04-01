import os
import glob
import re

html_files = glob.glob('d:/khetify/khetify_admin/*.html')

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert * back to body so we don't break FontAwesome!
    content = content.replace("* {\n      font-family: 'Inter'", "body {\n      font-family: 'Inter'")
    content = content.replace("* { font-family: 'Inter'", "body { font-family: 'Inter'")

    # Also, we injected tailwind config fontFamily properly earlier.

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print("Reverted * to body to fix FontAwesome icons. The font is still applied via Tailwind config securely.")
