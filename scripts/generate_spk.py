"""
generate_spk.py - Generator PDF Surat Perjanjian Kerja (SPK/MOU)
Menggunakan ReportLab untuk format surat resmi pemerintah Indonesia.

Cara pakai:
    pip install reportlab
    python generate_spk.py data_surat.json

Atau panggil langsung dari kode dengan import.
"""

import sys
import json
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# ─── Helpers ──────────────────────────────────────────────────────────────────

BULAN_ID = [
    '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

SATUAN = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
          'Sepuluh', 'Sebelas']

def fmt_date(s: str) -> str:
    """Ubah YYYY-MM-DD ke format tanggal Indonesia."""
    try:
        d = datetime.strptime(s, '%Y-%m-%d')
        return f"{d.day} {BULAN_ID[d.month]} {d.year}"
    except Exception:
        return s or ''

def fmt_rupiah(n) -> str:
    """Format angka ke Rupiah."""
    try:
        return f"Rp {int(n):,.0f}".replace(',', '.')
    except Exception:
        return str(n)

def terbilang(n: int) -> str:
    """Konversi angka ke kata dalam Bahasa Indonesia."""
    n = abs(int(n))
    if n == 0:
        return 'Nol'
    if n < 12:
        return SATUAN[n]
    if n < 20:
        return terbilang(n - 10) + ' Belas'
    if n < 100:
        return terbilang(n // 10) + ' Puluh' + (' ' + terbilang(n % 10) if n % 10 else '')
    if n < 200:
        return 'Seratus' + (' ' + terbilang(n - 100) if n > 100 else '')
    if n < 1000:
        return terbilang(n // 100) + ' Ratus' + (' ' + terbilang(n % 100) if n % 100 else '')
    if n < 2000:
        return 'Seribu' + (' ' + terbilang(n - 1000) if n > 1000 else '')
    if n < 1_000_000:
        return terbilang(n // 1000) + ' Ribu' + (' ' + terbilang(n % 1000) if n % 1000 else '')
    if n < 1_000_000_000:
        return terbilang(n // 1_000_000) + ' Juta' + (' ' + terbilang(n % 1_000_000) if n % 1_000_000 else '')
    return terbilang(n // 1_000_000_000) + ' Miliar' + (' ' + terbilang(n % 1_000_000_000) if n % 1_000_000_000 else '')

# ─── Style Definitions ────────────────────────────────────────────────────────

def build_styles():
    base = getSampleStyleSheet()

    styles = {
        'kop_pemerintah': ParagraphStyle(
            'kop_pemerintah',
            fontName='Times-Roman',
            fontSize=9,
            alignment=TA_CENTER,
            leading=11,
        ),
        'kop_dinas': ParagraphStyle(
            'kop_dinas',
            fontName='Times-Roman',
            fontSize=9,
            alignment=TA_CENTER,
            leading=11,
        ),
        'kop_sekolah': ParagraphStyle(
            'kop_sekolah',
            fontName='Times-Bold',
            fontSize=14,
            alignment=TA_CENTER,
            leading=17,
            spaceAfter=1*mm,
        ),
        'kop_alamat': ParagraphStyle(
            'kop_alamat',
            fontName='Times-Roman',
            fontSize=8,
            alignment=TA_CENTER,
            leading=10,
        ),
        'judul': ParagraphStyle(
            'judul',
            fontName='Times-Bold',
            fontSize=13,
            alignment=TA_CENTER,
            leading=17,
        ),
        'subjudul': ParagraphStyle(
            'subjudul',
            fontName='Times-Bold',
            fontSize=11,
            alignment=TA_CENTER,
            leading=14,
        ),
        'nomor': ParagraphStyle(
            'nomor',
            fontName='Times-Roman',
            fontSize=10.5,
            alignment=TA_LEFT,
            leading=14,
            spaceBefore=4*mm,
        ),
        'normal': ParagraphStyle(
            'normal',
            fontName='Times-Roman',
            fontSize=10.5,
            alignment=TA_JUSTIFY,
            leading=15,
        ),
        'bold': ParagraphStyle(
            'bold',
            fontName='Times-Bold',
            fontSize=10.5,
            alignment=TA_LEFT,
            leading=14,
        ),
        'pasal_judul': ParagraphStyle(
            'pasal_judul',
            fontName='Times-Bold',
            fontSize=10.5,
            alignment=TA_CENTER,
            leading=14,
            spaceBefore=4*mm,
            spaceAfter=1*mm,
        ),
        'pasal_isi': ParagraphStyle(
            'pasal_isi',
            fontName='Times-Roman',
            fontSize=10.5,
            alignment=TA_JUSTIFY,
            leading=15,
            leftIndent=5*mm,
        ),
        'ttd_label': ParagraphStyle(
            'ttd_label',
            fontName='Times-Roman',
            fontSize=10.5,
            alignment=TA_CENTER,
            leading=14,
        ),
        'ttd_nama': ParagraphStyle(
            'ttd_nama',
            fontName='Times-Bold',
            fontSize=10.5,
            alignment=TA_CENTER,
            leading=14,
        ),
        'ttd_nip': ParagraphStyle(
            'ttd_nip',
            fontName='Times-Roman',
            fontSize=10,
            alignment=TA_CENTER,
            leading=13,
        ),
    }
    return styles

# ─── KOP SURAT ────────────────────────────────────────────────────────────────

def build_kop(data: dict, styles: dict) -> list:
    """Bangun elemen kop surat resmi sekolah."""
    story = []

    school_name = (data.get('school_name') or 'NAMA SEKOLAH').upper()
    address = data.get('school_address') or 'Alamat Sekolah'

    # Coba ambil Kabupaten/Kota dari alamat
    parts = [p.strip() for p in address.split(',')]
    city_name = parts[-2].upper() if len(parts) >= 2 else 'KABUPATEN/KOTA'

    # Tabel KOP: Logo (kiri) | Teks (tengah)
    logo_cell = [
        Paragraph('🏫', ParagraphStyle('logo', fontSize=28, alignment=TA_CENTER, leading=35)),
    ]
    text_cell = [
        Paragraph(f'PEMERINTAH {city_name}', styles['kop_pemerintah']),
        Paragraph('DINAS PENDIDIKAN DAN KEBUDAYAAN', styles['kop_dinas']),
        Paragraph(school_name, styles['kop_sekolah']),
        Paragraph(f'Alamat: {address}', styles['kop_alamat']),
    ]

    kop_table = Table(
        [[logo_cell, text_cell]],
        colWidths=[2*cm, 14.7*cm],
    )
    kop_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (0, 0), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(kop_table)

    # Garis ganda tebal di bawah kop (standar surat dinas)
    story.append(HRFlowable(width='100%', thickness=2.5, color=colors.black, spaceAfter=1))
    story.append(HRFlowable(width='100%', thickness=0.8, color=colors.black, spaceAfter=6))

    return story

# ─── IDENTITAS PIHAK ─────────────────────────────────────────────────────────

def build_pihak(label: str, rows: list, sebutan: str, styles: dict) -> list:
    """Render blok identitas Pihak I atau Pihak II."""
    story = []
    story.append(Paragraph(f'<b>{label}</b>', styles['bold']))
    story.append(Spacer(1, 1*mm))

    tabel_data = []
    for k, v in rows:
        tabel_data.append([
            Paragraph(f'<b>{k}</b>', styles['normal']),
            Paragraph('<b>:</b>', styles['normal']),
            Paragraph(str(v) if v else '-', styles['normal']),
        ])

    t = Table(tabel_data, colWidths=[4.5*cm, 0.4*cm, 10.5*cm])
    t.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 1),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
        ('LEFTPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(t)
    story.append(Spacer(1, 1.5*mm))
    story.append(Paragraph(
        f'Selanjutnya disebut sebagai <b>{sebutan}.</b>',
        styles['normal']
    ))
    story.append(Spacer(1, 3*mm))
    return story

# ─── PASAL ────────────────────────────────────────────────────────────────────

def build_pasal(no: str, judul: str, butir: list, styles: dict) -> list:
    """Render satu pasal dengan butir-butir bernomor."""
    story = []
    blok = []
    blok.append(Paragraph(f'<b>Pasal {no}</b>', styles['pasal_judul']))
    blok.append(Paragraph(f'<b>{judul}</b>', styles['pasal_judul']))

    for i, teks in enumerate(butir, 1):
        prefix = f'{i}. ' if len(butir) > 1 else ''
        blok.append(Paragraph(prefix + teks, styles['pasal_isi']))
        blok.append(Spacer(1, 1*mm))

    story.append(KeepTogether(blok))
    story.append(Spacer(1, 3*mm))
    return story

# ─── TANDA TANGAN ────────────────────────────────────────────────────────────

def build_ttd(data: dict, styles: dict, kiri_judul: str, kiri_sub: str) -> list:
    """Render blok tanda tangan dua pihak dengan kotak materai."""
    story = []
    story.append(Spacer(1, 5*mm))

    city = (data.get('school_address') or 'Tempat').split(',')[0].strip()
    tgl = fmt_date(data.get('letter_date') or '')
    story.append(Paragraph(f'{city}, {tgl}', ParagraphStyle('ttd_date', fontName='Times-Roman', fontSize=10.5, alignment=TA_CENTER)))
    story.append(Spacer(1, 3*mm))

    # Tabel tanda tangan
    materai = Table(
        [[Paragraph('Materai\nRp 10.000', ParagraphStyle('mat', fontName='Times-Roman', fontSize=8, alignment=TA_CENTER, leading=11))]],
        colWidths=[2.2*cm], rowHeights=[1.5*cm]
    )
    materai.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))

    nama2 = data.get('party_name') or '....................................'
    nik2  = data.get('party_nik') or '....................................'
    nama1 = data.get('headmaster') or '....................................'
    nip1  = data.get('headmaster_nip') or '....................................'

    kiri = [
        Paragraph(f'<b>{kiri_judul}</b>', styles['ttd_label']),
        Paragraph(kiri_sub, styles['ttd_label']),
        Spacer(1, 1*mm),
        materai,
        Spacer(1, 1.5*cm),
        Paragraph(f'<b>{nama2}</b>', styles['ttd_nama']),
        Paragraph(f'NIK. {nik2}', styles['ttd_nip']),
    ]

    materai2 = Table(
        [[Paragraph('Materai\nRp 10.000', ParagraphStyle('mat2', fontName='Times-Roman', fontSize=8, alignment=TA_CENTER, leading=11))]],
        colWidths=[2.2*cm], rowHeights=[1.5*cm]
    )
    materai2.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.5, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))

    kanan = [
        Paragraph('<b>PIHAK PERTAMA,</b>', styles['ttd_label']),
        Paragraph('Kepala Sekolah', styles['ttd_label']),
        Spacer(1, 1*mm),
        materai2,
        Spacer(1, 1.5*cm),
        Paragraph(f'<b>{nama1}</b>', styles['ttd_nama']),
        Paragraph(f'NIP. {nip1}', styles['ttd_nip']),
    ]

    ttd_table = Table([[kiri, kanan]], colWidths=[8.4*cm, 8.4*cm])
    ttd_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(ttd_table)
    return story

# ─── MAIN: SPK EKSKUL ────────────────────────────────────────────────────────

def build_spk_ekskul(data: dict, output_path: str):
    styles = build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=1.5*cm,
        bottomMargin=2*cm,
        leftMargin=2.5*cm,
        rightMargin=2*cm,
    )

    story = []

    # KOP
    story += build_kop(data, styles)

    # JUDUL dalam kotak
    judul_data = [
        [Paragraph('<b>SURAT PERJANJIAN KERJA (MOU)</b>', styles['judul'])],
        [Paragraph('<b>TENAGA PELAKSANA KEGIATAN EKSTRAKURIKULER</b>', styles['subjudul'])],
        [Paragraph(f'<b>TAHUN PELAJARAN {data.get("fiscal_year", "")}</b>',
                   ParagraphStyle('tp', fontName='Times-Bold', fontSize=10, alignment=TA_CENTER, leading=13))],
    ]
    judul_table = Table(judul_data, colWidths=[16.8*cm])
    judul_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(judul_table)
    story.append(Spacer(1, 5*mm))

    # NOMOR
    story.append(Paragraph(f'Nomor&nbsp;&nbsp;: {data.get("letter_number", "...")}', styles['nomor']))
    story.append(Spacer(1, 4*mm))

    # PEMBUKA
    story.append(Paragraph(
        f'Pada hari ini, {fmt_date(data.get("letter_date", ""))}, yang bertanda tangan di bawah ini:',
        styles['normal']
    ))
    story.append(Spacer(1, 4*mm))

    # PIHAK I
    story += build_pihak('PIHAK PERTAMA :', [
        ('N a m a', data.get('headmaster')),
        ('N I P', data.get('headmaster_nip') or '-'),
        ('Jabatan', 'Kepala Sekolah'),
        ('Unit Kerja', data.get('school_name')),
    ], 'PIHAK PERTAMA', styles)

    # PIHAK II
    rows2 = [
        ('N a m a', data.get('party_name')),
        ('N I K', data.get('party_nik') or '-'),
        ('Alamat', data.get('party_address') or '-'),
    ]
    if data.get('party_npwp'):
        rows2.append(('N P W P', data['party_npwp']))
    story += build_pihak('PIHAK KEDUA :', rows2, 'PIHAK KEDUA', styles)

    # PENGHUBUNG
    story.append(Paragraph(
        'Kedua belah pihak telah sepakat untuk mengadakan Perjanjian Kerja dengan ketentuan '
        'sebagaimana diatur dalam pasal-pasal berikut:',
        styles['normal']
    ))
    story.append(Spacer(1, 5*mm))

    # PASAL-PASAL
    total = data.get('total_amount', 0)
    story += build_pasal('1', 'RUANG LINGKUP PEKERJAAN', [
        f'PIHAK PERTAMA menugaskan PIHAK KEDUA sebagai {data.get("activity_description", "-")} di {data.get("school_name", "-")}.',
        f'Jadwal pelaksanaan kegiatan: {data.get("schedule_description", "-")}.',
        f'Jumlah peserta didik yang dibimbing sementara: ± {data.get("student_count", "-")} siswa.',
    ], styles)

    story += build_pasal('2', 'JANGKA WAKTU', [
        f'Perjanjian ini berlaku terhitung mulai tanggal {fmt_date(data.get("start_date", ""))} '
        f'sampai dengan {fmt_date(data.get("end_date", ""))}.',
        'Perjanjian dapat diperpanjang atas dasar persetujuan tertulis dari kedua belah pihak.',
    ], styles)

    story += build_pasal('3', 'HONORARIUM', [
        f'PIHAK PERTAMA memberikan honorarium kepada PIHAK KEDUA sebesar {fmt_rupiah(total)} '
        f'({terbilang(total)} Rupiah) setiap bulan.',
        'Pembayaran dilakukan setiap bulan setelah PIHAK KEDUA menyerahkan laporan pelaksanaan kegiatan '
        'dan daftar hadir peserta kepada PIHAK PERTAMA.',
        'Honorarium dikenakan Pajak Penghasilan (PPh Pasal 21) sesuai dengan peraturan perpajakan yang berlaku.',
    ], styles)

    story += build_pasal('4', 'KEWAJIBAN PIHAK KEDUA', [
        'Melaksanakan kegiatan ekstrakurikuler secara profesional, disiplin, dan bertanggung jawab sesuai jadwal yang telah ditetapkan.',
        'Membuat jurnal kegiatan dan daftar hadir peserta setiap kali pertemuan dan menyerahkannya kepada PIHAK PERTAMA.',
        'Melaporkan perkembangan kegiatan ekstrakurikuler secara berkala kepada Kepala Sekolah.',
        'Menjaga nama baik, kerahasiaan data, dan informasi sekolah, serta tidak menyebarluaskan kepada pihak yang tidak berkepentingan.',
        'Tidak menuntut diangkat sebagai Aparatur Sipil Negara (ASN) atau Pegawai Pemerintah dengan Perjanjian Kerja (PPPK).',
    ], styles)

    story += build_pasal('5', 'LARANGAN', [
        'PIHAK KEDUA dilarang merangkap jabatan yang menimbulkan konflik kepentingan.',
        'PIHAK KEDUA dilarang melakukan tindakan yang dapat mencemarkan nama baik sekolah.',
    ], styles)

    story += build_pasal('6', 'SANKSI', [
        'Apabila PIHAK KEDUA melanggar ketentuan dalam perjanjian ini, PIHAK PERTAMA berhak memberikan peringatan tertulis.',
        'Apabila setelah 3 (tiga) kali peringatan tertulis PIHAK KEDUA tetap tidak memenuhi kewajibannya, '
        'PIHAK PERTAMA berhak mengakhiri perjanjian ini tanpa memberikan kompensasi lebih lanjut.',
    ], styles)

    story += build_pasal('7', 'PENYELESAIAN PERSELISIHAN', [
        'Segala perselisihan yang timbul akibat perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
        'Apabila tidak tercapai kesepakatan, penyelesaian dilakukan sesuai dengan ketentuan hukum yang berlaku.',
    ], styles)

    story += build_pasal('8', 'PENUTUP', [
        'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, bermaterai cukup (Rp 10.000,-), '
        'masing-masing mempunyai kekuatan hukum yang sama, satu lembar untuk PIHAK PERTAMA '
        'dan satu lembar untuk PIHAK KEDUA.',
    ], styles)

    # TANDA TANGAN
    story += build_ttd(data, styles, 'PIHAK KEDUA,', 'Yang Menerima Tugas')

    doc.build(story)
    print(f'✅ PDF berhasil: {output_path}')

