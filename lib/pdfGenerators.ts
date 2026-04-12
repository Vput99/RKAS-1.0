import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getTerbilang } from './evidenceRules';

export const generateKuitansi = (data: any) => {
    const doc = new jsPDF('l', 'mm', 'a5');
    
    doc.setLineWidth(1);
    doc.rect(10, 10, 190, 128);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('KUITANSI PEMBAYARAN', 105, 25, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Tahun Anggaran : ${data.year}`, 150, 35);
    doc.text('No. Bukti : .....................', 150, 40);
    doc.text('Mata Anggaran : .....................', 150, 45);

    const startY = 55;
    const gap = 10;
    
    doc.text('Sudah Terima Dari', 20, startY);
    doc.text(':', 60, startY);
    doc.text(`Bendahara BOS ${data.schoolName}`, 65, startY);
    
    doc.text('Uang Sejumlah', 20, startY + gap);
    doc.text(':', 60, startY + gap);
    doc.setFont('helvetica', 'bolditalic');
    const nominal = data.amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(data.amount)) : 'Rp ..................................................';
    doc.text(nominal, 65, startY + gap);
    
    doc.setFont('helvetica', 'normal');
    doc.text('Untuk Pembayaran', 20, startY + (gap*2));
    doc.text(':', 60, startY + (gap*2));
    
    const splitDesc = doc.splitTextToSize(data.description || '..........................................................................................', 120);
    doc.text(splitDesc, 65, startY + (gap*2));

    const terbilangY = startY + (gap*2) + (splitDesc.length * 5) + 5;
    doc.text('Terbilang', 20, terbilangY);
    doc.text(':', 60, terbilangY);
    doc.setFont('helvetica', 'bold');
    doc.text(`# ${data.terbilang || '...................................................................................'} #`, 65, terbilangY);

    const signY = 110;
    doc.setFont('helvetica', 'normal');
    doc.text('Setuju Dibayar,', 30, signY, { align: 'center' });
    doc.text('Kepala Sekolah', 30, signY + 5, { align: 'center' });
    doc.text('Lunas Dibayar,', 105, signY, { align: 'center' });
    doc.text('Bendahara', 105, signY + 5, { align: 'center' });

    doc.text(`${data.city}, ${data.date}`, 170, signY - 5, { align: 'center' });
    doc.text('Yang Menerima,', 170, signY, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.text(data.ksName || '( ........................... )', 30, signY + 25, { align: 'center' });
    doc.text(data.trName || '( ........................... )', 105, signY + 25, { align: 'center' });
    doc.text(data.receiver || '( ........................... )', 170, signY + 25, { align: 'center' });

    doc.save(`Kuitansi_${data.description ? data.description.substring(0,10) : 'Kosong'}.pdf`);
};

export const generateDaftarHadir = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR HADIR KEGIATAN', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(data.activityName || '........................................', 105, margin + 6, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Hari/Tanggal : ${data.date}`, margin, margin + 20);
    doc.text(`Tempat       : ${data.projectLocation || data.schoolName}`, margin, margin + 26);
    
    // Use officials list if populated, otherwise create empty rows
    const participants = (data.officials && data.officials.length > 0 && data.officials[0].name !== '') 
        ? data.officials 
        : Array(15).fill({ name: '', role: '' });

    const body = participants.map((p: any, i: number) => [
        i + 1, p.name, p.role, '', ''
    ]);

    autoTable(doc, {
        startY: margin + 35,
        head: [['No', 'Nama Lengkap', 'Jabatan / Unsur', 'Tanda Tangan', 'Ket']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 11, cellPadding: 3, lineWidth: 0.1, lineColor: 0 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 60 },
            2: { cellWidth: 40 },
            3: { cellWidth: 40 },
            4: { cellWidth: 20 }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.text(`${data.city}, ${data.date}`, 140, finalY);
    doc.text('Mengetahui,', 140, finalY + 6);
    doc.text('Kepala Sekolah', 140, finalY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 140, finalY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 140, finalY + 40);

    doc.save('Daftar_Hadir.pdf');
};

export const generateSK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 5, { align: 'center' });
    doc.setFontSize(14);
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 18, 190, margin + 18);

    const titleY = margin + 30;
    doc.setFontSize(12);
    doc.text('KEPUTUSAN KEPALA SEKOLAH', 105, titleY, { align: 'center' });
    doc.text(`NOMOR : ${data.skNumber}`, 105, titleY + 6, { align: 'center' });
    doc.text('TENTANG', 105, titleY + 14, { align: 'center' });
    const titleText = (data.description || 'PENETAPAN ...').toUpperCase();
    const splitTitle = doc.splitTextToSize(titleText, 150);
    doc.text(splitTitle, 105, titleY + 20, { align: 'center' });

    let currentY = titleY + 20 + (splitTitle.length * 6) + 10;
    doc.setFont('times', 'normal');
    
    // Menimbang
    doc.text('Menimbang', margin, currentY);
    doc.text(':', margin + 30, currentY);
    const considerations = data.skConsiderations || 'a. Bahwa...';
    const splitCons = doc.splitTextToSize(considerations, 130);
    doc.text(splitCons, margin + 35, currentY);
    currentY += (splitCons.length * 6) + 6;

    // Mengingat
    doc.text('Mengingat', margin, currentY);
    doc.text(':', margin + 30, currentY);
    const remembering = "1. Undang-Undang Nomor 20 Tahun 2003;\n2. Permendikbud tentang Juknis BOSP;\n3. RKAS Tahun " + data.year;
    const splitRem = doc.splitTextToSize(remembering, 130);
    doc.text(splitRem, margin + 35, currentY);
    currentY += (splitRem.length * 6) + 10;

    // Memutuskan
    doc.setFont('times', 'bold');
    doc.text('MEMUTUSKAN', 105, currentY, { align: 'center' });
    currentY += 10;
    
    doc.setFont('times', 'normal');
    doc.text('Menetapkan', margin, currentY);
    doc.text(':', margin + 30, currentY);
    doc.text('PERTAMA', margin + 35, currentY);
    doc.text(`: Menetapkan nama-nama yang tercantum dalam lampiran keputusan ini.`, margin + 60, currentY, { maxWidth: 100, align: 'justify' });
    
    currentY += 10; 
    doc.text('KEDUA', margin + 35, currentY);
    doc.text(`: Biaya dibebankan pada Anggaran BOSP Tahun ${data.year}.`, margin + 60, currentY, { maxWidth: 100, align: 'justify' });

    currentY += 10;
    doc.text('KETIGA', margin + 35, currentY);
    doc.text(`: Keputusan ini berlaku sejak tanggal ditetapkan.`, margin + 60, currentY);

    const signY = currentY + 20;
    doc.text(`Ditetapkan di : ${data.city}`, 130, signY);
    doc.text(`Pada Tanggal  : ${data.date}`, 130, signY + 6);
    doc.text('Kepala Sekolah,', 130, signY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 130, signY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 130, signY + 40);

    // Lampiran
    doc.addPage();
    doc.setFont('times', 'bold');
    doc.text('LAMPIRAN KEPUTUSAN KEPALA SEKOLAH', margin, margin);
    doc.text(`Nomor : ${data.skNumber}`, margin, margin + 6);
    
    const body = (data.skAppointees || []).map((p: any, i: number) => [i+1, p.name, p.role, '']);
    
    autoTable(doc, {
        startY: margin + 20,
        head: [['No', 'Nama', 'Jabatan / Tugas', 'Keterangan']],
        body: body,
        theme: 'grid',
        styles: { font: 'times' }
    });

    doc.save('SK_Penetapan.pdf');
};

