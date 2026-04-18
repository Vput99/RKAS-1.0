export const formatRupiah = (num: number) => 
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

export const getTerbilang = (nilai: number): string => {
    const angka = Math.abs(nilai);
    const baca = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
    let terbilang = "";
    if (angka < 12) terbilang = " " + baca[angka];
    else if (angka < 20) terbilang = getTerbilang(angka - 10) + " Belas";
    else if (angka < 100) terbilang = getTerbilang(Math.floor(angka / 10)) + " Puluh " + getTerbilang(angka % 10);
    else if (angka < 200) terbilang = " Seratus " + getTerbilang(angka - 100);
    else if (angka < 1000) terbilang = getTerbilang(Math.floor(angka / 100)) + " Ratus " + getTerbilang(angka % 100);
    else if (angka < 2000) terbilang = " Seribu " + getTerbilang(angka - 1000);
    else if (angka < 1000000) terbilang = getTerbilang(Math.floor(angka / 1000)) + " Ribu " + getTerbilang(angka % 1000);
    else if (angka < 1000000000) terbilang = getTerbilang(Math.floor(angka / 1000000)) + " Juta" + getTerbilang(angka % 1000000);
    return terbilang.trim();
};

export const getCityName = (profile: any, includePrefix = false) => {
    let c = profile?.city || ''; if (!c) return 'Tempat';
    const titleCase = c.toLowerCase().replace(/(?:^|\s)\w/g, (m: string) => m.toUpperCase());
    if (includePrefix) return titleCase;
    return titleCase.replace(/^(Kota|Kabupaten|Kab\.?)\s*/i, '') || 'Tempat';
};
