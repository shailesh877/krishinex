import zipfile
import xml.etree.ElementTree as ET
import os

docx_path = r'd:\Pasiware\krishinex\Krishinex Milk Services.docx'

with zipfile.ZipFile(docx_path) as z:
    xml_content = z.read('word/document.xml')

root = ET.fromstring(xml_content)

# Namespaces in docx xml
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

paragraphs = []
for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
    texts = [node.text for node in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if node.text]
    if texts:
        paragraphs.append(''.join(texts))

output_txt = '\n'.join(paragraphs)

with open(r'd:\Pasiware\krishinex\temp\docx_extracted.txt', 'w', encoding='utf-8') as f:
    f.write(output_txt)

print(f"Extracted {len(paragraphs)} paragraphs, written to temp/docx_extracted.txt")
