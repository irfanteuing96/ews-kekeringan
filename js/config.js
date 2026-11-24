// =====================================================================
// config.js — SEMUA angka yang boleh diubah ada di sini.
// Rumus di rumus.js hanya MEMBACA nilai dari CONFIG, jadi kalau dosen
// bertanya "bagaimana kalau ambangnya diubah?", cukup ubah file ini lalu
// refresh browser.
// =====================================================================

window.CONFIG = {
  // ---------------- Lokasi studi ----------------
  lokasi: {
    nama: "Kendari, Sulawesi Tenggara",
    lat: -4.056,
    lon: 122.449,
    zoom: 16,
  },
  // Stasiun pembanding (slide Data cuaca). Data latih model = NASA POWER harian 1991–2023 di titik ini.
  stasiun: "Stasiun BMKG WMO 97150 · 4,056° LS, 122,449° BT",

  // Pembagian data model (notebook Colab, slide Validasi): dipakai untuk arsiran grafik riwayat.
  periodeModel: [
    { nama: "Latih",    dari: 1991, sampai: 2015, warna: "rgba(96,165,250,0.10)" },
    { nama: "Validasi", dari: 2016, sampai: 2020, warna: "rgba(250,204,21,0.10)" },
    { nama: "Uji",      dari: 2022, sampai: 2023, warna: "rgba(74,222,128,0.12)" },
  ],

  // Data CSV aslinya periode uji 2022–2023. Untuk skenario presentasi, tahunnya
  // DIGESER +4 sehingga tampil sebagai 2026–2027. Nilai data TIDAK diubah.
  // Isi 0 untuk kembali ke tahun aslinya.
  geserTahun: 4,

  // Prakiraan: 12 dasarian = ±4 bulan = satu musim tanam padi.
  jumlahDasarianPrakiraan: 12,
  // Dasarian tanam yang terpilih saat halaman pertama dibuka (sudah setelah digeser).
  // 2026-11-I dipilih karena fase berbunga jatuh tepat di Jan 2027 (H prediksi = 2).
  dasarianTanamAwal: "2026-11-I",

  // ---------------- Bahaya H (Subbab 3.1.6) ----------------
  // H dihitung di JavaScript dari SPI dan SPEI (kolom H di CSV tidak dipakai lagi).
  // Ambang skor indeks: skor = 1 + banyaknya ambang yang "x ≤ ambang".
  //   x > −1,00 → 1 · −1,50 < x ≤ −1,00 → 2 · −1,76 < x ≤ −1,50 → 3
  //   −2,00 < x ≤ −1,76 → 4 · x ≤ −2,00 → 5
  ambangSkorIndeks: [-1, -1.5, -1.76, -2],
  labelSkorIndeks: {
    1: "Normal / basah",
    2: "Kekeringan sedikit",
    3: "Kekeringan sedang",
    4: "Kekeringan berat",
    5: "Kekeringan ekstrem",
  },
  // Label H hasil matriks SPI × SPEI.
  labelBahaya: {
    1: "Sangat rendah",
    2: "Rendah",
    3: "Sedang",
    4: "Tinggi",
    5: "Sangat tinggi",
  },
  ambangSpiKering: -1, // garis putus-putus di grafik SPI

  // ---------------- Kerentanan V (Subbab 3.2) ----------------
  // Skor tanah dari AWC (mm/m): dibaca dari atas, ambil baris pertama yang "AWC ≥ min".
  // Di form, AWC dipilih per RENTANG (dropdown), karena skornya memang per kelas.
  //   label = teks rentang · contoh = tekstur yang biasanya masuk rentang itu (perkiraan FAO-56)
  skorAwc: [
    { min: 160, skor: 1, label: "≥ 160 mm/m", contoh: "sangat tinggi, mis. lempung berdebu" },
    { min: 130, skor: 2, label: "130–159 mm/m", contoh: "tinggi, mis. lempung" },
    { min: 100, skor: 3, label: "100–129 mm/m", contoh: "sedang" },
    { min: 70, skor: 4, label: "70–99 mm/m", contoh: "rendah, berpasir" },
    { min: 0, skor: 5, label: "< 70 mm/m", contoh: "sangat rendah, pasir" },
  ],
  // Skor tanah dari tekstur (dipakai jika AWC = null). Kunci huruf kecil.
  skorTekstur: {
    "clay": 1, "silty clay": 1,
    "silty clay loam": 2, "clay loam": 2, "silt loam": 2,
    "loam": 3, "sandy clay loam": 3, "silt": 3,
    "sandy clay": 4, "sandy loam": 4,
    "loamy sand": 5, "sand": 5,
  },
  // Skor perkolasi (mm/hari), tabel slide Vulnerability: ambil baris pertama yang "L < max".
  //   <1 sangat lambat · 1–3 lambat · 3–6 sedang · 6–12 cepat · >12 sangat cepat
  skorPerkolasi: [
    { max: 1, skor: 1 },
    { max: 3, skor: 2 },
    { max: 6, skor: 3 },
    { max: 12, skor: 4 },
    { max: Infinity, skor: 5 },
  ],
  // Bobot V = bobotVf·Vf + bobotVs·Vs
  bobotKerentanan: { vf: 0.5, vs: 0.5 },

  // Fase tanaman dari umur (HST). vs = skor sensitivitas, kc = koefisien tanaman (Subbab 3.3).
  fase: [
    { kode: "initial",     label: "Awal (initial)",          min: 0,  max: 30,  vs: 3, kc: 1.05 },
    { kode: "development", label: "Vegetatif (development)", min: 31, max: 60,  vs: 2, kc: 1.10 },
    { kode: "mid",         label: "Berbunga (mid-season)",   min: 61, max: 90,  vs: 5, kc: 1.20 },
    { kode: "late",        label: "Pemasakan (late-season)", min: 91, max: 120, vs: 3, kc: 0.90 },
  ],
  // HST > 120 (atau belum tanam) → bera / tidak ditanami.

  // ---------------- Kapasitas C (Subbab 3.3) ----------------
  faktorHujanEfektif: 0.7, // Pef = 0,7 × P  (ASUMSI, bisa diganti metode USDA-SCS nanti)
  kebutuhanMinimum: 0.001, // pencegah pembagian nol
  // Skor pasokan SP dari RPA: ambil baris pertama yang "RPA ≥ min".
  skorRpa: [
    { min: 1, skor: 5 },
    { min: 0.75, skor: 4 },
    { min: 0.5, skor: 3 },
    { min: 0.25, skor: 2 },
    { min: -Infinity, skor: 1 },
  ],
  // Skor tampungan ST dari T (hari bertahan): ambil baris pertama yang "T ≥ min".
  skorTampungan: [
    { min: 30, skor: 5 },
    { min: 20, skor: 4 },
    { min: 10, skor: 3 },
    { min: 5, skor: 2 },
    { min: -Infinity, skor: 1 },
  ],
  bobotKapasitas: { sp: 0.5, st: 0.5 },

  // ---------------- Risiko & status (Subbab 3.4) ----------------
  // Ambil baris pertama yang "R < max".
  status: [
    { max: 2,        nama: "Aman",    warna: "#22c55e" },
    { max: 5,        nama: "Waspada", warna: "#facc15" },
    { max: 10,       nama: "Siaga",   warna: "#fb923c" },
    { max: Infinity, nama: "Awas",    warna: "#ef4444" },
  ],
  statusBera: { nama: "Tidak ditanami", warna: "#64748b" },
  hMinimumPengaman: 4, // jika H ≥ 4 → status minimal "Waspada"

  // ---------------- Rekomendasi (Subbab 3.5) ----------------
  // (1) Rekomendasi utama sesuai status (teks sama dengan slide "Rekomendasi" di PPT).
  rekomendasi: {
    "Aman": "Melanjutkan budidaya serta pemantauan rutin.",
    "Waspada": "Memantau kondisi air dan mempersiapkan sumber air alternatif.",
    "Siaga": "Mengatur distribusi air dan memprioritaskan petak dengan sensitivitas tinggi.",
    "Awas": "Tidak disarankan menanam. Tetapi jika terpaksa, harus melakukan tindakan antisipasi prioritas.",
  },
  // (2) Rekomendasi tambahan mengikuti PENYEBAB risiko (tabel "Pemicu" di PPT).
  //   Hanya ditampilkan bila status minimal `pemicuMulaiStatus` (saat Aman tidak perlu tindakan tambahan).
  //   SP = skor pasokan aliran, ST = skor cadangan tampungan (keduanya dari C),
  //   Vs = sensitivitas fase, Vf = kerentanan fisik lahan (keduanya dari V).
  //   "Belum tanam" = dasarian tanam itu sendiri (umur < 10 HST).
  pemicuMulaiStatus: "Waspada",
  pemicuRekomendasi: [
    { kode: "SP", syarat: "SP ≤ 2", ambang: 2,
      teks: "Terapkan rotasi distribusi irigasi dan aktivasi sumber air alternatif (pompanisasi air tanah dangkal/sumur pantek/embung)." },
    { kode: "ST", syarat: "ST ≤ 2", ambang: 2,
      teks: "Terapkan irigasi defisit terkendali (deficit irrigation), pengetatan giliran air, dan pemanenan air hujan (embung mikro/long storage)." },
    { kode: "Vs", syarat: "Vs = 5", ambang: 5,
      teks: "Prioritaskan alokasi air penuh pada petak fase kritis (bunting/pembungaan) dan pangkas alokasi pada petak fase vegetatif/pemasakan." },
    { kode: "Vf", syarat: "Vf ≥ 4", ambang: 4,
      teks: "Perbaiki pematang untuk tekan rembesan, aplikasikan irigasi intermiten (AWD) takaran kecil tapi sering, dan tambah bahan organik/mulsa." },
    { kode: "H", syarat: "H ≥ 4 & belum tanam", ambang: 4,
      teks: "Tunda/geser jadwal tanam menyesuaikan awal hujan efektif, atau beralih ke varietas umur genjah/palawija toleran kering." },
  ],
  batasBelumTanamHst: 10, // umur < 10 HST dianggap "belum tanam" (dasarian tanam)
  ambangHujanTanam: 50, // mm/dasarian, untuk kalender tanam
  jumlahDasarianTanam: 2, // butuh 2 dasarian berturut-turut ≥ ambang

  // ---------------- Batas slider simulasi (Subbab 3.5.4) ----------------
  simulasi: {
    hujanTurun:     { min: 0, max: 50,   langkah: 5,   satuan: "%" },
    et0Naik:        { min: 0, max: 30,   langkah: 5,   satuan: "%" },
    irigasiTurun:   { min: 0, max: 100,  langkah: 10,  satuan: "%" },
    tambahEmbung:   { min: 0, max: 1000, langkah: 50,  satuan: " m³" },
    tambahJamPompa: { min: 0, max: 8,    langkah: 1,   satuan: " jam" },
  },

  // ---------------- Pengguna sasaran (slide Tujuan) ----------------
  // Tiap peran hanya melihat bagian yang ia perlukan. Ini PROTOTIPE tampilan,
  // belum ada login/kata sandi. Kunci "bagian" = atribut data-bagian di index.html.
  peran: [
    { kode: "petani",   nama: "Petani",
      bagian: ["input", "ringkasan", "tabel", "cuaca", "wa", "laporan"],
      keterangan: "Isi data lahan, baca status & saran, kirim laporan kondisi sawah." },
    { kode: "p3a",      nama: "Kelompok Tani / P3A",
      bagian: ["input", "ringkasan", "tabel", "cuaca", "simulasi", "wa", "laporan"],
      keterangan: "Atur giliran air: + simulasi skenario pasokan, embung, pompa." },
    { kode: "penyuluh", nama: "Penyuluh Pertanian",
      bagian: ["input", "ringkasan", "tabel", "cuaca", "riwayat", "simulasi", "wa", "grafik", "laporan", "rekapLaporan"],
      keterangan: "Pendampingan: + grafik SPI/SPEI/H, riwayat data latih, rekap laporan lapangan." },
    { kode: "admin",    nama: "Administrator",
      bagian: ["input", "ringkasan", "tabel", "cuaca", "riwayat", "simulasi", "wa", "grafik", "kinerja", "laporan", "rekapLaporan", "kelolaLaporan"],
      keterangan: "Semua bagian: + kinerja model, hapus & ekspor laporan." },
  ],
  peranAwal: "admin",

  // ---------------- Laporan lapangan (umpan balik → validasi model) ----------------
  // Kondisi sawah yang dilihat langsung di lapangan. "tingkat" disamakan dengan
  // urutan status (0 Aman … 3 Awas) supaya bisa dibandingkan dengan status prediksi.
  kondisiLapangan: [
    { tingkat: 0, nama: "Air cukup",     ciri: "Tanah basah/tergenang, tanaman segar" },
    { tingkat: 1, nama: "Mulai kering",  ciri: "Tanah lembap tanpa genangan, retak halus" },
    { tingkat: 2, nama: "Kering",        ciri: "Tanah retak, daun mulai menggulung siang hari" },
    { tingkat: 3, nama: "Sangat kering", ciri: "Retak lebar, daun mengering, ancaman puso" },
  ],
};
