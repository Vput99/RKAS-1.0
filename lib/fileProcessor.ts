
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
    try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'buffer' });
        
        let allRows: any[][] = [];
        
        const sortedSheetNames = [...workbook.SheetNames].sort((a, b) => {
            const aLow = a.toLowerCase();
            const bLow = b.toLowerCase();
            const isA = aLow.includes('rapor') || aLow.includes('pbd') || aLow.includes('data') || aLow.includes('dashboard');
            const isB = bLow.includes('rapor') || bLow.includes('pbd') || bLow.includes('data') || bLow.includes('dashboard');
            if (isA && !isB) return -1;
            if (!isA && isB) return 1;
            return 0;
        });

        console.log("Processing sheets:", sortedSheetNames);

        sortedSheetNames.forEach(name => {
            const worksheet = workbook.Sheets[name];
            const grid = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
            console.log(`Sheet ${name}: ${grid.length} rows`);
            if (grid && grid.length > 0) {
                allRows = allRows.concat(grid);
            }
        });
        
        console.log("Total rows extracted:", allRows.length);
        return allRows;
    } catch (error) {
        console.error("extractDataFromExcel error:", error);
        throw error;
    }
};

export const parseRaporData = (textOrGrid: string | any[][], indicators: RaporIndicator[]): Partial<RaporIndicator>[] => {
    const resultsMap = new Map<string, number>();
    
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
        
        for (let rowIdx = 0; rowIdx < grid.length; rowIdx++) {
            const row = grid[rowIdx];
            if (!Array.isArray(row)) continue;
            
            let matchedIndicator: string | null = null;
            let matchedCellIdx = -1;
            
            for (let cellIdx = 0; cellIdx < row.length; cellIdx++) {
                const cell = row[cellIdx];
                if (cell === null || cell === undefined) continue;
                
                const cellStr = String(cell).toLowerCase().trim();
                if (cellStr.length < 2) continue;
                
                for (const ind of indicators) {
                    const id = ind.id.toLowerCase();
                    const label = ind.label.toLowerCase();
                    const keywords = keywordMap[ind.id] || [];
                    
                    const isIdMatch = cellStr === id || cellStr.startsWith(id + '.') || cellStr.startsWith(id + ' ');
                    const isLabelMatch = cellStr.includes(label) || keywords.some(k => cellStr.includes(k));
                    
                    if (isIdMatch || isLabelMatch) {
                        matchedIndicator = ind.id;
                        matchedCellIdx = cellIdx;
                        break;
                    }
                }
                
                if (matchedIndicator) break;
            }
            
            if (matchedIndicator && matchedCellIdx >= 0) {
                for (let i = matchedCellIdx + 1; i < row.length; i++) {
                    const val = row[i];
                    if (val === null || val === undefined || val === '') continue;
                    
                    const valStr = String(val).trim();
                    const cleanVal = valStr.replace('%', '').replace(/\s/g, '').replace(',', '.');
                    const score = parseFloat(cleanVal);
                    
                    if (!isNaN(score) && score >= 0 && score <= 100) {
                        resultsMap.set(matchedIndicator, score);
                        console.log(`Found: ${matchedIndicator} = ${score} at row ${rowIdx}`);
                        break;
                    }
                }
            }
        }
    }
    
    console.log("Parsed results:", Array.from(resultsMap.entries()));
    return Array.from(resultsMap.entries()).map(([id, score]) => ({ id, score }));
};
