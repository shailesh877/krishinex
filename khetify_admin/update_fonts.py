import os
import glob
import re

html_files = glob.glob('d:/khetify/khetify_admin/*.html')

google_font_tags = """
  <!-- Google Fonts: Inter -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
"""

style_tag = """<style>
    body {
      font-family: 'Inter', sans-serif !important;
    }
"""

for path in html_files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Inject Google Fonts
    if "fonts.googleapis.com" not in content:
        content = content.replace(
            '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />',
            '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" />\n' + google_font_tags
        )
        
    # Inject CSS
    if "font-family: 'Inter'" not in content:
        if "<style>" in content:
            content = content.replace("<style>", style_tag)
        else:
            content = content.replace("</head>", style_tag + "  </style>\n</head>")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

print(f"Updated {len(html_files)} files with Inter font.")
