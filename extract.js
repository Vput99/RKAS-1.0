const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'components/EvidenceTemplates.tsx');
const destPath = path.join(__dirname, 'lib/pdfGenerators.ts');

const content = fs.readFileSync(srcPath, 'utf8');
const lines = content.split('\n');

// Find the start line for PDF Generators
const startIdx = lines.findIndex(line => line.includes('const generateKuitansi = (data: any) => {'));
const endIdx = lines.findIndex(line => line.includes('const handlePrint = (e: React.FormEvent) => {'));

if (startIdx !== -1 && endIdx !== -1) {
    let extractedLines = lines.slice(startIdx, endIdx);
    
    // Add "export " to each "const generate..."
    extractedLines = extractedLines.map(line => {
        if (line.startsWith('  const generate')) {
            return line.replace('  const generate', 'export const generate');
        }
        return line;
    });

    const header = `import jsPDF from 'jspdf';\nimport autoTable from 'jspdf-autotable';\n\n`;
    fs.writeFileSync(destPath, header + extractedLines.join('\n'));

    const exportedFuncs = extractedLines
        .filter(line => line.startsWith('export const generate'))
        .map(line => line.match(/generate\w+/)[0])
        .join(', ');

    const newContentLines = [
        ...lines.slice(0, startIdx),
        `  // Extracted PDF Generators to lib/pdfGenerators.ts`,
        ...lines.slice(endIdx)
    ];

    let newContent = newContentLines.join('\n');
    
    // Add import statement at the top of EvidenceTemplates.tsx
    const importStatement = `import { ${exportedFuncs} } from '../lib/pdfGenerators';\n`;
    newContent = newContent.replace("import autoTable from 'jspdf-autotable';", `import autoTable from 'jspdf-autotable';\n${importStatement}`);
    
    fs.writeFileSync(srcPath, newContent);
    console.log('Successfully extracted PDF generators.');
} else {
    console.log('Could not find start/end indices.', { startIdx, endIdx });
}
