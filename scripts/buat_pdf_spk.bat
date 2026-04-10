@echo off
echo ================================================
echo  Generator PDF Surat Perjanjian Kerja (SPK/MOU)
echo  Menggunakan ReportLab (format surat resmi)
echo ================================================
echo.

REM Install ReportLab jika belum ada
echo [1/3] Memeriksa/Install ReportLab...
pip install reportlab -q
if errorlevel 1 (
    echo GAGAL install ReportLab. Pastikan Python sudah terinstal.
    pause
    exit /b 1
)
echo     ReportLab siap!
echo.

REM Cek apakah ada argumen file JSON
if "%~1"=="" (
    echo [2/3] Menjalankan contoh dengan data contoh_data_spk.json...
    python scripts\generate_spk.py scripts\contoh_data_spk.json scripts\OUTPUT_CONTOH.pdf
) else (
    echo [2/3] Membuat PDF dari: %~1
    python scripts\generate_spk.py %~1 %~2
)

if errorlevel 1 (
    echo.
    echo GAGAL membuat PDF.
    pause
    exit /b 1
)

echo.
echo [3/3] Selesai! Membuka PDF...
if "%~2"=="" (
    start scripts\OUTPUT_CONTOH.pdf
) else (
    start %~2
)

pause
