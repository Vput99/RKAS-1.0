
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
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
};

export const parseRaporData = (textOrGrid: string | any[][], indicators: RaporIndicator[]): Partial<RaporIndicator>[] => {
    const results: Partial<RaporIndicator>[] = [];
    
    if (typeof textOrGrid === 'string') {
        const textLower = textOrGrid.toLowerCase();
        indicators.forEach(ind => {
            if (textLower.includes(ind.label.toLowerCase())) {
                // In a real scenario, we'd use regex to find the number near the label
                // For now, mirroring the Python logic of just finding the label
                results.push({ id: ind.id, score: 0 }); // Score 0 as fallback or extracted
            }
        });
    } else {
        const grid = textOrGrid;
        const targetLabels = indicators.map(ind => ind.label.toLowerCase());
        
        grid.forEach(row => {
            row.forEach((cell, cellIdx) => {
                if (typeof cell === 'string') {
                    const cellLower = cell.toLowerCase();
                    targetLabels.forEach((label, labelIdx) => {
                        if (cellLower.includes(label)) {
                            for (let i = cellIdx + 1; i < row.length; i++) {
                                const score = parseFloat(row[i]);
                                if (!isNaN(score)) {
                                    results.push({
                                        id: indicators[labelIdx].id,
                                        score: score
                                    });
                                    break;
                                }
                            }
                        }
                    });
                }
            });
        });
    }
    
    return results;
};
