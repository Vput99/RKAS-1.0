
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
    
    if (typeof textOrGrid === 'string') {
        const textLower = textOrGrid.toLowerCase();
        indicators.forEach(ind => {
            const id = ind.id.toLowerCase();
            const label = ind.label.toLowerCase();
            if (textLower.includes(label) || textLower.includes(id)) {
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
                    
                    const isIdMatch = cellStr === id || cellStr.startsWith(id + '.') || cellStr.startsWith(id + ' ');
                    const isLabelMatch = cellStr.includes(label);

                    if (isIdMatch || isLabelMatch) {
                        for (let i = 0; i < row.length; i++) {
                            if (i === cellIdx) continue;
                            const val = row[i];
                            if (val === null || val === undefined || val === '') continue;
                            const score = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                            
                            if (!isNaN(score) && score !== 0) {
                                const current = resultsMap.get(ind.id) || 0;
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
