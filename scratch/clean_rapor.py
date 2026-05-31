with open('lib/ai/rapor.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the invalid backslash-backticks and backslash-dollars
fixed = content.replace('\\`', '`').replace('\\${', '${')

with open('lib/ai/rapor.ts', 'w', encoding='utf-8') as f:
    f.write(fixed)

print('Successfully cleaned up escapes in lib/ai/rapor.ts')
