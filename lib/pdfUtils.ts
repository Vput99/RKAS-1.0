import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SchoolProfile } from '../types';

/**
 * Format number to IDR currency string
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Generate standard Kop Surat (School Header)
 */
export const generatePDFHeader = (doc: jsPDF, profile: SchoolProfile | null, title: string) => {
  const pageWidth = doc.internal.pageSize.width;
  
  // School Logo Placeholder or from profile
  if (profile?.headerImage) {
    try {
      // Assuming headerImage is base64 string
      doc.addImage(profile.headerImage, 'PNG', 15, 10, 25, 25);
    } catch (e) {
      console.warn("Logo failed to load in PDF:", e);
    }
  }

  // School Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  const schoolName = (profile?.name || 'SD NEGERI CONTOH').toUpperCase();
  doc.text(schoolName, pageWidth / 2 + (profile?.headerImage ? 12 : 0), 18, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const details = [
    `NPSN: ${profile?.npsn || '12345678'} | Tahun Anggaran: ${profile?.fiscalYear || '2026'}`,
    `${profile?.address || 'Jl. Pendidikan No. 1'}, ${profile?.district || 'Kecamatan'}, ${profile?.city || 'Kabupaten'}`,
    `Email: sekolah@diknas.go.id | Kode Pos: ${profile?.postalCode || '-'}`
  ];
  
  details.forEach((line, index) => {
    doc.text(line, pageWidth / 2 + (profile?.headerImage ? 12 : 0), 24 + (index * 4.5), { align: 'center' });
  });

  // Top Horizontal Lines (Double)
  doc.setLineWidth(0.8);
  doc.line(15, 38, pageWidth - 15, 38);
  doc.setLineWidth(0.2);
  doc.line(15, 39, pageWidth - 15, 39);

  // Report Title (Centered and Spaced)
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, 48, { align: 'center' });
  
  return 55; // Next Y position (under the header)
};

/**
 * Generate standard Signature blocks at the end of the report
 */
export const generateSignatures = (doc: jsPDF, profile: SchoolProfile | null, startY: number) => {
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  const signatureWidth = 60;
  const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Ensure we don't start at the very bottom
  let y = startY;
  const pageHeight = doc.internal.pageSize.height;
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const city = profile?.city || 'Kabupaten';
  doc.text(`${city}, ${date}`, pageWidth - margin - signatureWidth, y + 10);
  
  // Signatories
  const signY = y + 20;
  
  // Left: Principal
  doc.text('Mengetahui,', margin + 10, signY);
  doc.text('Kepala Sekolah', margin + 10, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.headmaster || '..........................................', margin + 10, signY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile?.headmasterNip || '..........................................'}`, margin + 10, signY + 30);
  
  // Right: Treasurer
  doc.text('Disetujui Oleh,', pageWidth - margin - signatureWidth, signY);
  doc.text('Bendahara Sekolah', pageWidth - margin - signatureWidth, signY + 5);
  doc.setFont('helvetica', 'bold');
  doc.text(profile?.treasurer || '..........................................', pageWidth - margin - signatureWidth, signY + 25);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${profile?.treasurerNip || '..........................................'}`, pageWidth - margin - signatureWidth, signY + 30);
  
  return signY + 40;
};

/**
 * Default Table Styling Options for autoTable
 */
export const defaultTableStyles = {
  theme: 'striped' as const,
  headStyles: { 
    fillColor: [41, 128, 185] as [number, number, number], 
    textColor: 255, 
    fontSize: 10, 
    fontStyle: 'bold' as const, 
    halign: 'center' as const 
  },
  bodyStyles: { fontSize: 9 },
  alternateRowStyles: { 
    fillColor: [245, 245, 245] as [number, number, number] 
  },
  margin: { top: 55, left: 15, right: 15, bottom: 25 },
};

export default {
  formatCurrency,
  generatePDFHeader,
  generateSignatures,
  defaultTableStyles
};
