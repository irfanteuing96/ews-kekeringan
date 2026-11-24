# Dashboard Peringatan Dini Kekeringan Sawah – Kendari

Prototipe dashboard untuk tugas kuliah. Pengguna mengisi **data lahan** (tanah + sumber air) dan memilih
**dasarian tanam**, lalu klik **Generate**. Dashboard menghitung kondisi **12 dasarian (≈ 4 bulan, satu musim
tanam padi)** ke depan: skor bahaya H, kerentanan V, kapasitas C, risiko R, status, dan rekomendasi tiap dasarian.
Lokasi: satu wilayah sawah di Kendari, Sulawesi Tenggara (titik data iklim −4,056 ; 122,449).

## Cara membuka

1. **Double-click `index.html`**. Tidak perlu server atau instalasi apa pun.
2. Butuh internet untuk Leaflet, Chart.js, font, dan citra satelit (lewat CDN).
3. Tekan `F12` → tab *Console* untuk memastikan tidak ada error.

## Cara pakai

1. **① Data lahan & waktu tanam**: isi nama wilayah, dasarian tanam, tekstur tanah / AWC,
   perkolasi (→ dipakai menghitung **V**), lalu irigasi, embung, pompa (→ dipakai menghitung **C**).
2. Klik **⚡ Generate prakiraan 12 dasarian**.
3. **② Kondisi per dasarian**: tabel 12 baris. Klik satu baris untuk melihat rincian hitungan dan rekomendasinya
   di panel kanan. Peta dan grafik ikut menandai baris yang dipilih.
   - **Data cuaca dasarian terpilih**: enam data cuaca (hujan P, Tmax, Tmin, RH, angin u₂, radiasi Rs) + ET₀ dan
     neraca D = P − ET₀ dari Excel (NASA POWER), beserta SPI-3/SPEI-3 yang dihasilkannya.
   - **Curah hujan & ET₀ per dasarian**: hujan observasi (batang), prediksi RF, ET₀ prediksi, normal BMKG, ambang tanam 50 mm.
   - **Tabel data cuaca 12 dasarian**: semua variabel + pembanding stasiun BMKG, normal BMKG 1991–2020,
     dan prakiraan kategori BMKG (PMH 2026/2027).
4. **③ Simulasi skenario**: geser slider (hujan turun, ET₀ naik, irigasi turun, tambah embung, tambah jam pompa).
   Ke-12 dasarian dihitung ulang dan terlihat ΔR-nya. Tombol *Reset* mengembalikan ke kondisi awal.
5. **Pratinjau WhatsApp**: ringkasan peringatan satu musim tanam (hanya pratinjau, tidak dikirim).
6. **④ Laporan lapangan**: petani/P3A/penyuluh melaporkan kondisi sawah sebenarnya untuk satu dasarian
   (Air cukup · Mulai kering · Kering · Sangat kering). Laporan disimpan di browser (localStorage) bersama status
   prediksi saat itu. Kartu **Rekap laporan vs prediksi** menghitung % sesuai, "prediksi terlalu ringan"
   (kekeringan terlewat) dan "terlalu berat" (alarm palsu). Ini umpan balik untuk validasi & tuning ulang model.
   Admin bisa menghapus dan **mengekspor CSV**.
7. **👤 Masuk sebagai** (kanan atas): pilih peran pengguna sasaran. Tampilan menyesuaikan:

   | Peran | Yang terlihat |
   |---|---|
   | Petani | form lahan, ringkasan, tabel + saran, data cuaca, WA, kirim laporan |
   | Kelompok Tani / P3A | + simulasi skenario (atur giliran air) |
   | Penyuluh | + grafik SPI/SPEI/H, riwayat SPI/SPEI 1991–2023, rekap laporan |
   | Administrator | semua, + kinerja model, hapus/ekspor laporan |

   Ini prototipe tampilan, **belum ada login**. Daftar bagian per peran diatur di `config.js` → `peran`.

### Rekomendasi (sesuai slide "Rekomendasi" di PPT)
- **Utama, per status**: Aman "Melanjutkan budidaya serta pemantauan rutin" · Waspada "Memantau kondisi air dan
  mempersiapkan sumber air alternatif" · Siaga "Mengatur distribusi air dan memprioritaskan petak dengan
  sensitivitas tinggi" · Awas "Tidak disarankan menanam. Tetapi jika terpaksa, harus melakukan tindakan antisipasi prioritas".
