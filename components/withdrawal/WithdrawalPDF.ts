import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MONTHS } from './WithdrawalTypes';
import { formatRupiah, getTerbilang, getCityName } from './WithdrawalUtils';

export const generateHeader = (doc: jsPDF, profile: any) => {
    if (profile?.headerImage) try { doc.addImage(profile.headerImage, 'PNG', 15, 10, 25, 25); } catch { }
    doc.setFont('times', 'normal'); doc.setFontSize(12);
    doc.text(`PEMERINTAH ${profile?.city || 'KAB/KOTA'}`, 105, 15, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, 20, { align: 'center' });
    doc.setFont('times', 'bold'); doc.setFontSize(14);
    doc.text((profile?.name || 'NAMA SEKOLAH').toUpperCase(), 105, 26, { align: 'center' });
    doc.setFont('times', 'normal'); doc.setFontSize(10);
    doc.text(profile?.address || '', 105, 32, { align: 'center' });
    doc.text(`${profile?.district ? 'Kecamatan ' + profile.district : ''} ${getCityName(profile, true)} ${profile?.postalCode ? 'Kode Pos : ' + profile.postalCode : ''}`.trim(), 105, 36, { align: 'center' });
    doc.text(`NPSN : ${profile?.npsn || '-'}`, 105, 40, { align: 'center' });
    doc.setLineWidth(0.5); doc.line(15, 43, 195, 43);
    doc.setLineWidth(0.2); doc.line(15, 44, 195, 44);
};