# ─── MAIN: SPK TUKANG ────────────────────────────────────────────────────────

def build_spk_tukang(data: dict, output_path: str):
    styles = build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=1.5*cm,
        bottomMargin=2*cm,
        leftMargin=2.5*cm,
        rightMargin=2*cm,
    )

    story = []

    story += build_kop(data, styles)

    judul_data = [
        [Paragraph('<b>SURAT PERJANJIAN KERJA (MOU)</b>', styles['judul'])],
        [Paragraph('<b>PEKERJAAN REHABILITASI GEDUNG/BANGUNAN</b>', styles['subjudul'])],
        [Paragraph(f'<b>TAHUN ANGGARAN {data.get("fiscal_year", "")}</b>',
                   ParagraphStyle('tp2', fontName='Times-Bold', fontSize=10, alignment=TA_CENTER, leading=13))],
    ]
    judul_table = Table(judul_data, colWidths=[16.8*cm])
    judul_table.setStyle(TableStyle([
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
    ]))
    story.append(judul_table)
    story.append(Spacer(1, 5*mm))

    story.append(Paragraph(f'Nomor&nbsp;&nbsp;: {data.get("letter_number", "...")}', styles['nomor']))
    story.append(Spacer(1, 4*mm))

    story.append(Paragraph(
        f'Pada hari ini, {fmt_date(data.get("letter_date", ""))}, yang bertanda tangan di bawah ini:',
        styles['normal']
    ))
    story.append(Spacer(1, 4*mm))

    story += build_pihak('PIHAK PERTAMA (Pemberi Kerja) :', [
        ('N a m a', data.get('headmaster')),
        ('N I P', data.get('headmaster_nip') or '-'),
        ('Jabatan', 'Kepala Sekolah'),
        ('Unit Kerja', data.get('school_name')),
    ], 'PIHAK PERTAMA', styles)

    rows2 = [
        ('N a m a', data.get('party_name')),
        ('N I K', data.get('party_nik') or '-'),
        ('Alamat', data.get('party_address') or '-'),
    ]
    if data.get('party_npwp'):
        rows2.append(('N P W P', data['party_npwp']))
    story += build_pihak('PIHAK KEDUA (Pelaksana Pekerjaan) :', rows2, 'PIHAK KEDUA', styles)

    story.append(Paragraph(
        'Kedua belah pihak telah sepakat untuk mengadakan perjanjian pelaksanaan pekerjaan dengan '
        'ketentuan sebagaimana diatur dalam pasal-pasal berikut:',
        styles['normal']
    ))
    story.append(Spacer(1, 5*mm))

    total = data.get('total_amount', 0)
    rab = data.get('rab_total', 0)

    story += build_pasal('1', 'JENIS DAN LINGKUP PEKERJAAN', [
        f'PIHAK PERTAMA memberikan pekerjaan kepada PIHAK KEDUA berupa: {data.get("activity_description", "-")}.',
        f'Lokasi pekerjaan: {data.get("activity_location") or data.get("school_name", "-")}.',
        f'Volume pekerjaan: {data.get("work_volume", "-")}.',
    ], styles)

    story += build_pasal('2', 'JANGKA WAKTU PELAKSANAAN', [
        f'Pekerjaan dilaksanakan terhitung mulai tanggal {fmt_date(data.get("start_date", ""))} '
        f'dan harus selesai selambat-lambatnya tanggal {fmt_date(data.get("end_date", ""))}.',
        'Apabila terjadi keterlambatan yang disebabkan oleh PIHAK KEDUA, maka akan dikenakan sanksi pengurangan nilai pembayaran.',
    ], styles)

    pasal3 = [
        f'Nilai upah tenaga yang diberikan berdasarkan perjanjian ini adalah sebesar {fmt_rupiah(total)} ({terbilang(total)} Rupiah).',
    ]
    if rab:
        pasal3.append(f'Anggaran pengadaan material bangunan (RAB) sebesar {fmt_rupiah(rab)}, diadakan terpisah melalui mekanisme pengadaan SIPLah sesuai regulasi BOSP.')
    pasal3 += [
        'Pembayaran upah dilakukan setelah pekerjaan dinyatakan selesai 100% dan telah diterima oleh PIHAK PERTAMA berdasarkan Berita Acara Penyelesaian Pekerjaan.',
        'Pembayaran dikenakan Pajak Penghasilan (PPh Pasal 21) atas upah tenaga sesuai ketentuan perpajakan yang berlaku.',
    ]
    story += build_pasal('3', 'NILAI DAN CARA PEMBAYARAN', pasal3, styles)

    story += build_pasal('4', 'KEWAJIBAN PIHAK KEDUA', [
        'Melaksanakan pekerjaan sesuai dengan spesifikasi teknis dan RAB yang telah disepakati.',
        'Menyediakan seluruh peralatan kerja, bahan habis pakai, dan tenaga kerja pendukung yang diperlukan dalam pelaksanaan pekerjaan.',
        'Membuat laporan kemajuan pekerjaan secara berkala (0%, 50%, dan 100%) disertai dokumentasi foto.',
        f'Memberikan jaminan atas kualitas hasil pekerjaan selama {data.get("work_guarantee", "6 (enam) bulan")} sejak pekerjaan dinyatakan selesai dan diterima.',
    ], styles)

    story += build_pasal('5', 'KEWAJIBAN PIHAK PERTAMA', [
        'Menyediakan akses lokasi pekerjaan dan berkoordinasi dengan PIHAK KEDUA selama pelaksanaan.',
        'Melakukan pengawasan dan pemeriksaan hasil pekerjaan secara berkala.',
        'Membayar upah kepada PIHAK KEDUA sesuai ketentuan Pasal 3 setelah pekerjaan selesai dan diterima.',
    ], styles)

    story += build_pasal('6', 'KESELAMATAN DAN KESEHATAN KERJA (K3)', [
        'PIHAK KEDUA bertanggung jawab penuh atas keselamatan dan kesehatan seluruh tenaga kerja yang terlibat dalam pelaksanaan pekerjaan.',
        'Segala risiko kecelakaan kerja yang terjadi selama pelaksanaan pekerjaan sepenuhnya menjadi tanggung jawab PIHAK KEDUA.',
        'PIHAK KEDUA wajib menggunakan Alat Pelindung Diri (APD) yang sesuai selama pelaksanaan pekerjaan.',
    ], styles)

    story += build_pasal('7', 'PEMUTUSAN PERJANJIAN', [
        'Perjanjian ini dapat diakhiri apabila PIHAK KEDUA terbukti tidak mampu atau tidak bersedia menyelesaikan pekerjaan sesuai ketentuan yang telah disepakati.',
        'Pemutusan perjanjian dilakukan dengan pemberitahuan tertulis minimal 7 (tujuh) hari kerja sebelumnya.',
    ], styles)

    story += build_pasal('8', 'PENYELESAIAN PERSELISIHAN', [
        'Segala perselisihan yang timbul dari pelaksanaan perjanjian ini diselesaikan secara musyawarah mufakat antara kedua belah pihak.',
        'Apabila tidak tercapai kesepakatan dalam musyawarah, penyelesaian dilakukan melalui jalur hukum yang berlaku.',
    ], styles)

    story += build_pasal('9', 'PENUTUP', [
        'Perjanjian ini dibuat dalam rangkap 2 (dua) lembar, masing-masing bermaterai cukup (Rp 10.000,-) '
        'dan ditandatangani oleh kedua belah pihak, sehingga mempunyai kekuatan hukum yang sama.',
    ], styles)

    story += build_ttd(data, styles, 'PIHAK KEDUA,', 'Pelaksana Pekerjaan')

    doc.build(story)
    print(f'✅ PDF berhasil: {output_path}')

