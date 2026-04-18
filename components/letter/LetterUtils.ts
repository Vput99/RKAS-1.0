import { SchoolProfile, LetterAgreement } from '../../types';

export const fmt = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);

export const getTerbilang = (nilai: number): string => {
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

export const fmtDate = (s: string) => {
  if (!s) return '';
  try { return new Date(s).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch { return s; }
};

export const defaultForm = (profile: SchoolProfile | null, type: 'ekstrakurikuler' | 'tukang'): Partial<LetterAgreement> => {
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