export const generateSPK = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('SURAT PERINTAH KERJA (SPK)', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`NOMOR : ${data.spkNumber}`, 105, margin + 6, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    let y = margin + 20;
    doc.text('Yang bertanda tangan di bawah ini:', margin, y);
    y += 8;
    doc.text('1. Nama', margin, y); doc.text(`: ${data.ksName}`, margin + 40, y);
    y += 6;
    doc.text('   Jabatan', margin, y); doc.text(`: Kepala Sekolah`, margin + 40, y);
    y += 6;
    doc.text('   Selanjutnya disebut PIHAK PERTAMA.', margin, y);

    y += 10;
    doc.text('2. Nama', margin, y); doc.text(`: ${data.contractorName}`, margin + 40, y);
    y += 6;
    doc.text('   Pekerjaan', margin, y); doc.text(`: ${data.contractorRole}`, margin + 40, y);
    y += 6;
    doc.text('   Selanjutnya disebut PIHAK KEDUA.', margin, y);

    y += 10;
    const content = `PIHAK PERTAMA memerintahkan PIHAK KEDUA untuk melaksanakan pekerjaan: ${data.description || '.........................'} di ${data.projectLocation}.`;
    const splitContent = doc.splitTextToSize(content, 170);
    doc.text(splitContent, margin, y);
    y += (splitContent.length * 6) + 4;

    doc.text(`Nilai Pekerjaan : ${data.amount ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(data.amount)) : 'Rp ....................'}`, margin, y);
    
    y += 20;
    doc.text('PIHAK KEDUA', margin + 20, y, { align: 'center' });
    doc.text('PIHAK PERTAMA', 150, y, { align: 'center' });
    
    y += 25;
    doc.setFont('times', 'bold');
    doc.text(`( ${data.contractorName} )`, margin + 20, y, { align: 'center' });
    doc.text(`( ${data.ksName} )`, 150, y, { align: 'center' });

    doc.save('SPK.pdf');
};