- **Tambahan, mengikuti penyebab risiko** (muncul bila status minimal Waspada), lihat `cariPemicu()` di `rumus.js`:
  SP ≤ 2 (pasokan kurang) · ST ≤ 2 (tampungan kurang) · Vs = 5 (fase berbunga) · Vf ≥ 4 (tanah boros air) ·
  H ≥ 4 & belum tanam (umur < 10 HST). Teks sarannya di `config.js` → `pemicuRekomendasi`.

## Isi folder

| File | Fungsi |
|---|---|
| `index.html` | Kerangka halaman: form, ringkasan, tabel, detail, peta, simulasi, WA, grafik. |
| `css/style.css` | Tampilan (tema gelap navy, aksen hijau padi, responsif). |
| `js/config.js` | **Semua angka yang bisa diubah**: geser tahun, jumlah dasarian prakiraan, ambang skor, bobot, Kc, skor fase, faktor hujan efektif, warna status. |
| `js/rumus.js` | **Semua rumus** H, V, C, R, status, rekomendasi, simulasi, dan `buatPrakiraan()` (12 dasarian). Fungsi murni, tiap fungsi diberi komentar + nomor subbab. |
| `js/data-hazard.js` | Data per dasarian: cuaca (Excel) + SPI/SPEI/prediksi RF (CSV Colab) + riwayat 1991–2023 + BMKG. Dibuat otomatis, jangan diedit manual. |
| `js/data-lahan.js` | Nilai awal form + poligon wilayah di peta (**dummy**). |
| `js/app.js` | Tampilan: form, tabel, data cuaca, peta Leaflet, grafik Chart.js, simulasi, pesan WA. Tidak ada rumus di sini. |
| `data-excel/Data_Variabel_Hazard_Kendari.xlsx` | Excel data cuaca dari kelompok (NASA POWER 1991–2023, stasiun BMKG 2022–2023, BMKG SULTRA_13). |
| `data-excel/Data_Variabel_Hazard_Kendari_UPDATE.xlsx` | **Excel update**: semua sheet asli (rumus tetap) + SPI/SPEI/H observasi 1991–2023, prediksi RF uji & validasi, metrik model, data dashboard 2026–2027. |
| `data-csv/` | CSV keluaran notebook Colab (`hazard_*`, `prediksi_*`) + `indeks_observasi_1991_2023.csv`. Versi lama (SPEI fisk.fit) di `arsip-spei-lama/`. |
| `alat/konversi_data.py` | Excel + CSV → `js/data-hazard.js`. |
| `alat/buat_excel_update.py` | Membuat Excel update (butuh Microsoft Excel). |
| `alat/replika_colab.py` | Salinan kode notebook Colab, hanya dipakai bila CSV Colab tidak bisa diunduh. |

## Alur data

```
Excel NASA POWER 1991–2023 ──► Colab (Python): Random Forest 300 pohon, prediksi P & D
                               → SPI-3 (Gamma) & SPEI-3 (log-logistik L-moment) ── CSV
        ▼                                                                   ▼
alat/konversi_data.py ──► js/data-hazard.js (cuaca, SPI, SPEI, P/ET₀ prediksi, riwayat, BMKG)
                                 │
Form data lahan (V & C) ────────►│   js/config.js (ambang, bobot)
                                 ▼
             js/rumus.js  buatPrakiraan(): untuk tiap dari 12 dasarian
             H dari SPI×SPEI → HST → fase → V, C → R = H×V/C → status → rekomendasi
                                 ▼
             js/app.js  (tabel, detail, peta, simulasi, WA, grafik)
```

Kenapa CSV diubah jadi `.js`? Browser **melarang** `fetch()` file lokal saat halaman dibuka dengan
double-click (`file://`). File `<script>` biasa tetap boleh, jadi data "ditanam" sebagai variabel global.

## Ringkasan rumus (detail lengkap di komentar `js/rumus.js`)