# ─── CLI ENTRY POINT ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Penggunaan: python generate_spk.py <data.json> [output.pdf]')
        print()
        print('Contoh data JSON:')
        contoh = {
            "type": "tukang",
            "letter_number": "027 / SPK-REH / 419.001 / 2026",
            "letter_date": "2026-04-10",
            "fiscal_year": "2026",
            "school_name": "SD Negeri 1 Contoh",
            "school_address": "Jl. Pendidikan No. 1, Kec. Contoh, Kab. Contoh, Jawa Timur",
            "headmaster": "Nita Ekaningkarti Adji, S.Pd",
            "headmaster_nip": "19860213 201409 2 002",
            "party_name": "SIGIT DARMAWAN",
            "party_nik": "3506042210830001",
            "party_address": "Dusun Rembang RT.02 RW.04 Kec. Ngadiluwih Kab. Kediri",
            "activity_description": "Pekerjaan Rehabilitasi Dinding dan Pengecatan Kelas",
            "activity_location": "SD Negeri 1 Contoh",
            "start_date": "2026-04-10",
            "end_date": "2026-05-10",
            "total_amount": 5000000,
            "work_volume": "60 m²",
            "rab_total": 8500000,
            "work_guarantee": "6 (enam) bulan"
        }
        print(json.dumps(contoh, indent=2, ensure_ascii=False))
        sys.exit(1)

    json_path = sys.argv[1]
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    tipe = data.get('type', 'tukang')
    nama_file = data.get('party_name', 'output').replace(' ', '_')

    if len(sys.argv) >= 3:
        output = sys.argv[2]
    else:
        output = f"SPK_{tipe.upper()}_{nama_file}.pdf"

    if tipe == 'ekstrakurikuler':
        build_spk_ekskul(data, output)
    else:
        build_spk_tukang(data, output)
