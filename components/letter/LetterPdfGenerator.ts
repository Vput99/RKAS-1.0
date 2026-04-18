import jsPDF from 'jspdf';
import { LetterAgreement } from '../../types';
import { fmt, getTerbilang, fmtDate } from './LetterUtils';

const drawKopSurat = (doc: any, data: LetterAgreement) => {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Header Text logic
  const cityPart = (data.school_address || '').split(',').length > 1
    ? (data.school_address || '').split(',').slice(-2, -1)[0]?.trim().toUpperCase()
    : 'KABUPATEN / KOTA';

  // Logo Placeholder
  doc.setLineWidth(0.5);
  doc.circle(margin + 12, 22, 10);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('LOGO', margin + 12, 22, { align: 'center' });

  // Regional Info
  const startY = 15;
  const centerX = pw / 2 + 10; // Offset for logo
  
  doc.setFont('times', 'normal');
  doc.setFontSize(11);
  doc.text(`PEMERINTAH KABUPATEN / KOTA`, centerX, startY, { align: 'center' });
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', centerX, startY + 5, { align: 'center' });

  // School Name (Bold & Large)
  doc.setFontSize(15);
  doc.setFont('times', 'bold');
  doc.text((data.school_name || 'NAMA SEKOLAH').toUpperCase(), centerX, startY + 12, { align: 'center' });

  // Address
  doc.setCharSpace(0.1);
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  const alamat = data.school_address || 'Alamat Sekolah Belum Diatur';
  doc.text(`Alamat: ${alamat}`, centerX, startY + 17, { align: 'center' });
  doc.setCharSpace(0);

  // Footer Lines (Double line: Thick then Thin)
  const lineY = startY + 22;
  doc.setLineWidth(1.2);
  doc.line(margin, lineY, pw - margin, lineY);
  doc.setLineWidth(0.3);
  doc.line(margin, lineY + 1.5, pw - margin, lineY + 1.5);

  return lineY + 10; 
};

const drawPasal = (doc: any, no: string, judul: string, isi: string[], margin: number, pw: number, yRef: { y: number }, data: LetterAgreement) => {
  const LINE = 5.5;
  if (yRef.y > 252) { doc.addPage(); drawKopSurat(doc, data); yRef.y = 44; }

  doc.setFontSize(10.5);
  doc.setFont('times', 'bold');
  doc.text(`Pasal ${no}`, margin, yRef.y); yRef.y += LINE;
  doc.text(judul, margin, yRef.y); yRef.y += LINE + 2;

  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  isi.forEach((line, idx) => {
    if (yRef.y > 270) { doc.addPage(); doc.setFont('times', 'normal'); doc.setFontSize(10); yRef.y = 25; }
    const prefix = isi.length > 1 ? `${idx + 1}. ` : '';
    const wrapped = doc.splitTextToSize(prefix + line, pw - margin * 2);
    doc.text(wrapped, margin, yRef.y);
    yRef.y += wrapped.length * LINE + 1.5;
  });
  yRef.y += 5;
};

