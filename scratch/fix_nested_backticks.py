with open('lib/ai/rapor.ts', 'r', encoding='utf-8') as f:
    content = f.read()

target = "${indicators.map(i => `- ${i.id} ${i.label}: Skor ${i.score} (Kategori: ${i.category})${i.prevScore !== undefined ? `, Skor Tahun Lalu: ${i.prevScore}, Trend: ${i.trend}` : ''`)}"
replacement = '${indicators.map(i => "- " + i.id + " " + i.label + ": Skor " + i.score + " (Kategori: " + i.category + ")" + (i.prevScore !== undefined ? ", Skor Tahun Lalu: " + i.prevScore + ", Trend: " + i.trend : "")).join(\'\\n\')}'

if target in content:
    content = content.replace(target, replacement)
    print("Found and replaced target line.")
else:
    # Try case-insensitive or partial
    print("Target line not found exactly. Let's do a regex replacement.")
    import re
    pattern = r'\$\{indicators\.map\(i => `- \$\{i\.id\} \$\{i\.label\}: Skor \$\{i\.score\} \(Kategori: \$\{i\.category\}\)\$\{i\.prevScore !== undefined \? `, Skor Tahun Lalu: \$\{i\.prevScore\}, Trend: \$\{i\.trend\}` : \'\'`\)\}'
    content = re.sub(pattern, replacement, content)

with open('lib/ai/rapor.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Finished fixing nested backticks.")
