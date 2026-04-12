# RKAS SDN Tempurejo 1 - Project Rules

## Context
- Ini adalah proyek manajemen keuangan sekolah (RKAS/BOSP).
- Lokasi: SD Negeri Tempurejo 1.
- Selalu prioritaskan keakuratan data nominal uang.

## Coding Standards
- Gunakan TypeScript (TSX) secara ketat.
- Lokasi file PDF Generator: @/lib/pdfGenerators.ts
- Lokasi helper/rules: @/lib/evidenceRules.ts
- Selalu gunakan fungsi `getTerbilang()` untuk format mata uang Rupiah.

## UI & Reports
- Laporan PDF harus formal, menggunakan border tabel yang jelas, dan memiliki Kop Surat resmi.
- Untuk laporan Roolstaat, pastikan kolom tanggal 1-31 ter-render dengan rapi.

## AI Behavior
- JANGAN mencari file ke seluruh folder jika saya sudah menyebutkan nama filenya.
- Langsung fokus ke fungsi yang diminta.
- Jika ada error "Context Overflow", ringkas kode dan fokus pada bagian yang bermasalah saja.
# Knowledge Base
- Fungsi `getTerbilang` SUDAH ADA di file `@/lib/evidenceRules.ts`.
- JANGAN mencari lagi atau membuat fungsi baru dengan nama yang sama.
- Langsung import saja menggunakan: `import { getTerbilang } from './evidenceRules';`