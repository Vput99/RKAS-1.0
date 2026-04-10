import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileSignature, Trash2, Printer, X,
  Users, HardHat, Search, CheckCircle2, FilePen,
  Calendar, Hash, DollarSign, AlertCircle,
  Save, Loader2, FileText, Download
} from 'lucide-react';
import jsPDF from 'jspdf';
import { getSchoolProfile, getLetterAgreements, saveLetterAgreement, deleteLetterAgreement, updateLetterAgreement } from '../lib/db';
import { SchoolProfile, LetterAgreement } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

const getTerbilang = (nilai: number): string => {
  const angka = Math.abs(nilai);
  const baca = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  let t = '';
  if (angka < 12) t = ' ' + baca[angka];
  else if (angka < 20) t = getTerbilang(angka - 10) + ' Belas';
  else if (angka < 100) t = getTerbilang(Math.floor(angka / 10)) + ' Puluh' + getTerbilang(angka % 10);
  else if (angka < 200) t = ' Seratus' + getTerbilang(angka - 100);
  else if (angka < 1000) t = getTerbilang(Math.floor(angka / 100)) + ' Ratus' + getTerbilang(angka % 100);
  else if (angka < 2000) t = ' Seribu' + getTerbilang(angka - 1000);
  else if (angka < 1000000) t = getTerbilang(Math.floor(angka / 1000)) + ' Ribu' + getTerbilang(angka % 1000);
  else if (angka < 1_000_000_000) t = getTerbilang(Math.floor(angka / 1_000_000)) + ' Juta' + getTerbilang(angka % 1_000_000);
  return t.trim();
};

const fmtDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return s; }
};

// ─── Default Form ─────────────────────────────────────────────────────────────
const defaultForm = (profile: SchoolProfile | null, type: 'ekstrakurikuler' | 'tukang'): Partial<LetterAgreement> => {
  const year = profile?.fiscalYear || new Date().getFullYear().toString();
  return {
    type,
    status: 'draft',
    letter_date: new Date().toISOString().split('T')[0],
    fiscal_year: year,
    letter_number: type === 'ekstrakurikuler'
      ? `421.2 / SPK-EKS / ... / ${year}`
      : `027 / SPK-REH / ... / ${year}`,
    school_name: profile?.name || '',
    school_address: profile?.address || '',
    headmaster: profile?.headmaster || '',
    headmaster_nip: profile?.headmasterNip || '',
    party_name: '',
    party_address: '',
    party_nik: '',
    party_npwp: '',
    activity_description: type === 'ekstrakurikuler'
      ? 'Pembina Ekstrakurikuler ...'
      : 'Pekerjaan Rehabilitasi ...',
    activity_location: profile?.name || '',
    start_date: `${year}-01-01`,
    end_date: `${year}-12-31`,
    total_amount: 0,
    schedule_description: 'Setiap hari Sabtu, pukul 08.00 – 10.00 WIB',
    student_count: profile?.studentCount || 0,
    work_volume: '',
    rab_total: 0,
    work_guarantee: '6 bulan sejak pekerjaan selesai',
    payment_schedule: [],
    notes: '',
  };
};


// ─── SHARED: KOP SURAT ────────────────────────────────────────────────────────
const drawKopSurat = (doc: any, data: LetterAgreement) => {
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;

  // Garis tebal atas KOP
  doc.setLineWidth(1.2);
  doc.line(margin, 8, pw - margin, 8);

  // Logo placeholder (lingkaran kecil di kiri)
  doc.setLineWidth(0.3);
  doc.circle(margin + 8, 22, 8);
  doc.setFontSize(5);
  doc.setFont('helvetica', 'normal');
  doc.text('LOGO', margin + 8, 22.5, { align: 'center' });

  // Teks KOP di tengah
  const cx = pw / 2 + 5;

  // Baris 1: PEMERINTAH KABUPATEN/KOTA (ambil dari alamat jika ada)
  const cityPart = (data.school_address || '').split(',').length > 1
    ? (data.school_address || '').split(',').slice(-2, -1)[0]?.trim().toUpperCase()
    : 'KABUPATEN / KOTA';
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`PEMERINTAH ${cityPart || 'KABUPATEN/KOTA'}`, cx, 13, { align: 'center' });

  // Baris 2: DINAS PENDIDIKAN
  doc.setFontSize(9);
  doc.text('DINAS PENDIDIKAN DAN KEBUDAYAAN', cx, 18, { align: 'center' });

  // Baris 3: NAMA SEKOLAH (besar & bold)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text((data.school_name || 'NAMA SEKOLAH').toUpperCase(), cx, 25, { align: 'center' });

  // Baris 4: Alamat
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const alamat = data.school_address || 'Alamat Sekolah';
  doc.text(`Alamat: ${alamat}`, cx, 31, { align: 'center' });

  // Garis TEBAL bawah KOP — double line standar surat resmi
  doc.setLineWidth(1.5);
  doc.line(margin, 36, pw - margin, 36);
  doc.setLineWidth(0.4);
  doc.line(margin, 38, pw - margin, 38);

  return 44; // y setelah kop
};