export const generateMOU = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('PERJANJIAN KERJASAMA', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`NOMOR : ${data.mouNumber}`, 105, margin + 6, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    
    let y = margin + 20;
    doc.text('Antara:', margin, y);
    y += 8;
    doc.text(`1. ${data.ksName} (Kepala Sekolah) sebagai PIHAK PERTAMA.`, margin, y);
    y += 8;
    doc.text(`2. ${data.contractorName} (${data.contractorRole}) sebagai PIHAK KEDUA.`, margin, y);

    y += 10;
    const content = `Kedua belah pihak sepakat bekerjasama dalam: ${data.description || '.........................'}.`;
    doc.text(doc.splitTextToSize(content, 170), margin, y);
    
    y += 30;
    doc.text('PIHAK KEDUA', margin + 20, y, { align: 'center' });
    doc.text('PIHAK PERTAMA', 150, y, { align: 'center' });
    
    y += 25;
    doc.setFont('times', 'bold');
    doc.text(`( ${data.contractorName} )`, margin + 20, y, { align: 'center' });
    doc.text(`( ${data.ksName} )`, 150, y, { align: 'center' });

    doc.save('MOU.pdf');
};

export const generateAbsensiTukang = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR HADIR PEKERJA', 105, margin, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`KEGIATAN: ${data.activityName || '..........................'}`, 105, margin + 6, { align: 'center' });
    
    const body = (data.workers || []).map((w: any, i: number) => [
        i + 1, w.name, w.role, '', '', '', ''
    ]);

    autoTable(doc, {
        startY: margin + 20,
        head: [['No', 'Nama', 'Jabatan', 'H1', 'H2', 'H3', 'Total']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 10, cellPadding: 3, lineWidth: 0.1 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`${data.city}, ${data.date}`, 140, finalY);
    doc.text('Kepala Sekolah', 140, finalY + 6);
    doc.text(`( ${data.ksName} )`, 140, finalY + 30);

    doc.save('Absensi_Tukang.pdf');
};

export const generateUpahTukang = (data: any) => {
    const doc = new jsPDF('l'); // Landscape A4
    
    // Header & Kop Surat
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text('KOP SURAT / SEKOLAH', 148, 15, { align: 'center' });
    doc.text(data.schoolName || 'SD Negeri Tempurejo 1', 148, 22, { align: 'center' });
    
    doc.setFontSize(18);
    doc.text('ROOLSTAAT', 148, 30, { align: 'center' });

    // Informasi Kegiatan
    doc.setFontSize(11);
    doc.setFont('times', 'normal');
    doc.text(`Nama Kegiatan: ${data.activityName || 'Rehab Tempat Parkir dan Kamar Mandi'}`, 15, 42);

    // Dynamic Month Year
    const monthYear = data.monthYear || 'Maret 2026';
    const daysArr = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    // Setup Table Headers
    const head = [
        [
            { content: 'No', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'nama', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Pekerjaan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: `Bulan : ${monthYear}`, colSpan: 31, styles: { halign: 'center', fillColor: [240, 240, 240] } },
            { content: 'Hari\nKerja', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'upah /\nHari', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Upah Total', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'Keterangan', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }
        ],
        [
            ...daysArr.map(day => ({ content: day, styles: { halign: 'center', cellPadding: 1 } }))
        ]
    ];

    let sumTotalUpah = 0;

    // Body
    const body: any[] = (data.workers || []).map((w: any, i: number) => {
        const upahHari = Number(w.dailyWage || w.salary || 100000);
        
        let hariKerja = 0;
        const daysMarks = daysArr.map(day => {
            const mark = (w.attendance && w.attendance[day]) ? 'x' : (w.days && Number(day) <= w.days ? 'x' : '');
            if (mark === 'x') hariKerja++;
            return mark;
        });
        
        if (hariKerja === 0 && w.days) {
            hariKerja = w.days;
            for(let j = 0; j < hariKerja; j++) daysMarks[j] = 'x';
        }

        const upahTotal = hariKerja * upahHari;
        sumTotalUpah += upahTotal;

        return [
            (i + 1).toString(),
            w.name || '............',
            w.role || 'Tukang',
            ...daysMarks,
            hariKerja.toString(),
            new Intl.NumberFormat('id-ID').format(upahHari),
            new Intl.NumberFormat('id-ID').format(upahTotal),
            ''
        ];
    });

    // Subtotal Row
    body.push([
        { content: 'Jumlah Total', colSpan: 36, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: new Intl.NumberFormat('id-ID').format(sumTotalUpah), styles: { halign: 'right', fontStyle: 'bold' } },
        { content: '', styles: { halign: 'center' } } // Keterangan
    ]);

    let terbilangStr = getTerbilang(sumTotalUpah);

    body.push([
        { content: `Terbilang : ${terbilangStr}`, colSpan: 38, styles: { halign: 'left', fontStyle: 'italic', cellPadding: 2 } }
    ]);

    const colStyles: any = {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 18 },
        34: { cellWidth: 9, halign: 'center' },
        35: { cellWidth: 18, halign: 'right' },
        36: { cellWidth: 20, halign: 'right' },
        37: { cellWidth: 12 }
    };
    for(let i = 0; i < 31; i++) colStyles[i + 3] = { cellWidth: 5.2, halign: 'center', cellPadding: 0.5 };

    autoTable(doc, {
        startY: 48,
        margin: { left: 10, right: 10 },
        head: head as any,
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 8, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
        headStyles: { fillColor: [240, 240, 240], textColor: 20, lineWidth: 0.1, lineColor: [0, 0, 0] },
        columnStyles: colStyles
    });

    const finalY = (doc as any).lastAutoTable.finalY + 5;
    
    // Notes text
    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text('- Yang bertanda tangan di bawah ini menerangkan bahwa', 15, finalY + 6);
    doc.text('  upah-upah tersebut telah dibayarkan kepada masing-masing', 15, finalY + 10);
    doc.text('  orang yang berhak menerimanya.', 15, finalY + 14);
    doc.text('- Dibayarkan di hadapan kami', 15, finalY + 20);
    doc.text('Noot : Cap Jempol dibaliknya', 15, finalY + 26);
    
    // Calculate last date of the month string
    let lastDateStr = "31 Maret 2026";
    if (monthYear) {
       const m = monthYear.toLowerCase();
       let lastDay = "31";
       if(m.includes('feb')) lastDay = "28";
       else if(m.includes('apr') || m.includes('jun') || m.includes('sep') || m.includes('nov')) lastDay = "30";
       lastDateStr = `${lastDay} ${monthYear}`;
    }

    const rightAlignBase = 220;
    doc.text(`${data.city || 'Kediri'}, ${lastDateStr}`, rightAlignBase, finalY + 6);
    doc.text('Kepala Sekolah', rightAlignBase, finalY + 11);
    
    doc.setFont('times', 'bold');
    doc.text(data.ksName || 'Nita Ekaningkarti Adji, S.Pd', rightAlignBase, finalY + 26);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip || '19860213 201409 2 002'}`, rightAlignBase, finalY + 30);

    doc.save('Roolstaat_Upah_Tukang.pdf');
};

export const generateSuratTugas = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;
    
    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 22, 190, margin + 22);

    const titleY = margin + 35;
    doc.setFontSize(12);
    doc.text('SURAT TUGAS', 105, titleY, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.text(`NOMOR : ${data.suratTugasNumber}`, 105, titleY + 6, { align: 'center' });

    let currentY = titleY + 20;
    doc.text('Dasar', margin, currentY);
    doc.text(':', margin + 25, currentY);
    const dasar = 'Dokumen Pelaksanaan Anggaran (DPA) / RKAS Sekolah Tahun Anggaran ' + data.year;
    doc.text(dasar, margin + 30, currentY);

    currentY += 15;
    doc.setFont('times', 'bold');
    doc.text('MEMERINTAHKAN :', 105, currentY, { align: 'center' });
    
    currentY += 10;
    doc.setFont('times', 'normal');
    doc.text('Kepada', margin, currentY);
    doc.text(':', margin + 25, currentY);

    // List Officials
    let officialY = currentY;
    data.officials.forEach((off: any, idx: number) => {
        doc.text(`${idx + 1}.`, margin + 30, officialY);
        doc.text(`Nama`, margin + 38, officialY);
        doc.text(`: ${off.name}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`NIP`, margin + 38, officialY);
        doc.text(`: ${off.nip}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`Pangkat/Gol`, margin + 38, officialY);
        doc.text(`: ${off.rank}`, margin + 70, officialY);
        officialY += 6;
        doc.text(`Jabatan`, margin + 38, officialY);
        doc.text(`: ${off.role}`, margin + 70, officialY);
        officialY += 10;
    });

    currentY = officialY;
    doc.text('Untuk', margin, currentY);
    doc.text(':', margin + 25, currentY);
    const desc = `Melaksanakan perjalanan dinas dalam rangka ${data.description || '...........................................'} ke ${data.destination || '...........'} pada tanggal ${data.departureDate} s/d ${data.returnDate}.`;
    const splitDesc = doc.splitTextToSize(desc, 135);
    doc.text(splitDesc, margin + 30, currentY);

    const closingY = currentY + (splitDesc.length * 6) + 10;
    doc.text('Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.', margin, closingY);

    const signY = closingY + 20;
    doc.text(`Ditetapkan di : ${data.city}`, 140, signY);
    doc.text(`Pada Tanggal  : ${data.date}`, 140, signY + 6);
    doc.text('Kepala Sekolah,', 140, signY + 12);
    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 140, signY + 35);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 140, signY + 40);

    doc.save('Surat_Tugas.pdf');
};

export const generateSPPD = (data: any) => {
    // Generate one SPPD page per Official
    const doc = new jsPDF();
    
    data.officials.forEach((official: any, index: number) => {
        if (index > 0) doc.addPage();

        const margin = 20;
        
        // Header SPPD (Small)
        doc.setFont('times', 'bold');
        doc.setFontSize(10);
        doc.text(`PEMERINTAH KABUPATEN/KOTA`, margin, 15);
        doc.text('DINAS PENDIDIKAN', margin, 20);
        doc.text(data.schoolName.toUpperCase(), margin, 25);
        
        doc.setFontSize(9);
        doc.text('Lembar ke : ............', 140, 15);
        doc.text('Kode No   : ............', 140, 20);
        doc.text('Nomor     : ' + data.sppdNumber, 140, 25);

        const titleY = 40;
        doc.setFontSize(12);
        doc.text('SURAT PERINTAH PERJALANAN DINAS', 105, titleY, { align: 'center' });
        doc.text('(SPPD)', 105, titleY + 6, { align: 'center' });

        // Table Content
        const tableBody = [
            ['1.', 'Pejabat berwenang yang memberi perintah', `Kepala ${data.schoolName}`],
            ['2.', 'Nama Pegawai yang diperintah', official.name],
            ['3.', 'a. Pangkat dan Golongan\nb. Jabatan / Instansi\nc. Tingkat Biaya Perjalanan Dinas', `a. ${official.rank}\nb. ${official.role}\nc. C`],
            ['4.', 'Maksud Perjalanan Dinas', data.description || '...........................................'],
            ['5.', 'Alat Angkutan yang dipergunakan', data.transportMode || 'Kendaraan Umum'],
            ['6.', 'a. Tempat Berangkat\nb. Tempat Tujuan', `a. ${data.schoolName}\nb. ${data.destination}`],
            ['7.', 'a. Lamanya Perjalanan Dinas\nb. Tanggal Berangkat\nc. Tanggal Harus Kembali', `a. 1 (Satu) Hari\nb. ${data.departureDate}\nc. ${data.returnDate}`],
            ['8.', 'Pembebanan Anggaran\na. Instansi\nb. Mata Anggaran', `\na. Dinas Pendidikan\nb. BOSP ${data.year}`],
            ['9.', 'Keterangan Lain-lain', 'Lihat Sebelah']
        ];

        autoTable(doc, {
            startY: 55,
            head: [['No', 'Uraian', 'Keterangan']],
            body: tableBody,
            theme: 'grid',
            styles: { font: 'times', fontSize: 10, cellPadding: 2, lineColor: 0, lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 10, halign: 'center' },
                1: { cellWidth: 80 },
                2: { cellWidth: 80 }
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFont('times', 'normal');
        doc.text(`Ditetapkan di : ${data.city}`, 130, finalY);
        doc.text(`Pada Tanggal  : ${data.date}`, 130, finalY + 5);
        doc.text('Kepala Sekolah,', 130, finalY + 15);
        doc.setFont('times', 'bold');
        doc.text(`( ${data.ksName} )`, 130, finalY + 35);
        doc.setFont('times', 'normal');
        doc.text(`NIP. ${data.ksNip}`, 130, finalY + 40);
    });

    doc.save('SPPD_Perjalanan_Dinas.pdf');
};

export const generateDaftarTransport = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text('DAFTAR PENERIMAAN UANG TRANSPORT', 105, margin, { align: 'center' });
    doc.text('PERJALANAN DINAS', 105, margin + 6, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text(`Kegiatan        : ${data.description || '...........................................'}`, margin, margin + 20);
    doc.text(`Hari/Tanggal : ${data.date}`, margin, margin + 26);
    doc.text(`Tempat          : ${data.destination || '...........................................'}`, margin, margin + 32);

    const transportPerPerson = data.amount ? Number(data.amount) : 0;
    
    const body = (data.officials || []).map((off: any, i: number) => [
        i + 1, off.name, `${data.schoolName} - ${data.destination}`, new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transportPerPerson), ''
    ]);

    // Total Row
    const totalAmount = transportPerPerson * (data.officials ? data.officials.length : 0);
    body.push(['', 'TOTAL', '', new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(totalAmount), '']);

    autoTable(doc, {
        startY: margin + 40,
        head: [['No', 'Nama Pegawai', 'Rute Perjalanan', 'Uang Transport', 'Tanda Tangan']],
        body: body,
        theme: 'grid',
        styles: { font: 'times', fontSize: 11, cellPadding: 3, lineWidth: 0.1, lineColor: 0 },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            3: { halign: 'right' }
        },
        didParseCell: (data) => {
            if (data.row.index === body.length - 1) {
                data.cell.styles.fontStyle = 'bold';
            }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;
    
    doc.text('Setuju Dibayar,', 20, finalY);
    doc.text('Lunas Dibayar,', 85, finalY);
    doc.text('Mengetahui,', 150, finalY); // Changed position logic
    
    doc.text('Kepala Sekolah', 20, finalY + 5);
    doc.text('Bendahara', 85, finalY + 5);
    doc.text('Kepala Sekolah', 150, finalY + 5); // Usually KS signs twice or just once

    doc.setFont('times', 'bold');
    doc.text(`( ${data.ksName} )`, 20, finalY + 25);
    doc.text(`( ${data.trName} )`, 85, finalY + 25);
    doc.text(`( ${data.ksName} )`, 150, finalY + 25);
    
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.ksNip}`, 20, finalY + 30);
    doc.text(`NIP. ${data.trNip}`, 85, finalY + 30);
    doc.text(`NIP. ${data.ksNip}`, 150, finalY + 30);

    doc.save('Daftar_Transport.pdf');
};