export const createSuratKuasaDoc = (params: {
    profile: any;
    suratNo: string;
    ksName: string;
    ksTitle: string;
    ksNip: string;
    ksAddress: string;
    trName: string;
    trTitle: string;
    trNip: string;
    trAddress: string;
    withdrawDate: string;
    totalAmount: number;
    recipientCount: number;
}) => {
    const doc = new jsPDF();
    generateHeader(doc, params.profile);
    
    doc.setFont('times', 'bold'); doc.setFontSize(12); doc.text('SURAT KUASA', 105, 55, { align: 'center' });
    doc.setLineWidth(0.5); doc.line(85, 56, 125, 56);
    doc.setFont('times', 'normal'); doc.text(`NOMOR : ${params.suratNo}`, 105, 62, { align: 'center' });

    const branchDisplay = params.profile?.bankBranch?.toUpperCase().includes('CABANG') ? params.profile.bankBranch : `CABANG ${params.profile?.bankBranch}`;
    let startY = 70; doc.text("Yang bertanda tangan dibawah ini :", 20, startY); startY += 8;
    doc.text(`1. Nama      : ${params.ksName}`, 20, startY); doc.text(`   Jabatan   : ${params.ksTitle} ${params.profile?.name || ''}`, 20, startY + 6); doc.text(`   Alamat    : ${params.ksAddress}`, 20, startY + 12);
    startY += 24;
    doc.text(`2. Nama      : ${params.trName}`, 20, startY); doc.text(`   Jabatan   : ${params.trTitle}`, 20, startY + 6); doc.text(`   Alamat    : ${params.trAddress}`, 20, startY + 12);

    startY += 24;
    const textKuasa = `Bertindak untuk dan atas nama ${params.profile?.name || 'Sekolah'} ${getCityName(params.profile, true)}. Dengan ini memberikan kuasa penuh yang tidak dapat di cabut kembali dengan substitusi kepada :`;
    doc.text(doc.splitTextToSize(textKuasa, 170), 20, startY);

    startY += 15; doc.setFont('times', 'bold'); doc.text(`${params.profile?.bankName || 'BANK'} ${branchDisplay}`, 105, startY, { align: 'center' });
    doc.setFont('times', 'normal'); doc.text(`Berkedudukan di ${params.profile?.bankAddress || 'ALAMAT BANK'}`, 105, startY + 5, { align: 'center' });

    startY += 15; doc.setFont('times', 'bold'); doc.text("KHUSUS", 105, startY, { align: 'center' }); doc.setLineWidth(0.5); doc.line(90, startY + 1, 120, startY + 1);

    startY += 8; doc.setFont('times', 'normal');
    const mainContent = `Untuk memindahbukuan dari rekening Giro/ Tabungan kami yang ada di ${params.profile?.bankName} ${branchDisplay} dengan nomor rekening ${params.profile?.accountNo} atas nama ${params.profile?.name} untuk dilimpahkan kepada rekening terlampir yang tidak terpisahkan dari surat kuasa ini sebanyak ${params.recipientCount} ( ${getTerbilang(params.recipientCount)} ) rekening dengan total nominal Rp ${formatRupiah(params.totalAmount).replace('Rp', '').trim()}- ( ${getTerbilang(params.totalAmount)} Rupiah), Dengan data sesuai Lampiran.`;
    doc.text(doc.splitTextToSize(mainContent, 170), 20, startY);

    startY += 25;
    const closingText = `Demikian surat kuasa ini dibuat untuk dipergunakan sebagaimana mestinya. Segala akibat yang timbul atas pemberian kuasa ini menajdi tanggung jawab pemberi kuasa sepenuhnya dengan membebaskan bank dari segala akibat tuntutan.`;
    doc.text(doc.splitTextToSize(closingText, 170), 20, startY);

    startY += 20; const d = new Date(params.withdrawDate); doc.text(`${getCityName(params.profile)}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, 150, startY, { align: 'center' });
    startY += 6; doc.text("Yang diberi Kuasa", 35, startY, { align: 'center' }); doc.text(params.ksTitle, 85, startY, { align: 'center' }); doc.text(params.trTitle, 150, startY, { align: 'center' });
    startY += 5; doc.text(params.profile?.bankName || '', 35, startY, { align: 'center' }); doc.text(params.profile?.name || 'Sekolah', 85, startY, { align: 'center' });
    startY += 5; doc.text(branchDisplay, 35, startY, { align: 'center' });

    startY += 30; doc.setFont('times', 'bold'); doc.text(params.ksName, 85, startY, { align: 'center' }); doc.text(params.trName, 150, startY, { align: 'center' });
    doc.setLineWidth(0.2); doc.line(65, startY + 1, 105, startY + 1); doc.line(130, startY + 1, 170, startY + 1);
    doc.setFont('times', 'normal'); doc.text(`NIP. ${params.ksNip}`, 85, startY + 5, { align: 'center' }); doc.text(`NIP. ${params.trNip}`, 150, startY + 5, { align: 'center' });
    
    return doc;
};

export const createPemindahbukuanDoc = (params: {
    profile: any;
    suratNo: string;
    ksName: string;
    ksTitle: string;
    ksNip: string;
    trName: string;
    trNip: string;
    withdrawDate: string;
}) => {
    const doc = new jsPDF();
    generateHeader(doc, params.profile);
    const branchDisplay = params.profile?.bankBranch?.toUpperCase().includes('CABANG') ? params.profile.bankBranch : `CABANG ${params.profile?.bankBranch}`;
    const bankShort = (params.profile?.bankName || '').replace('PT. ', '').replace('BANK PEMBANGUNAN DAERAH JAWA TIMUR', 'BANK JATIM');

    doc.setFont('times', 'normal'); doc.setFontSize(12); doc.text(`NOMOR : ${params.suratNo}`, 105, 55, { align: 'center' });
    doc.text('Kepada Yth : Bapak Direktur', 20, 65); doc.text(`${bankShort} ${branchDisplay}`, 20, 70);
    doc.text('DI', 20, 75); doc.text(getCityName(params.profile).toUpperCase(), 20, 80);

    doc.text('Perihal : ', 20, 90); doc.text("Kuasa Pemindahbukuan", 37, 90); doc.setLineWidth(0.3); doc.line(37, 91, 75, 91);
    const body1 = `Sehubungan dengan adanya rekening kami di ${bankShort} ${branchDisplay} atas nama ${params.profile?.name} nomor rekening ${params.profile?.accountNo} bersama ini kami mengajukan kuasa pemindahbukuan. (Terlampir)`;
    doc.text(doc.splitTextToSize(body1, 170), 20, 100);
    const body2 = `Kami harap dengan adanya kuasa tersebut dapat dilakukan pemindahbukuan secara otomatis dari rekening Giro kami yang ada di ${bankShort} ${branchDisplay}`;
    doc.text(doc.splitTextToSize(body2, 170), 20, 115);
    doc.text('Demikian atas kerja sama yang baik sampaikan terima kasih.', 20, 130);

    const d = new Date(params.withdrawDate); doc.text(`${getCityName(params.profile)}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`, 140, 140);

    doc.setFont('times', 'bold'); doc.text(params.profile?.name || 'SEKOLAH', 105, 146, { align: 'center' });
    doc.setFont('times', 'normal'); doc.text(params.ksTitle, 60, 152, { align: 'center' }); doc.text('Bendahara', 150, 152, { align: 'center' });

    doc.setFont('times', 'bold'); doc.text(params.ksName, 60, 182, { align: 'center' }); doc.text(params.trName, 150, 182, { align: 'center' });
    doc.line(40, 183, 80, 183); doc.line(130, 183, 170, 183);
    doc.setFont('times', 'normal'); doc.text(`NIP. ${params.ksNip}`, 60, 187, { align: 'center' }); doc.text(`NIP. ${params.trNip}`, 150, 187, { align: 'center' });
    
    return doc;
};

export const createRincianDoc = (params: {
    profile: any;
    startMonth: number;
    endMonth: number;
    groupedData: any[];
    totalAmount: number;
    ksName: string;
    ksNip: string;
    trName: string;
    trNip: string;
}) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('DAFTAR RINCIAN TRANSFER', 148, 15, { align: 'center' });
    doc.text(`${(params.profile?.name || 'SEKOLAH').toUpperCase()}`, 148, 20, { align: 'center' }); doc.text((params.profile?.city || 'KOTA').toUpperCase(), 148, 25, { align: 'center' });
    const monthLabel = params.startMonth === params.endMonth ? `Bulan ${MONTHS[params.startMonth - 1]}` : `Bulan ${MONTHS[params.startMonth - 1]} - ${MONTHS[params.endMonth - 1]}`;
    doc.setFont('helvetica', 'italic'); doc.setFontSize(10); doc.text(`${monthLabel} (Realisasi)`, 15, 35);

    let tp1 = 0, tp2 = 0, tp3 = 0, tpd = 0, tpAll = 0, tbAll = 0;
    const tableBody = params.groupedData.map((item, idx) => {
        let mDesc = item.descriptions.join(', '); if (mDesc.length > 50) mDesc = `${item.descriptions[0]} dan ${item.descriptions.length - 1} item lain`;
        const tTax = item.taxes.ppn + item.taxes.pph21 + item.taxes.pph22 + item.taxes.pph23 + item.taxes.pajakDaerah; const net = item.amount - tTax;
        tp1 += item.taxes.pph21; tp2 += item.taxes.pph22; tp3 += item.taxes.pph23; tpd += item.taxes.pajakDaerah; tpAll += tTax; tbAll += net;
        return [idx + 1, item.name, item.account, formatRupiah(item.amount), formatRupiah(item.taxes.ppn), formatRupiah(item.taxes.pph21), formatRupiah(item.taxes.pph22), formatRupiah(item.taxes.pph23), formatRupiah(item.taxes.pajakDaerah), formatRupiah(tTax), formatRupiah(net), mDesc];
    });
    tableBody.push(['', 'JUMLAH', '', formatRupiah(params.totalAmount), '', formatRupiah(tp1), formatRupiah(tp2), formatRupiah(tp3), formatRupiah(tpd), formatRupiah(tpAll), formatRupiah(tbAll), '']);

    autoTable(doc, {
        startY: 40, theme: 'grid', styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 }, headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0] },
        head: [
            [{ content: 'No.', rowSpan: 2 }, { content: 'Nama', rowSpan: 2 }, { content: 'Nomor Rekening', rowSpan: 2 }, { content: 'Nominal', rowSpan: 2 }, { content: 'Potongan Pajak', colSpan: 5, styles: { fillColor: [255, 255, 0] } }, { content: 'Jml Potongan', rowSpan: 2, styles: { fillColor: [255, 255, 0] } }, { content: 'Jumlah Bersih', rowSpan: 2, styles: { fillColor: [200, 200, 255] } }, { content: 'Keterangan', rowSpan: 2 }],
            [{ content: 'PPN', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 21', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 22', styles: { fillColor: [255, 255, 0] } }, { content: 'PPh 23', styles: { fillColor: [255, 255, 0] } }, { content: 'Daerah', styles: { fillColor: [255, 255, 0] } }]
        ],
        body: tableBody,
        columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 35 }, 2: { cellWidth: 20 }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 15, halign: 'right' }, 5: { cellWidth: 15, halign: 'right' }, 6: { cellWidth: 15, halign: 'right' }, 7: { cellWidth: 15, halign: 'right' }, 8: { cellWidth: 15, halign: 'right' }, 9: { cellWidth: 20, halign: 'right' }, 10: { cellWidth: 22, halign: 'right', fillColor: [200, 200, 255] }, 11: { cellWidth: 'auto' } }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text(params.profile?.name || 'SEKOLAH', 148, finalY, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text('Kuasa Pengguna Anggaran', 40, finalY + 5, { align: 'center' }); doc.text('Diterima Pihak Bank', 148, finalY + 5, { align: 'center' }); doc.text('Bendahara BOP', 240, finalY + 5, { align: 'center' });
    doc.text('( .................... )', 148, finalY + 30, { align: 'center' });
    doc.setFont('helvetica', 'bold'); doc.text(params.ksName, 40, finalY + 30, { align: 'center' }); doc.text(params.trName, 240, finalY + 30, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text(`NIP. ${params.ksNip}`, 40, finalY + 35, { align: 'center' }); doc.text(`NIP. ${params.trNip}`, 240, finalY + 35, { align: 'center' });
    
    return doc;
};
