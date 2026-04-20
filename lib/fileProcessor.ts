
import * as pdfjs from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { RaporIndicator } from '../types';

// PDF Worker URL - usually from CDN for browser environments
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export const extractTextFromPDF = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n';
    }
    
    return fullText;
};

export const extractDataFromExcel = async (file: File): Promise<any[][]> => {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    
    let allRows: any[][] = [];
    
    // Prioritize sheets that likely contain the actual report data
    const sortedSheetNames = [...workbook.SheetNames].sort((a, b) => {
        const aLow = a.toLowerCase();
        const bLow = b.toLowerCase();
        const isA = aLow.includes('rapor') || aLow.includes('pbd') || aLow.includes('data') || aLow.includes('dashboard');
        const isB = bLow.includes('rapor') || bLow.includes('pbd') || bLow.includes('data') || bLow.includes('dashboard');
        if (isA && !isB) return -1;
        if (!isA && isB) return 1;
        return 0;
    });

    sortedSheetNames.forEach(name => {
        const worksheet = workbook.Sheets[name];
        const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        if (grid && grid.length > 0) {
            allRows = allRows.concat(grid);
        }
    });
    
    return allRows;
};

export const parseRaporData = (textOrGrid: string | any[][], indicators: RaporIndicator[]): Partial<RaporIndicator>[] => {
    const resultsMap = new Map<string, number>();
    
    // Keywords to help match indicators when the full label isn't present
    const keywordMap: Record<string, string[]> = {
        'A.1': ['literasi'],
        'A.2': ['numerasi'],
        'A.3': ['karakter'],
        'D.1': ['kualitas pembelajaran', 'pembelajaran'],
        'D.4': ['keamanan'],
        'D.8': ['kebinekaan']
    };

    if (typeof textOrGrid === 'string') {
        const textLower = textOrGrid.toLowerCase();
        indicators.forEach(ind => {
            const id = ind.id.toLowerCase();
            const label = ind.label.toLowerCase();
            const keywords = keywordMap[ind.id] || [];
            
            if (textLower.includes(label) || textLower.includes(id) || keywords.some(k => textLower.includes(k))) {
                resultsMap.set(ind.id, 0); 
            }
        });
    } else {
        const grid = textOrGrid;
        grid.forEach(row => {
            if (!Array.isArray(row)) return;
            
            row.forEach((cell, cellIdx) => {
                if (cell === null || cell === undefined) return;
                const cellStr = String(cell).toLowerCase().trim();
                
                indicators.forEach(ind => {
                    const id = ind.id.toLowerCase();
                    const label = ind.label.toLowerCase();
                    const keywords = keywordMap[ind.id] || [];
                    
                    // Match logic:
                    // 1. Exact ID or ID starting the cell (A.1, A.1. etc)
                    const isIdMatch = cellStr === id || cellStr.startsWith(id + '.') || cellStr.startsWith(id + ' ');
                    
                    // 2. Full label is contained in cell or cell contains a primary keyword
                    const isLabelMatch = cellStr.includes(label) || (cellStr.length > 3 && keywords.some(k => cellStr.includes(k)));

                    if (isIdMatch || isLabelMatch) {
                        // We found an indicator row! Now look for the score.
                        for (let i = 0; i < row.length; i++) {
                            // Skip the cell that matched the label/ID itself
                            if (i === cellIdx) continue;
                            
                            const val = row[i];
                            if (val === null || val === undefined || val === '') continue;

                            // Clean the value: remove percentages, spaces, and handle comma-as-decimal
                            const cleanVal = String(val).replace('%', '').replace(/\s/g, '').replace(',', '.');
                            const score = parseFloat(cleanVal);
                            
                            if (!isNaN(score) && score !== 0) {
                                // Rule: If the number is in the first column (i=0) and it's an integer < 1000, 
                                // it's likely a row number or "No.", not the score. Skip it.
                                if (i === 0 && Number.isInteger(score) && score < 1000) continue;
                                
                                // Rapor Pendidikan scores are usually 0-100 or 1-4.
                                // We'll take the first plausible number we find that isn't a row number.
                                const current = resultsMap.get(ind.id) || 0;
                                
                                // If the score found is 0-100, it's almost certainly the percentage score we want
                                if (score > current || current === 0) {
                                    resultsMap.set(ind.id, score);
                                }
                            }
                        }
                    }
                });
            });
        });
    }
    
    return Array.from(resultsMap.entries()).map(([id, score]) => ({ id, score }));
};