export const generateLaporanSPPD = (data: any) => {
    const doc = new jsPDF();
    const margin = 20;

    // Header
    doc.setFont('times', 'bold');
    doc.setFontSize(14);
    doc.text(`PEMERINTAH KABUPATEN/KOTA`, 105, margin, { align: 'center' });
    doc.text('DINAS PENDIDIKAN', 105, margin + 6, { align: 'center' });
    doc.text(data.schoolName.toUpperCase(), 105, margin + 12, { align: 'center' });
    doc.setLineWidth(0.5);
    doc.line(margin, margin + 22, 190, margin + 22);

    const titleY = margin + 35;
    doc.setFontSize(12);
    doc.text('LAPORAN PERJALANAN DINAS', 105, titleY, { align: 'center' });
    
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    let y = titleY + 15;

    // I. Pendahuluan
    doc.setFont('times', 'bold');
    doc.text('I. DASAR', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text(`Surat Tugas Kepala Sekolah Nomor: ${data.suratTugasNumber} Tanggal ${data.date}`, margin + 5, y);
    
    y += 10;
    doc.setFont('times', 'bold');
    doc.text('II. MAKSUD DAN TUJUAN', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    const splitTujuan = doc.splitTextToSize(data.description || 'Melaksanakan tugas dinas...', 165);
    doc.text(splitTujuan, margin + 5, y);
    y += (splitTujuan.length * 5) + 5;

    // III. Pelaksanaan
    doc.setFont('times', 'bold');
    doc.text('III. WAKTU DAN TEMPAT', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text(`Hari / Tanggal : ${data.date}`, margin + 5, y);
    y += 6;
    doc.text(`Tempat            : ${data.destination}`, margin + 5, y);
    
    y += 10;
    doc.setFont('times', 'bold');
    doc.text('IV. PETUGAS', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    data.officials.forEach((off: any, i: number) => {
        doc.text(`${i + 1}. ${off.name} (${off.role})`, margin + 5, y);
        y += 6;
    });

    y += 5;
    doc.setFont('times', 'bold');
    doc.text('V. HASIL KEGIATAN', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    const resultText = data.reportResult || 'Kegiatan telah dilaksanakan dengan baik.';
    const splitResult = doc.splitTextToSize(resultText, 165);
    doc.text(splitResult, margin + 5, y);
    y += (splitResult.length * 5) + 5;

    // VI. Penutup
    doc.setFont('times', 'bold');
    doc.text('VI. PENUTUP', margin, y);
    doc.setFont('times', 'normal');
    y += 6;
    doc.text('Demikian laporan ini dibuat untuk dipergunakan sebagaimana mestinya.', margin + 5, y);

    // Signatures
    y += 20;
    doc.text(`${data.city}, ${data.date}`, 140, y);
    y += 6;
    doc.text('Pelapor / Petugas,', 140, y);
    
    y += 25;
    doc.setFont('times', 'bold');
    // Assuming the first official is the main reporter
    doc.text(`( ${data.officials[0]?.name || '.......................'} )`, 140, y);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${data.officials[0]?.nip || '.......................'}`, 140, y + 5);

    doc.save('Laporan_SPPD.pdf');
};