// ─── SHARED: Pasal Helper ─────────────────────────────────────────────────────
const drawPasal = (doc: any, no: string, judul: string, isi: string[], margin: number, pw: number, yRef: { y: number }) => {
  const LINE = 5.5;
  if (yRef.y > 252) { doc.addPage(); drawKopSurat(doc, {} as any); yRef.y = 44; }

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

// ─── PDF Generator: Ekskul (Format Surat Resmi) ──────────────────────────────
const generateEkskulPDF = (data: LetterAgreement) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const LINE = 5.5;

  // KOP SURAT
  let y = drawKopSurat(doc, data);

  // ── JUDUL SURAT dalam KOTAK ──
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pw - margin * 2, 22);
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.text('SURAT PERJANJIAN KERJA (MOU)', pw / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text('TENAGA PELAKSANA KEGIATAN EKSTRAKURIKULER', pw / 2, y + 13.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`TAHUN PELAJARAN ${data.fiscal_year}`, pw / 2, y + 19.5, { align: 'center' });
  y += 27;

  // ── NOMOR SURAT ──
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nomor : ${data.letter_number || '...'}`, margin, y);
  y += 10;

  // ── PEMBUKA ──
  doc.setFont('times', 'normal');
  const pembuka = `Pada hari ini, ${fmtDate(data.letter_date)}, yang bertanda tangan di bawah ini:`;
  const wrPembuka = doc.splitTextToSize(pembuka, pw - margin * 2);
  doc.text(wrPembuka, margin, y);
  y += wrPembuka.length * LINE + 5;

  // ── PIHAK PERTAMA ──
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

  // ── KALIMAT PENGHUBUNG ──
  const penghubung = 'Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja dengan ketentuan sebagaimana diatur dalam pasal-pasal berikut:';
  const wrPenghubung = doc.splitTextToSize(penghubung, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPenghubung, margin, y);
  y += wrPenghubung.length * LINE + 8;

  // ── PASAL-PASAL ──
  const yRef = { y };
  drawPasal(doc, '1', 'RUANG LINGKUP PEKERJAAN', [
    `PIHAK PERTAMA menugaskan PIHAK KEDUA sebagai ${data.activity_description} di ${data.school_name}.`,
    `Jadwal pelaksanaan kegiatan: ${data.schedule_description || '-'}.`,
    `Jumlah peserta didik yang dibimbing sementara: ± ${data.student_count || '-'} siswa.`,
  ], margin, pw, yRef);

  drawPasal(doc, '2', 'JANGKA WAKTU', [
    `Perjanjian ini berlaku terhitung mulai tanggal ${fmtDate(data.start_date)} sampai dengan ${fmtDate(data.end_date)}.`,
    'Perjanjian dapat diperpanjang atas dasar persetujuan tertulis dari kedua belah pihak.',
  ], margin, pw, yRef);

  drawPasal(doc, '3', 'HONORARIUM', [
    `PIHAK PERTAMA memberikan honorarium kepada PIHAK KEDUA sebesar ${fmt(data.total_amount)} (${getTerbilang(data.total_amount)} Rupiah) setiap bulan.`,
    'Pembayaran dilakukan setiap bulan setelah PIHAK KEDUA menyerahkan laporan pelaksanaan kegiatan dan daftar hadir peserta kepada PIHAK PERTAMA.',
    'Honorarium dikenakan Pajak Penghasilan (PPh Pasal 21) sesuai dengan peraturan perpajakan yang berlaku.',
  ], margin, pw, yRef);

  drawPasal(doc, '4', 'KEWAJIBAN PIHAK KEDUA', [
    'Melaksanakan kegiatan ekstrakurikuler secara profesional, disiplin, dan bertanggung jawab sesuai jadwal yang telah ditetapkan.',
    'Membuat jurnal kegiatan dan daftar hadir peserta setiap kali pertemuan dan menyerahkannya kepada PIHAK PERTAMA.',
    'Melaporkan perkembangan kegiatan ekstrakurikuler secara berkala kepada Kepala Sekolah.',
    'Menjaga nama baik, kerahasiaan data, dan informasi sekolah, serta tidak menyebarluaskan kepada pihak yang tidak berkepentingan.',
    'Tidak menuntut diangkat sebagai Aparatur Sipil Negara (ASN) atau Pegawai Pemerintah dengan Perjanjian Kerja (PPPK).',
  ], margin, pw, yRef);

  drawPasal(doc, '5', 'LARANGAN', [
    'PIHAK KEDUA dilarang merangkap jabatan yang menimbulkan konflik kepentingan.',
    'PIHAK KEDUA dilarang melakukan tindakan yang dapat mencemarkan nama baik sekolah.',
    'PIHAK KEDUA dilarang memberikan les/bimbingan kepada peserta didik yang berpotensi merusak sistem pembelajaran sekolah.',
  ], margin, pw, yRef);

  drawPasal(doc, '6', 'SANKSI', [
    'Apabila PIHAK KEDUA melanggar ketentuan dalam perjanjian ini, PIHAK PERTAMA berhak memberikan peringatan tertulis.',
    'Apabila setelah 3 (tiga) kali peringatan tertulis PIHAK KEDUA tetap tidak memenuhi kewajibannya, PIHAK PERTAMA berhak mengakhiri perjanjian ini tanpa memberikan kompensasi lebih lanjut.',
  ], margin, pw, yRef);

  drawPasal(doc, '7', 'PENYELESAIAN PERSELISIHAN', [
    'Segala perselisihan yang timbul akibat perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
    'Apabila tidak tercapai kesepakatan, penyelesaian dilakukan sesuai dengan ketentuan hukum yang berlaku.',
  ], margin, pw, yRef);

  drawPasal(doc, '8', 'PENUTUP', [
    'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, bermaterai cukup, masing-masing mempunyai kekuatan hukum yang sama, satu lembar untuk PIHAK PERTAMA dan satu lembar untuk PIHAK KEDUA.',
  ], margin, pw, yRef);

  // ── TANDA TANGAN ──
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

  // Kotak materai
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

// ─── PDF Generator: Tukang (Format Surat Resmi) ──────────────────────────────
const generateTukangPDF = (data: LetterAgreement) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = doc.internal.pageSize.getWidth();
  const margin = 20;
  const LINE = 5.5;

  // KOP SURAT
  let y = drawKopSurat(doc, data);

  // ── JUDUL dalam KOTAK ──
  doc.setLineWidth(0.5);
  doc.rect(margin, y, pw - margin * 2, 22);
  doc.setFontSize(13);
  doc.setFont('times', 'bold');
  doc.text('SURAT PERJANJIAN KERJA (MOU)', pw / 2, y + 7, { align: 'center' });
  doc.setFontSize(11);
  doc.text('PEKERJAAN REHABILITASI GEDUNG/BANGUNAN', pw / 2, y + 13.5, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`TAHUN ANGGARAN ${data.fiscal_year}`, pw / 2, y + 19.5, { align: 'center' });
  y += 27;

  // ── NOMOR SURAT ──
  doc.setFont('times', 'normal');
  doc.setFontSize(10.5);
  doc.text(`Nomor : ${data.letter_number || '...'}`, margin, y);
  y += 10;

  // ── PEMBUKA ──
  const pembuka = `Pada hari ini, ${fmtDate(data.letter_date)}, yang bertanda tangan di bawah ini:`;
  const wrPembuka = doc.splitTextToSize(pembuka, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPembuka, margin, y);
  y += wrPembuka.length * LINE + 5;

  // ── PIHAK ──
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

  // ── PENGHUBUNG ──
  const penghubung = 'Kedua belah pihak telah sepakat untuk mengadakan perjanjian pelaksanaan pekerjaan dengan ketentuan sebagaimana diatur dalam pasal-pasal berikut:';
  const wrPenghubung = doc.splitTextToSize(penghubung, pw - margin * 2);
  doc.setFont('times', 'normal');
  doc.text(wrPenghubung, margin, y);
  y += wrPenghubung.length * LINE + 8;

  // ── PASAL ──
  const yRef = { y };

  drawPasal(doc, '1', 'JENIS DAN LINGKUP PEKERJAAN', [
    `PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA berupa: ${data.activity_description}.`,
    `Lokasi pekerjaan: ${data.activity_location || data.school_name}.`,
    `Volume pekerjaan: ${data.work_volume || '-'}.`,
  ], margin, pw, yRef);

  drawPasal(doc, '2', 'JANGKA WAKTU PELAKSANAAN', [
    `Pekerjaan dilaksanakan terhitung mulai tanggal ${fmtDate(data.start_date)} dan harus selesai selambat-lambatnya tanggal ${fmtDate(data.end_date)}.`,
    'Apabila terjadi keterlambatan yang disebabkan oleh PIHAK KEDUA, maka akan dikenakan sanksi pengurangan nilai pembayaran.',
  ], margin, pw, yRef);

  drawPasal(doc, '3', 'NILAI DAN CARA PEMBAYARAN', [
    `Nilai upah tenaga yang diberikan berdasarkan perjanjian ini adalah sebesar ${fmt(data.total_amount)} (${getTerbilang(data.total_amount)} Rupiah).`,
    data.rab_total ? `Anggaran pengadaan material bangunan (RAB) sebesar ${fmt(data.rab_total)}, diadakan terpisah melalui mekanisme pengadaan SIPLah sesuai regulasi BOSP.` : '',
    'Pembayaran upah dilakukan setelah pekerjaan dinyatakan selesai 100% dan telah diterima oleh PIHAK PERTAMA berdasarkan Berita Acara Penyelesaian Pekerjaan.',
    'Pembayaran dikenakan Pajak Penghasilan (PPh Pasal 21) atas upah tenaga sesuai ketentuan perpajakan yang berlaku.',
  ].filter(Boolean) as string[], margin, pw, yRef);

  drawPasal(doc, '4', 'KEWAJIBAN PIHAK KEDUA', [
    'Melaksanakan pekerjaan sesuai dengan spesifikasi teknis dan RAB yang telah disepakati.',
    'Menyediakan seluruh peralatan kerja, bahan habis pakai, dan tenaga kerja pendukung yang diperlukan dalam pelaksanaan pekerjaan.',
    'Membuat laporan kemajuan pekerjaan secara berkala (0%, 50%, dan 100%) disertai dokumentasi foto.',
    `Memberikan jaminan atas kualitas hasil pekerjaan selama ${data.work_guarantee || '6 (enam) bulan'} sejak pekerjaan dinyatakan selesai dan diterima.`,
  ], margin, pw, yRef);

  drawPasal(doc, '5', 'KEWAJIBAN PIHAK PERTAMA', [
    'Menyediakan akses lokasi pekerjaan dan berkoordinasi dengan PIHAK KEDUA selama pelaksanaan.',
    'Melakukan pengawasan dan pemeriksaan hasil pekerjaan secara berkala.',
    'Membayar upah kepada PIHAK KEDUA sesuai ketentuan Pasal 3 setelah pekerjaan selesai dan diterima.',
  ], margin, pw, yRef);

  drawPasal(doc, '6', 'KESELAMATAN DAN KESEHATAN KERJA (K3)', [
    'PIHAK KEDUA bertanggung jawab penuh atas keselamatan dan kesehatan seluruh tenaga kerja yang terlibat dalam pelaksanaan pekerjaan.',
    'Segala risiko kecelakaan kerja yang terjadi selama pelaksanaan pekerjaan sepenuhnya menjadi tanggung jawab PIHAK KEDUA.',
    'PIHAK KEDUA wajib menggunakan Alat Pelindung Diri (APD) yang sesuai selama pelaksanaan pekerjaan.',
  ], margin, pw, yRef);

  drawPasal(doc, '7', 'PEMUTUSAN PERJANJIAN', [
    'Perjanjian ini dapat diakhiri apabila PIHAK KEDUA terbukti tidak mampu atau tidak bersedia menyelesaikan pekerjaan sesuai ketentuan yang telah disepakati.',
    'Pemutusan perjanjian dilakukan dengan pemberitahuan tertulis minimal 7 (tujuh) hari kerja sebelumnya.',
  ], margin, pw, yRef);

  drawPasal(doc, '8', 'PENYELESAIAN PERSELISIHAN', [
    'Segala perselisihan yang timbul dari pelaksanaan perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
    'Apabila tidak tercapai kesepakatan dalam musyawarah, penyelesaian dilakukan melalui jalur hukum yang berlaku.',
  ], margin, pw, yRef);

  drawPasal(doc, '9', 'PENUTUP', [
    'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, masing-masing bermaterai cukup (Rp 10.000,-) dan ditandatangani oleh kedua belah pihak, sehingga mempunyai kekuatan hukum yang sama.',
  ], margin, pw, yRef);

  // ── TANDA TANGAN ──
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




// ─── Form Field Component ─────────────────────────────────────────────────────
const Field = ({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-slate-300";
const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => <input className={inputCls} {...props} />;
const Textarea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={inputCls + ' resize-none'} rows={3} {...props} />;

// ⚠️ HARUS di luar komponen agar tidak di-recreate setiap render (mencegah bug kehilangan fokus)
const FormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-5 space-y-4">
    <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
  </div>
);


// ─── Main Component ───────────────────────────────────────────────────────────
const LetterMaker = ({ schoolProfile: propProfile }: { schoolProfile?: SchoolProfile | null }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'form-ekskul' | 'form-tukang'>('list');
  const [letters, setLetters] = useState<LetterAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<SchoolProfile | null>(propProfile || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'ekstrakurikuler' | 'tukang'>('all');
  const [form, setForm] = useState<Partial<LetterAgreement>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [p, ls] = await Promise.all([
        propProfile ? Promise.resolve(propProfile) : getSchoolProfile(),
        getLetterAgreements()
      ]);
      setProfile(p);
      setLetters(ls);
      setLoading(false);
    };
    load();
  }, []);

  const initForm = useCallback((type: 'ekstrakurikuler' | 'tukang') => {
    setEditingId(null);
    setForm(defaultForm(profile, type));
    setActiveTab(type === 'ekstrakurikuler' ? 'form-ekskul' : 'form-tukang');
  }, [profile]);

  const handleEdit = (letter: LetterAgreement) => {
    setEditingId(letter.id);
    setForm({ ...letter });
    setActiveTab(letter.type === 'ekstrakurikuler' ? 'form-ekskul' : 'form-tukang');
  };

  const handleChange = (key: keyof LetterAgreement, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.party_name?.trim()) { alert('Nama pihak kedua wajib diisi.'); return; }
    if (!form.activity_description?.trim()) { alert('Deskripsi kegiatan/pekerjaan wajib diisi.'); return; }
    setSaving(true);
    try {
      if (editingId) {
        await updateLetterAgreement(editingId, form);
        setLetters(prev => prev.map(l => l.id === editingId ? { ...l, ...form } as LetterAgreement : l));
      } else {
        const saved = await saveLetterAgreement(form as Omit<LetterAgreement, 'id' | 'created_at' | 'user_id'>);
        if (saved) setLetters(prev => [saved, ...prev]);
      }
      setActiveTab('list');
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus surat ini?')) return;
    const ok = await deleteLetterAgreement(id);
    if (ok) setLetters(prev => prev.filter(l => l.id !== id));
  };

  const handlePrint = (letter: LetterAgreement) => {
    if (letter.type === 'ekstrakurikuler') generateEkskulPDF(letter);
    else generateTukangPDF(letter);
  };

  // Export data surat sebagai JSON untuk diproses script Python (generate_spk.py)
  const handleExportJSON = (letter: LetterAgreement) => {
    const json = JSON.stringify(letter, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPK_${letter.type}_${(letter.party_name || 'data').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCurrentFormJSON = () => {
    if (!form.party_name?.trim()) { alert('Isi Nama Pihak Kedua terlebih dahulu.'); return; }
    const json = JSON.stringify(form, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SPK_${form.type || 'surat'}_${(form.party_name || 'data').replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = letters.filter(l => {
    const matchSearch = l.party_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.activity_description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || l.type === filterType;
    return matchSearch && matchType;
  });

  const renderForm = (type: 'ekstrakurikuler' | 'tukang') => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header Aksi */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
            {type === 'ekstrakurikuler' ? <Users size={20} /> : <HardHat size={20} />}
          </div>
          <div>
            <h2 className="font-black text-slate-800">
              {editingId ? 'Edit' : 'Buat'} MOU / SPK {type === 'ekstrakurikuler' ? 'Tenaga Ekstrakurikuler' : 'Tukang (Rehab Gedung)'}
            </h2>
            <p className="text-xs text-slate-400">Isi form di bawah, lalu simpan atau langsung cetak PDF.</p>
          </div>
        </div>
        <button onClick={() => setActiveTab('list')} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
          <X size={20} />
        </button>
      </div>

      {/* Form Sections */}
      <FormSection title="Informasi Surat">
        <Field label="Nomor Surat" required>
          <Input value={form.letter_number || ''} onChange={e => handleChange('letter_number', e.target.value)} placeholder="421.2 / SPK / ... / 2026" />
        </Field>
        <Field label="Tanggal Surat" required>
          <Input type="date" value={form.letter_date || ''} onChange={e => handleChange('letter_date', e.target.value)} />
        </Field>
        <Field label="Tahun Anggaran">
          <Input value={form.fiscal_year || ''} onChange={e => handleChange('fiscal_year', e.target.value)} placeholder="2026" />
        </Field>
        <Field label="Status">
          <select
            className={inputCls}
            value={form.status || 'draft'}
            onChange={e => handleChange('status', e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </select>
        </Field>
      </FormSection>

      <FormSection title="Data Sekolah (Pihak Pertama)">
        <Field label="Nama Sekolah">
          <Input value={form.school_name || ''} onChange={e => handleChange('school_name', e.target.value)} />
        </Field>
        <Field label="Alamat Sekolah">
          <Input value={form.school_address || ''} onChange={e => handleChange('school_address', e.target.value)} />
        </Field>
        <Field label="Nama Kepala Sekolah">
          <Input value={form.headmaster || ''} onChange={e => handleChange('headmaster', e.target.value)} />
        </Field>
        <Field label="NIP Kepala Sekolah">
          <Input value={form.headmaster_nip || ''} onChange={e => handleChange('headmaster_nip', e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title={`Data ${type === 'ekstrakurikuler' ? 'Tenaga Ekstrakurikuler' : 'Tukang/Pelaksana'} (Pihak Kedua)`}>
        <Field label="Nama Lengkap" required>
          <Input value={form.party_name || ''} onChange={e => handleChange('party_name', e.target.value)} placeholder="Nama lengkap pihak kedua" />
        </Field>
        <Field label="NIK">
          <Input value={form.party_nik || ''} onChange={e => handleChange('party_nik', e.target.value)} placeholder="16 digit NIK" maxLength={16} />
        </Field>
        <Field label="Alamat">
          <Input value={form.party_address || ''} onChange={e => handleChange('party_address', e.target.value)} placeholder="Alamat domisili" />
        </Field>
        <Field label="NPWP (opsional)">
          <Input value={form.party_npwp || ''} onChange={e => handleChange('party_npwp', e.target.value)} placeholder="XX.XXX.XXX.X-XXX.XXX" />
        </Field>
      </FormSection>

      <FormSection title="Detail Pekerjaan / Kegiatan">
        <div className="col-span-2">
          <Field label="Deskripsi Kegiatan / Jenis Pekerjaan" required>
            <Textarea value={form.activity_description || ''} onChange={e => handleChange('activity_description', e.target.value)}
              placeholder={type === 'ekstrakurikuler' ? 'Misal: Pembina Ekstrakurikuler Pramuka' : 'Misal: Pekerjaan pengecatan dinding dan perbaikan atap'} />
          </Field>
        </div>
        <Field label="Lokasi">
          <Input value={form.activity_location || ''} onChange={e => handleChange('activity_location', e.target.value)} />
        </Field>
        <Field label="Tanggal Mulai">
          <Input type="date" value={form.start_date || ''} onChange={e => handleChange('start_date', e.target.value)} />
        </Field>
        <Field label="Tanggal Selesai">
          <Input type="date" value={form.end_date || ''} onChange={e => handleChange('end_date', e.target.value)} />
        </Field>

        {type === 'ekstrakurikuler' && (
          <>
            <Field label="Jadwal Kegiatan">
              <Input value={form.schedule_description || ''} onChange={e => handleChange('schedule_description', e.target.value)} placeholder="Misal: Setiap Sabtu, 08.00-10.00 WIB" />
            </Field>
            <Field label="Jumlah Peserta Didik">
              <Input type="number" value={form.student_count || ''} onChange={e => handleChange('student_count', Number(e.target.value))} placeholder="0" />
            </Field>
          </>
        )}

        {type === 'tukang' && (
          <>
            <Field label="Volume Pekerjaan">
              <Input value={form.work_volume || ''} onChange={e => handleChange('work_volume', e.target.value)} placeholder="Misal: 45 m², 1 unit" />
            </Field>
            <Field label="RAB Material (Rp)">
              <Input type="number" value={form.rab_total || ''} onChange={e => handleChange('rab_total', Number(e.target.value))} placeholder="0" />
            </Field>
            <Field label="Jaminan Pekerjaan">
              <Input value={form.work_guarantee || ''} onChange={e => handleChange('work_guarantee', e.target.value)} placeholder="Misal: 6 bulan sejak selesai" />
            </Field>
          </>
        )}
      </FormSection>

      <FormSection title="Nilai Honorarium / Kontrak">
        <Field label={`Nilai ${type === 'ekstrakurikuler' ? 'Honor per Bulan' : 'Kontrak Upah'} (Rp)`} required>
          <Input type="number" value={form.total_amount || ''} onChange={e => handleChange('total_amount', Number(e.target.value))} placeholder="0" />
        </Field>
        {form.total_amount ? (
          <Field label="Terbilang">
            <div className="px-3 py-2.5 bg-indigo-50 rounded-xl text-indigo-700 text-sm font-medium border border-indigo-100">
              {getTerbilang(form.total_amount as number)} Rupiah
            </div>
          </Field>
        ) : null}
      </FormSection>

      {/* Notes */}
      <div className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-black text-slate-700 uppercase tracking-wider">Catatan Tambahan</h3>
        <Textarea value={form.notes || ''} onChange={e => handleChange('notes', e.target.value)} placeholder="Catatan atau klausul tambahan..." rows={2} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 flex-wrap">
        <button onClick={() => setActiveTab('list')} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all text-sm">
          Batal
        </button>
        <button
          onClick={handleExportCurrentFormJSON}
          title="Export data ke JSON untuk dicetak via Python ReportLab (format lebih profesional)"
          className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-700 font-bold hover:bg-emerald-50 transition-all text-sm flex items-center gap-2"
        >
          <Download size={15} /> Export JSON (Python)
        </button>
        <button
          onClick={async () => {
            await handleSave();
            if (form.party_name) {
              const saved = { ...form, id: editingId || 'preview', type } as LetterAgreement;
              handlePrint(saved);
            }
          }}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Printer size={16} />
          Simpan & Cetak PDF
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {editingId ? 'Update Surat' : 'Simpan Surat'}
        </button>
      </div>
    </motion.div>
  );

  // ─── List Render ─────────────────────────────────────────────────────────
  const renderList = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Pembuat Surat</h2>
          <p className="text-sm text-slate-500 mt-0.5">MOU / Surat Perjanjian Kerja Tenaga Sekolah</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => initForm('ekstrakurikuler')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <Users size={16} /> SPK Ekskul
          </button>
          <button
            onClick={() => initForm('tukang')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-amber-500/20 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            <HardHat size={16} /> SPK Tukang
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Cari nama atau jenis kegiatan..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>
        <div className="flex gap-1.5 bg-white/70 border border-slate-200 rounded-xl p-1">
          {(['all', 'ekstrakurikuler', 'tukang'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterType === t ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {t === 'all' ? 'Semua' : t === 'ekstrakurikuler' ? 'Ekskul' : 'Tukang'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Surat', value: letters.length, color: 'indigo', icon: FileText },
          { label: 'SPK Ekskul', value: letters.filter(l => l.type === 'ekstrakurikuler').length, color: 'blue', icon: Users },
          { label: 'SPK Tukang', value: letters.filter(l => l.type === 'tukang').length, color: 'amber', icon: HardHat },
          { label: 'Sudah Final', value: letters.filter(l => l.status === 'final').length, color: 'emerald', icon: CheckCircle2 },
        ].map(stat => (
          <div key={stat.label} className="bg-white/60 backdrop-blur border border-white/70 rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center flex-shrink-0`}>
              <stat.icon size={18} />
            </div>
            <div>
              <p className="text-2xl font-black text-slate-800">{stat.value}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center h-40 gap-3 text-indigo-400">
          <Loader2 size={24} className="animate-spin" />
          <span className="font-semibold text-sm">Memuat data...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-52 gap-4 text-slate-400">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center">
            <FileSignature size={28} />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-600">Belum ada surat</p>
            <p className="text-sm mt-1">Buat MOU/SPK baru dengan tombol di atas</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(letter => (
            <motion.div
              key={letter.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/70 backdrop-blur border border-white/80 rounded-2xl p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${letter.type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}>
                  {letter.type === 'ekstrakurikuler' ? <Users size={20} /> : <HardHat size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-800 text-sm truncate">{letter.party_name}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${letter.status === 'final' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {letter.status === 'final' ? 'Final' : 'Draft'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${letter.type === 'ekstrakurikuler' ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-700'}`}>
                      {letter.type === 'ekstrakurikuler' ? 'Ekskul' : 'Tukang'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{letter.activity_description}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1"><Hash size={10} /> {letter.letter_number}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} /> {fmtDate(letter.letter_date)}</span>
                    <span className="flex items-center gap-1"><DollarSign size={10} /> {fmt(letter.total_amount)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                  <button onClick={() => handleEdit(letter)} title="Edit" className="p-2 rounded-xl hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-colors">
                    <FilePen size={15} />
                  </button>
                  <button onClick={() => handlePrint(letter)} title="Cetak PDF (jsPDF)" className="p-2 rounded-xl hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors">
                    <Printer size={15} />
                  </button>
                  <button onClick={() => handleExportJSON(letter)} title="Export JSON untuk Python ReportLab" className="p-2 rounded-xl hover:bg-teal-50 text-slate-400 hover:text-teal-600 transition-colors">
                    <Download size={15} />
                  </button>
                  <button onClick={() => handleDelete(letter.id)} title="Hapus" className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50/70 border border-blue-200/50 rounded-2xl p-4 flex gap-3">
        <AlertCircle size={18} className="text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-700">
          <p className="font-bold mb-1">Cara Penggunaan:</p>
          <p>1. Klik <strong>SPK Ekskul</strong> atau <strong>SPK Tukang</strong> untuk membuat surat baru.</p>
          <p>2. Isi data form, lalu <strong>Simpan</strong> ke database atau langsung <strong>Simpan & Cetak PDF</strong>.</p>
          <p>3. Surat yang tersimpan bisa diedit dan dicetak ulang kapan saja.</p>
          <p className="mt-1 text-blue-500">💡 Jalankan <code className="bg-blue-100 px-1 rounded">letter_agreements_migration.sql</code> di Supabase terlebih dahulu agar data tersimpan ke database.</p>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <AnimatePresence mode="wait">
        {activeTab === 'list' && <motion.div key="list">{renderList()}</motion.div>}
        {activeTab === 'form-ekskul' && <motion.div key="ekskul">{renderForm('ekstrakurikuler')}</motion.div>}
        {activeTab === 'form-tukang' && <motion.div key="tukang">{renderForm('tukang')}</motion.div>}
      </AnimatePresence>
    </div>
  );
};

export default LetterMaker;