| Komponen | Rumus | Subbab |
|---|---|---|
| Umur tanaman | HST = tanggal dasarian − tanggal tanam (tanggal tanam = awal dasarian tanam) | 3.2 |
| Bahaya H | skor SPI & skor SPEI (1–5) → H = ⌈(skorSPI + skorSPEI)/2⌉ (matriks 5×5). Kolom `H_rf`/`H_obs` di CSV tidak dipakai | 3.1.6 |
| Kerentanan V | Vf = (St + Sp)/2 ; V = 0,5·Vf + 0,5·Vs (Vs dari fase). Perkolasi: <1 → 1, 1–3 → 2, 3–6 → 3, 6–12 → 4, >12 → 5 | 3.2 |
| Kapasitas C | SP dari RPA = (irigasi + Ialt)/kebutuhan ; ST dari T = embung/(10·A·d) ; C = 0,5·SP + 0,5·ST | 3.3 |
| Risiko R | R = (H × V) / C | 3.4 |
| Status | H=1 → Aman; R<2 Aman, 2–<5 Waspada, 5–<10 Siaga, ≥10 Awas; H≥4 minimal Waspada | 3.4 |
| Simulasi | ΔR = (R_skenario − R_awal)/R_awal × 100% | 3.5.4 |

## ⚠️ Catatan jujur soal data

1. **Tahun digeser +4.** Data aslinya periode uji 2022–2023 (dan validasi 2016–2020). Untuk skenario presentasi,
   label tahunnya ditampilkan sebagai 2026–2027 (validasi 2020–2024). **Nilai datanya tidak diubah sama sekali.**
   Pengaturannya di `config.js` → `geserTahun: 4` (isi 0 untuk kembali ke tahun asli).
2. **Hujan, ET₀, dan cuaca sudah data asli** dari `data-excel/Data_Variabel_Hazard_Kendari.xlsx`
   (sheet *Dasarian NASA POWER*). Hujan & ET₀ prediksi = keluaran Random Forest (Colab memprediksi P dan D; ET₀ = P − D).
3. **Model RF memprediksi 1 dasarian (10 hari) ke depan.** Tabel 12 dasarian menyusun prediksi per dasarian itu
   menjadi gambaran satu musim. Dalam pemakaian nyata, tiap baris diperbarui setiap 10 hari saat data baru masuk.
4. **Data lahan dummy.** Nilai awal form sengaja dibuat cukup rentan (tanah pasir berlempung, tanpa pompa/embung)
   supaya saat demo muncul status Siaga.
5. **H prediksi maksimal 2** di seluruh data uji (Jan 2027 setelah digeser), padahal H observasi di 2027-01-I/II
   mencapai 4. Ini sesuai temuan "recall masih rendah" di PPT. Nilai awal dasarian tanam 2026-11-I sengaja dipilih
   supaya fase berbunga jatuh di 2027-01-II/III (status Siaga).
6. **SPEI sekarang versi L-moment** (sama dengan notebook Colab terbaru): rata-rata ≈ 0, simpangan ≈ 1. Masalah lama
   (SPEI berpusat di 1 dan nilai −4,75 dari `fisk.fit`) sudah hilang. CSV lama disimpan di `data-csv/arsip-spei-lama/`.
7. **Angka RF identik dengan Colab.** CSV di `data-csv/` dibuat dengan kode notebook yang sama dan scikit-learn 1.6.1
   (versi Colab), karena runtime Colab sedang tidak tersambung. Hasilnya sama dengan output notebook: MAE uji SPI RF
   0,2897, SPEI 0,2955; validasi 0,4253 / 0,4177; recall SPI 1/5, SPEI 2/7. Bila ingin memakai file langsung dari Colab,
   timpa CSV dengan nama yang sama lalu jalankan konversi (di bawah).
8. **H di dashboard memakai matriks PPT** (⌈(skor SPI + skor SPEI)/2⌉), bukan aturan H di notebook Colab
   (kelas −1/−1,5/−2). Kedua versi tersedia di Excel update sebagai pembanding.

## Cara mengganti data dengan data asli

**Data cuaca / prediksi:**
1. Jalankan notebook Colab, unduh `hazard_2022_2023.csv`, `hazard_validasi_2016_2020.csv`,
   `prediksi_test_2022_2023.csv`, `prediksi_validasi_2016_2020.csv` ke `data-csv/` (timpa).
   (Alternatif tanpa Colab: `alat/replika_colab.py`, lihat komentar di dalamnya.)
