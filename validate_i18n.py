#!/usr/bin/env python3
import re
import json

# Read the file
with open('src/lib/i18n.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract the dictionaries part
dict_start = content.find('const dictionaries: Record<Language, Record<string, string>> = {')
dict_end = content.rfind('};')

if dict_start == -1 or dict_end == -1:
    print("ERROR: Could not find dictionaries definition")
    exit(1)

dict_content = content[dict_start + len('const dictionaries: Record<Language, Record<string, string>> = {'): dict_end]

# Parse each language dictionary
languages = ['id', 'en', 'zh', 'ko', 'ja']

for lang in languages:
    pattern = f'{lang}:\\s*{{' + r'(.*?)' + r'(?=\n\s*[a-z]+:\s*{|\n\s*}};)'
    match = re.search(pattern, dict_content, re.DOTALL)
    
    if not match:
        print(f"ERROR: Could not find {lang} dictionary")
        continue
    
    lang_dict = match.group(1)
    # Extract all keys
    keys = re.findall(r'"([^"]+)":\s*', lang_dict)
    
    print(f"\n{lang} dictionary:")
    print(f"  Total keys: {len(keys)}")
    
    # Find duplicates
    unique_keys = set(keys)
    if len(keys) != len(unique_keys):
        duplicates = [key for key in unique_keys if keys.count(key) > 1]
        print(f"  WARNING: Duplicate keys found: {duplicates}")
    
    # Show a sample
    print(f"  Sample keys: {keys[:5]}")

print("\n✓ Validation complete")