export const generateEkskulPDF = (data: LetterAgreement) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const LINE = 5.5;

  let y = drawKopSurat(doc, data);

  // MOU Title Box (Double Border)
  doc.setLineWidth(0.8);
  doc.rect(margin, y, pw - margin * 2, 24);
  doc.setLineWidth(0.2);
  doc.rect(margin + 1, y + 1, pw - margin * 2 - 2, 22);

  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.text('SURAT PERJANJIAN KERJA (MOU)', pw / 2, y + 8, { align: 'center' });
  doc.setFontSize(11);
  doc.text('TENAGA PELAKSANA KEGIATAN EKSTRAKURIKULER', pw / 2, y + 14.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`TAHUN PELAJARAN ${data.fiscal_year}`, pw / 2, y + 20.5, { align: 'center' });
  y += 32;

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nomor : ${data.letter_number || '...'}`, margin, y);
  y += 10;

  doc.setFont('times', 'normal');
  const pembuka = `Pada hari ini, ${fmtDate(data.letter_date)}, yang bertanda tangan di bawah ini:`;
  const wrPembuka = doc.splitTextToSize(pembuka, pw - margin * 2);
  doc.text(wrPembuka, margin, y);
  y += wrPembuka.length * LINE + 5;

  const drawPihak = (label: string, rows: [string, string][], catatan: string) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text(label, margin, y); y += LINE + 1;

    const colLabel = margin + 5;
    const colColon = margin + 52;
    const colVal = margin + 55;

    doc.setFontSize(10);
    rows.forEach(([k, v]) => {
      doc.setFont('times', 'bold');
      doc.text(k, colLabel, y);
      doc.text(':', colColon, y);
      doc.setFont('times', 'normal');
      const wv = doc.splitTextToSize(v || '-', pw - colVal - margin);
      doc.text(wv, colVal, y);
      y += wv.length * LINE;
    });

    doc.setFont('times', 'normal');
    doc.text(`Selanjutnya disebut sebagai `, margin, y + 2);
    doc.setFont('times', 'bold');
    doc.text(catatan + '.', margin + doc.getTextWidth('Selanjutnya disebut sebagai '), y + 2);
    y += LINE + 5;
  };

  drawPihak('PIHAK PERTAMA :', [
    ['N a m a', data.headmaster],
    ['N I P', data.headmaster_nip || '-'],
    ['Jabatan', 'Kepala Sekolah'],
    ['Unit Kerja', data.school_name],
  ], 'PIHAK PERTAMA');

  drawPihak('PIHAK KEDUA :', [
    ['N a m a', data.party_name],
    ['N I K', data.party_nik || '-'],
    ['Alamat', data.party_address || '-'],
    ...(data.party_npwp ? [['N P W P', data.party_npwp] as [string, string]] : []),
  ], 'PIHAK KEDUA');

  const penghubung = 'Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja dengan ketentuan sebagaimana diatur dalam pasal-pasal berikut:';
  const wrPenghubung = doc.splitTextToSize(penghubung, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPenghubung, margin, y);
  y += wrPenghubung.length * LINE + 8;

  const yRef = { y };
  drawPasal(doc, '1', 'RUANG LINGKUP PEKERJAAN', [
    `PIHAK PERTAMA menugaskan PIHAK KEDUA sebagai ${data.activity_description} di ${data.school_name}.`,
    `Jadwal pelaksanaan kegiatan: ${data.schedule_description || '-'}.`,
    `Jumlah peserta didik yang dibimbing sementara: ± ${data.student_count || '-'} siswa.`,
  ], margin, pw, yRef, data);

  drawPasal(doc, '2', 'JANGKA WAKTU', [
    `Perjanjian ini berlaku terhitung mulai tanggal ${fmtDate(data.start_date)} sampai dengan ${fmtDate(data.end_date)}.`,
    'Perjanjian dapat diperpanjang atas dasar persetujuan tertulis dari kedua belah pihak.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '3', 'HONORARIUM', [
    `PIHAK PERTAMA memberikan honorarium kepada PIHAK KEDUA sebesar ${fmt(data.total_amount)} (${getTerbilang(data.total_amount)} Rupiah) setiap bulan.`,
    'Pembayaran dilakukan setiap bulan setelah PIHAK KEDUA menyerahkan laporan pelaksanaan kegiatan dan daftar hadir peserta kepada PIHAK PERTAMA.',
    'Honorarium dikenakan Pajak Penghasilan (PPh Pasal 21) sesuai dengan peraturan perpajakan yang berlaku.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '4', 'KEWAJIBAN PIHAK KEDUA', [
    'Melaksanakan kegiatan ekstrakurikuler secara profesional, disiplin, dan bertanggung jawab sesuai jadwal yang telah ditetapkan.',
    'Membuat jurnal kegiatan dan daftar hadir peserta setiap kali pertemuan dan menyerahkannya kepada PIHAK PERTAMA.',
    'Melaporkan perkembangan kegiatan ekstrakurikuler secara berkala kepada Kepala Sekolah.',
    'Menjaga nama baik, kerahasiaan data, dan informasi sekolah, serta tidak menyebarluaskan kepada pihak yang tidak berkepentingan.',
    'Tidak menuntut diangkat sebagai Aparatur Sipil Negara (ASN) atau Pegawai Pemerintah dengan Perjanjian Kerja (PPPK).',
  ], margin, pw, yRef, data);

  drawPasal(doc, '5', 'LARANGAN', [
    'PIHAK KEDUA dilarang merangkap jabatan yang menimbulkan konflik kepentingan.',
    'PIHAK KEDUA dilarang melakukan tindakan yang dapat mencemarkan nama baik sekolah.',
    'PIHAK KEDUA dilarang memberikan les/bimbingan kepada peserta didik yang berpotensi merusak sistem pembelajaran sekolah.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '6', 'SANKSI', [
    'Apabila PIHAK KEDUA melanggar ketentuan dalam perjanjian ini, PIHAK PERTAMA berhak memberikan peringatan tertulis.',
    'Apabila setelah 3 (tiga) kali peringatan tertulis PIHAK KEDUA tetap tidak memenuhi kewajibannya, PIHAK PERTAMA berhak mengakhiri perjanjian ini tanpa memberikan kompensasi lebih lanjut.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '7', 'PENYELESAIAN PERSELISIHAN', [
    'Segala perselisihan yang timbul akibat perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
    'Apabila tidak tercapai kesepakatan, penyelesaian dilakukan sesuai dengan ketentuan hukum yang berlaku.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '8', 'PENUTUP', [
    'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama, satu lembar untuk PIHAK PERTAMA dan satu lembar untuk PIHAK KEDUA.',
  ], margin, pw, yRef, data);

  const y2 = yRef.y;
  if (y2 > 230) { doc.addPage(); yRef.y = 25; }

  const city = (data.school_address || 'Tempat').split(',')[0].trim();
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`${city}, ${fmtDate(data.letter_date)}`, pw / 2, yRef.y, { align: 'center' });
  yRef.y += 8;

  const col1 = margin + 20;
  const col2 = pw - margin - 20;

  doc.setFont('times', 'bold');
  doc.text('PIHAK KEDUA,', col1, yRef.y, { align: 'center' });
  doc.text('PIHAK PERTAMA,', col2, yRef.y, { align: 'center' });
  yRef.y += 5;
  doc.setFont('times', 'normal');
  doc.text('Yang Menerima Tugas', col1, yRef.y, { align: 'center' });
  doc.text('Kepala Sekolah', col2, yRef.y, { align: 'center' });
  yRef.y += 5;

  doc.setLineWidth(0.3);
  doc.rect(col1 - 10, yRef.y, 20, 10);
  doc.setFontSize(6);
  doc.text('Materai', col1, yRef.y + 4, { align: 'center' });
  doc.text('Rp 10.000', col1, yRef.y + 7.5, { align: 'center' });
  doc.rect(col2 - 10, yRef.y, 20, 10);
  doc.text('Materai', col2, yRef.y + 4, { align: 'center' });
  doc.text('Rp 10.000', col2, yRef.y + 7.5, { align: 'center' });
  yRef.y += 20;

  doc.setFontSize(10.5);
  doc.setFont('times', 'bold');
  doc.text(data.party_name || '......................', col1, yRef.y, { align: 'center' });
  doc.text(data.headmaster || '......................', col2, yRef.y, { align: 'center' });
  yRef.y += 5;
  doc.setFont('times', 'normal');
  doc.text(`NIK. ${data.party_nik || '......................'}`, col1, yRef.y, { align: 'center' });
  doc.text(`NIP. ${data.headmaster_nip || '......................'}`, col2, yRef.y, { align: 'center' });

  doc.save(`SPK_Ekskul_${(data.party_name || 'surat').replace(/\s+/g, '_')}.pdf`);
};

export const generateTukangPDF = (data: LetterAgreement) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const LINE = 5.5;

  let y = drawKopSurat(doc, data);

  // MOU Title Box (Double Border)
  doc.setLineWidth(0.8);
  doc.rect(margin, y, pw - margin * 2, 24);
  doc.setLineWidth(0.2);
  doc.rect(margin + 1, y + 1, pw - margin * 2 - 2, 22);

  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.text('SURAT PERJANJIAN KERJA (MOU)', pw / 2, y + 8, { align: 'center' });
  doc.setFontSize(11);
  doc.text('PEKERJAAN REHABILITASI GEDUNG/BANGUNAN', pw / 2, y + 14.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`TAHUN ANGGARAN ${data.fiscal_year}`, pw / 2, y + 20.5, { align: 'center' });
  y += 32;

  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nomor : ${data.letter_number || '...'}`, margin, y);
  y += 10;

  const pembuka = `Pada hari ini, ${fmtDate(data.letter_date)}, yang bertanda tangan di bawah ini:`;
  const wrPembuka = doc.splitTextToSize(pembuka, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPembuka, margin, y);
  y += wrPembuka.length * LINE + 5;

  const drawPihak2 = (label: string, rows: [string, string][], catatan: string) => {
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.text(label, margin, y); y += LINE + 1;

    const colLabel = margin + 5;
    const colColon = margin + 52;
    const colVal = margin + 55;

    doc.setFontSize(10);
    rows.forEach(([k, v]) => {
      doc.setFont('times', 'bold');
      doc.text(k, colLabel, y);
      doc.text(':', colColon, y);
      doc.setFont('times', 'normal');
      const wv = doc.splitTextToSize(v || '-', pw - colVal - margin);
      doc.text(wv, colVal, y);
      y += wv.length * LINE;
    });
    doc.setFont('times', 'normal');
    doc.text(`Selanjutnya disebut sebagai `, margin, y + 2);
    doc.setFont('times', 'bold');
    doc.text(catatan + '.', margin + doc.getTextWidth('Selanjutnya disebut sebagai '), y + 2);
    y += LINE + 5;
  };

  drawPihak2('PIHAK PERTAMA (Pemberi Kerja) :', [
    ['N a m a', data.headmaster],
    ['N I P', data.headmaster_nip || '-'],
    ['Jabatan', 'Kepala Sekolah'],
    ['Unit Kerja', data.school_name],
  ], 'PIHAK PERTAMA');

  drawPihak2('PIHAK KEDUA (Pelaksana Pekerjaan) :', [
    ['N a m a', data.party_name],
    ['N I K', data.party_nik || '-'],
    ['Alamat', data.party_address || '-'],
    ...(data.party_npwp ? [['N P W P', data.party_npwp] as [string, string]] : []),
  ], 'PIHAK KEDUA');

  const penghubung = 'Kedua belah pihak telah sepakat untuk mengadakan perjanjian pelaksanaan pekerjaan dengan ketentuan sebagaimana diatur dalam pasal-pasal berikut:';
  const wrPenghubung = doc.splitTextToSize(penghubung, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPenghubung, margin, y);
  y += wrPenghubung.length * LINE + 8;

  const yRef = { y };

  drawPasal(doc, '1', 'JENIS DAN LINGKUP PEKERJAAN', [
    `PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA berupa: ${data.activity_description}.`,
    `Lokasi pekerjaan: ${data.activity_location || data.school_name}.`,
    `Volume pekerjaan: ${data.work_volume || '-'}.`,
  ], margin, pw, yRef, data);

  drawPasal(doc, '2', 'JANGKA WAKTU PELAKSANAAN', [
    `Pekerjaan dilaksanakan terhitung mulai tanggal ${fmtDate(data.start_date)} dan harus selesai selambat-lambatnya tanggal ${fmtDate(data.end_date)}.`,
    'Apabila terjadi keterlambatan yang disebabkan oleh PIHAK KEDUA, maka akan dikenakan sanksi pengurangan nilai pembayaran.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '3', 'NILAI DAN CARA PEMBAYARAN', [
    `Nilai upah tenaga yang diberikan berdasarkan perjanjian ini adalah sebesar ${fmt(data.total_amount)} (${getTerbilang(data.total_amount)} Rupiah).`,
    data.rab_total ? `Anggaran pengadaan material bangunan (RAB) sebesar ${fmt(data.rab_total)}, diadakan terpisah melalui mekanisme pengadaan SIPLah sesuai regulasi BOSP.` : '',
    'Pembayaran upah dilakukan setelah pekerjaan dinyatakan selesai 100% and telah diterima oleh PIHAK PERTAMA berdasarkan Berita Acara Penyelesaian Pekerjaan.',
    'Pembayaran dikenakan Pajak Penghasilan (PPh Pasal 21) atas upah tenaga sesuai ketentuan perpajakan yang berlaku.',
  ].filter(Boolean) as string[], margin, pw, yRef, data);

  drawPasal(doc, '4', 'KEWAJIBAN PIHAK KEDUA', [
    'Melaksanakan pekerjaan sesuai dengan spesifikasi teknis dan RAB yang telah disepakati.',
    'Menyediakan seluruh peralatan kerja, bahan habis pakai, dan tenaga kerja pendukung yang diperlukan dalam pelaksanaan pekerjaan.',
    'Membuat laporan kemajuan pekerjaan secara berkala (0%, 50%, dan 100%) disertai dokumentasi foto.',
    `Memberikan jaminan atas kualitas hasil pekerjaan selama ${data.work_guarantee || '6 (enam) bulan'} sejak pekerjaan dinyatakan selesai dan diterima.`,
  ], margin, pw, yRef, data);

  drawPasal(doc, '5', 'KEWAJIBAN PIHAK PERTAMA', [
    'Menyediakan akses lokasi pekerjaan dan berkoordinasi dengan PIHAK KEDUA selama pelaksanaan.',
    'Melakukan pengawasan dan pemeriksaan hasil pekerjaan secara berkala.',
    'Membayar upah kepada PIHAK KEDUA sesuai ketentuan Pasal 3 setelah pekerjaan selesai dan diterima.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '6', 'KESELAMATAN DAN KESEHATAN KERJA (K3)', [
    'PIHAK KEDUA bertanggung jawab penuh atas keselamatan dan kesehatan seluruh tenaga kerja yang terlibat dalam pelaksanaan pekerjaan.',
    'Segala risiko kecelakaan kerja yang terjadi selama pelaksanaan pekerjaan sepenuhnya menjadi tanggung jawab PIHAK KEDUA.',
    'PIHAK KEDUA wajib menggunakan Alat Pelindung Diri (APD) yang sesuai selama pelaksanaan pekerjaan.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '7', 'PEMUTUSAN PERJANJIAN', [
    'Perjanjian ini dapat diakhiri apabila PIHAK KEDUA terbukti tidak mampu atau tidak bersedia menyelesaikan pekerjaan sesuai ketentuan yang telah disepakati.',
    'Pemutusan perjanjian dilakukan dengan pemberitahuan tertulis minimal 7 (tujuh) hari kerja sebelumnya.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '8', 'PENYELESAIAN PERSELISIHAN', [
    'Segala perselisihan yang timbul dari pelaksanaan perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
    'Apabila tidak tercapai kesepakatan dalam musyawarah, penyelesaian dilakukan melalui jalur hukum yang berlaku.',
  ], margin, pw, yRef, data);

  drawPasal(doc, '9', 'PENUTUP', [
    'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, masing-masing bermaterai cukup (Rp 10.000,-) dan ditandatangani oleh kedua belah pihak, sehingga mempunyai kekuatan hukum yang sama.',
  ], margin, pw, yRef, data);

  if (yRef.y > 230) { doc.addPage(); yRef.y = 25; }

  const city = (data.school_address || 'Tempat').split(',')[0].trim();
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`${city}, ${fmtDate(data.letter_date)}`, pw / 2, yRef.y, { align: 'center' });
  yRef.y += 8;

  const col1 = margin + 20;
  const col2 = pw - margin - 20;

  doc.setFont('times', 'bold');
  doc.text('PIHAK KEDUA,', col1, yRef.y, { align: 'center' });
  doc.text('PIHAK PERTAMA,', col2, yRef.y, { align: 'center' });
  yRef.y += 5;
  doc.setFont('times', 'normal');
  doc.text('Pelaksana Pekerjaan', col1, yRef.y, { align: 'center' });
  doc.text('Kepala Sekolah', col2, yRef.y, { align: 'center' });
  yRef.y += 5;

  doc.setLineWidth(0.3);
  doc.rect(col1 - 10, yRef.y, 20, 10);
  doc.setFontSize(6);
  doc.text('Materai', col1, yRef.y + 4, { align: 'center' });
  doc.text('Rp 10.000', col1, yRef.y + 7.5, { align: 'center' });
  doc.rect(col2 - 10, yRef.y, 20, 10);
  doc.text('Materai', col2, yRef.y + 4, { align: 'center' });
  doc.text('Rp 10.000', col2, yRef.y + 7.5, { align: 'center' });
  yRef.y += 20;

  doc.setFontSize(10.5);
  doc.setFont('times', 'bold');
  doc.text(data.party_name || '......................', col1, yRef.y, { align: 'center' });
  doc.text(data.headmaster || '......................', col2, yRef.y, { align: 'center' });
  yRef.y += 5;
  doc.setFont('times', 'normal');
  doc.text(`NIK. ${data.party_nik || '......................'}`, col1, yRef.y, { align: 'center' });
  doc.text(`NIP. ${data.headmaster_nip || '......................'}`, col2, yRef.y, { align: 'center' });

  doc.save(`SPK_Tukang_${(data.party_name || 'surat').replace(/\s+/g, '_')}.pdf`);
};