2. Bila Excel berubah, simpan di `data-excel/Data_Variabel_Hazard_Kendari.xlsx`.
3. Jalankan (butuh `pip install pandas openpyxl`):

```powershell
python alat/konversi_data.py
```

4. Excel update dibuat ulang dengan `python alat/buat_excel_update.py` (butuh Microsoft Excel).

**Data lahan:** cukup isi di form. Untuk mengganti nilai awal dan bentuk poligon di peta, edit `js/data-lahan.js`
(poligon bisa digambar di [geojson.io](https://geojson.io), urutan titik `[lat, lon]`).

## Contekan presentasi

| Pertanyaan dosen | Jawaban singkat |
|---|---|
| **Datanya dari mana?** | Data harian NASA POWER 1991–2023 di titik Kendari (hujan, Tmax, Tmin, RH, angin, radiasi) dijumlah per dasarian; ET₀ dihitung FAO-56 Penman-Monteith di Excel. Random Forest di Colab memprediksi hujan P dan neraca D satu dasarian ke depan, lalu diubah jadi SPI-3 & SPEI-3. Stasiun BMKG WMO 97150 dan normal/prakiraan BMKG dipakai sebagai pembanding. Data lahan diisi pengguna lewat form. |
| **Mana data cuaca yang dipakai training?** | Bagian *Data cuaca* menampilkan P, Tmax, Tmin, RH, u₂, Rs, ET₀, D per dasarian; grafik *Riwayat SPI-3 & SPEI-3 1991–2023* menunjukkan periode latih (1991–2015), validasi (2016–2020), dan uji (2022–2023). |
| **Seberapa bagus modelnya?** | Tabel *Kinerja model* (sama dengan slide Validasi): MAE uji SPI 0,2897 & SPEI 0,2955, terkecil dibanding persistence dan climatology. Tetapi recall masih rendah (SPI 1 dari 5, SPEI 2 dari 7 kejadian kering terdeteksi), jadi model cenderung terlambat menangkap kekeringan. |
| **Bagaimana menghitung H?** | Dua langkah (Subbab 3.1.6). (1) SPI dan SPEI masing-masing diberi skor: > −1 → 1 (normal/basah), −1,5 < x ≤ −1 → 2 (sedikit), −1,76 < x ≤ −1,5 → 3 (sedang), −2 < x ≤ −1,76 → 4 (berat), ≤ −2 → 5 (ekstrem). (2) H = rata-rata kedua skor, **dibulatkan ke atas** (matriks 5×5 di panel detail). Contoh: SPI −1,89 (skor 4), SPEI 0,68 (skor 1) → H = ⌈5/2⌉ = 3 (Sedang). Label H: 1 Sangat rendah · 2 Rendah · 3 Sedang · 4 Tinggi · 5 Sangat tinggi. |
| **Kenapa pakai SPI dan SPEI sekaligus?** | SPI hanya melihat hujan; SPEI juga memperhitungkan penguapan (ET₀). Digabung supaya kekeringan karena kurang hujan maupun karena panas/penguapan tinggi sama-sama tertangkap. Dibulatkan ke atas supaya peringatan cenderung waspada (lebih baik alarm daripada terlambat). |
| **Kenapa tidak pakai kolom H dari Python?** | Aturan H diperbarui menjadi matriks SPI × SPEI dan dihitung di dashboard (`skorIndeks`, `skorBahaya` di `rumus.js`), supaya ambangnya bisa diubah di `config.js` tanpa menjalankan ulang Python. Hasilnya dicek: sebaran H observasi uji 1=61, 2=6, 4=2 dan akurasi H prediksi 87,0% (lihat Console). |
| **Kenapa tahunnya 2026–2027?** | Ini skenario presentasi: data uji model diputar sebagai musim tanam mendatang. Nilainya asli dari model, hanya labelnya digeser 4 tahun (`geserTahun` di config). |
| **Kenapa 12 dasarian?** | Umur padi ±120 hari ≈ 4 bulan ≈ 12 dasarian, jadi satu musim tanam penuh dari tanam sampai menjelang panen. |
| **Kenapa V dan C berubah tiap dasarian padahal inputnya sama?** | V bergantung pada **fase** tanaman (umur bertambah tiap dasarian; fase berbunga paling peka, Vs = 5). C bergantung pada **hujan dan ET₀** dasarian itu (kebutuhan air berubah) dan Kc fase. |
| **Kenapa R dibagi C?** | Kapasitas (irigasi, pompa, embung) **mengurangi** risiko. Bahaya dan kerentanan memperbesar (dikali), kapasitas memperkecil (pembagi). Coba isi pompa/embung lalu Generate: R turun. |
| **Kenapa ada baris R = 2,33 tapi Aman?** | Kalau H = 1 (SPI dan SPEI sama-sama > −1, bahaya sangat rendah), status otomatis Aman, sesuai aturan Subbab 3.4. |
| **Bagaimana menentukan fase tanaman?** | HST = tanggal dasarian − tanggal tanam. 0–30 initial, 31–60 development, 61–90 mid-season (berbunga), 91–120 late-season. Fungsi `hitungHST` dan `tentukanFase` di `rumus.js`. |
| **Apa bedanya dengan monitoring biasa?** | Tiga "uji digital": (1) **data otomatis** per dasarian; (2) **ada prediksi** ke depan dari model RF; (3) **bisa simulasi** "bagaimana jika" dan langsung terlihat ΔR. |
| **Apa yang terjadi kalau ambang diubah?** | Ubah `js/config.js` lalu refresh. Rumus tidak disentuh. Misalnya ambang Siaga diturunkan dari 5 ke 4 → lebih sensitif, tapi lebih banyak alarm palsu. |
| **Bagaimana nanti agar data masuk otomatis?** | Jadwalkan skrip Python (cron/GitHub Actions) yang tiap dasarian mengambil data NASA POWER, menjalankan model RF, menyimpan JSON ke server. Dashboard tinggal `fetch()` JSON itu (perlu hosting). Notifikasi lewat WhatsApp Business API. |
| **Kenapa saran tambahan hanya muncul saat Waspada ke atas?** | Saat Aman tidak perlu tindakan tambahan. Pemicu mencari *penyebab* risiko (pasokan, tampungan, fase, tanah, bahaya saat tanam) supaya saran tepat sasaran. Batasnya di `config.js` → `pemicuMulaiStatus`. |
| **Laporan lapangan dipakai untuk apa?** | Sesuai diagram alur: umpan balik → validasi & tuning ulang model. Kalau banyak "prediksi terlalu ringan", ambang kelas kering atau model RF perlu dituning (recall masih rendah). Data bisa diekspor CSV untuk tim model. |
| **Pef 0,7 dari mana?** | Asumsi: 70% hujan dianggap efektif untuk tanaman. Ada di `config.js` (`faktorHujanEfektif`). |

### Contoh hitung tangan (nilai awal form, baris 8: 2027-01-II)

Lahan: sandy loam (AWC kosong), perkolasi 7, irigasi 3, tanpa pompa & embung. Tanam 1 Nov 2026.
(Luas A = 5 ha tidak diisi di form; nilainya tetap di `js/data-lahan.js` karena dipakai rumus Ialt dan T.)

- HST = 11 Jan 2027 − 1 Nov 2026 = **71 HST** → mid-season (berbunga).
- SPI prediksi −1,238 → skor 2 · SPEI prediksi −1,176 → skor 2 → **H = ⌈(2+2)/2⌉ = 2** (Rendah).
- St = 4 (sandy loam), Sp = 4 (perkolasi 7, kelas 6–12) → Vf = 4 ; Vs = 5 → **V = 0,5×4 + 0,5×5 = 4,5**
- ET₀ prediksi = 37,2/10 = 3,72 ; ETc = 1,2 × 3,72 = 4,46 ; Pef = 0,7 × 54,8/10 = 3,84
- Ialt = 0 ; kebutuhan = 4,46 + 7 − 3,84 = 7,63 ; RPA = 3/7,63 = 0,39 → SP = 2
- d = 7,63 − 3 = 4,63 > 0, tidak ada embung → ST = 1 → **C = 0,5×2 + 0,5×1 = 1,5**
- **R = (2 × 4,5)/1,5 = 6 → Siaga**, + 4 saran tambahan karena SP = 2 ≤ 2, ST = 1 ≤ 2, Vs = 5, Vf = 4 ≥ 4
- Skenario hujan turun 50% + irigasi turun 100%: SP = 1, ST = 1 → C = 1 → R = 9 (masih Siaga), ΔR = +50%.
