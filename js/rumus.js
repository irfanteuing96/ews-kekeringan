// =====================================================================
// rumus.js — SEMUA rumus H, V, C, R, status, rekomendasi.
// Fungsi di sini "murni": hanya menerima angka/objek dan mengembalikan
// hasil. Tidak menyentuh HTML (DOM), jadi mudah dicek dengan tangan.
// Angka ambang/bobot dibaca dari window.CONFIG (js/config.js).
// =====================================================================

(function () {
  const CFG = () => window.CONFIG;

  // -------------------------------------------------------------------
  // Utilitas kecil
  // -------------------------------------------------------------------

  // Format angka gaya Indonesia (koma desimal). Contoh: 4.25 → "4,25"
  function formatAngka(x, desimal = 2) {
    if (x === null || x === undefined || Number.isNaN(x)) return "–";
    if (!Number.isFinite(x)) return "∞";
    return Number(x).toLocaleString("id-ID", { maximumFractionDigits: desimal, minimumFractionDigits: 0 });
  }

  // Cari skor dari tabel ambang "nilai ≥ min" (tabel diurut dari min terbesar).
  function skorDariMin(nilai, tabel) {
    return tabel.find((baris) => nilai >= baris.min).skor;
  }

  // Cari skor dari tabel ambang "nilai < max" (tabel diurut dari max terkecil).
  function skorDariMax(nilai, tabel) {
    return tabel.find((baris) => nilai < baris.max).skor;
  }

  // -------------------------------------------------------------------
  // BAHAYA H — Subbab 3.1.6
  // -------------------------------------------------------------------

  // Subbab 3.1.6 (langkah 1) — Skor satu indeks kekeringan (SPI atau SPEI), 1–5:
  //   x > −1,00 → 1 (normal/basah) · −1,50 < x ≤ −1,00 → 2 · −1,76 < x ≤ −1,50 → 3
  //   −2,00 < x ≤ −1,76 → 4 · x ≤ −2,00 → 5
  // Caranya: mulai dari 1, tambah 1 untuk setiap ambang yang dilewati (x ≤ ambang).
  function skorIndeks(x) {
    return 1 + CFG().ambangSkorIndeks.filter((ambang) => x <= ambang).length;
  }

  // Subbab 3.1.6 (langkah 2) — Matriks SPI × SPEI:
  //   H = ROUNDUP((skorSPI + skorSPEI) / 2)  → dibulatkan ke ATAS
  // Contoh: SPI −1,89 (skor 4), SPEI 0,68 (skor 1) → H = ⌈5/2⌉ = 3
  function skorBahaya(spi, spei) {
    return Math.ceil((skorIndeks(spi) + skorIndeks(spei)) / 2);
  }

  // Teks langkah hitung H untuk panel detail.
  function langkahBahaya(spi, spei) {
    const sSpi = skorIndeks(spi);
    const sSpei = skorIndeks(spei);
    const H = skorBahaya(spi, spei);
    return `SPI ${formatAngka(spi)} → skor ${sSpi} · SPEI ${formatAngka(spei)} → skor ${sSpei} · ` +
      `H = ⌈(${sSpi}+${sSpei})/2⌉ = ${H} (${CFG().labelBahaya[H]})`;
  }

  // H untuk satu baris data. jenis = "rf", "obs", "persistensi", atau "klimatologi".
  function bahayaBaris(baris, jenis) {
    return skorBahaya(baris["spi_" + jenis], baris["spei_" + jenis]);
  }

  // -------------------------------------------------------------------
  // Waktu: dasarian → tanggal, umur tanaman (HST), fase
  // -------------------------------------------------------------------

  // Ubah kunci dasarian "2023-01-III" menjadi tanggal awal dasarian.
  // Dasarian I = tgl 1, II = tgl 11, III = tgl 21.
  function tanggalDasarian(kunci) {
    const [tahun, bulan, romawi] = kunci.split("-");
    const hari = { I: 1, II: 11, III: 21 }[romawi];
    return new Date(Number(tahun), Number(bulan) - 1, hari);
  }

  // Geser tahun pada kunci dasarian. Contoh geser 4: "2022-01-I" → "2026-01-I".
  // Hanya LABEL waktu yang berubah, nilai SPI/SPEI/H tetap.
  function geserKunciDasarian(kunci, tahun) {
    const [t, bulan, romawi] = kunci.split("-");
    return `${Number(t) + tahun}-${bulan}-${romawi}`;
  }

  // Ubah objek Date menjadi teks "YYYY-MM-DD" (zona waktu lokal).
  function teksTanggal(tanggal) {
    const dua = (n) => String(n).padStart(2, "0");
    return `${tanggal.getFullYear()}-${dua(tanggal.getMonth() + 1)}-${dua(tanggal.getDate())}`;
  }

  // Hitung HST (Hari Setelah Tanam) = tanggal dasarian − tanggal tanam.
  // tanggalTanam boleh berupa 1 tanggal atau daftar musim tanam; dipakai
  // tanggal tanam TERAKHIR yang sudah lewat (≤ tanggal dasarian).
  function hitungHST(tanggalTanam, tanggal) {
    const daftar = (Array.isArray(tanggalTanam) ? tanggalTanam : [tanggalTanam])
      .map((t) => new Date(t + "T00:00:00"))
      .filter((t) => t <= tanggal)
      .sort((a, b) => b - a);
    if (daftar.length === 0) return { hst: null, tanggalTanam: null };
    const hst = Math.round((tanggal - daftar[0]) / 86400000);
    return { hst, tanggalTanam: daftar[0] };
  }

  // Subbab 3.2.3 — Tentukan fase dari HST:
  // initial 0–30, development 31–60, mid-season 61–90, late-season 91–120, >120 = bera.
  function tentukanFase(hst) {
    if (hst === null || hst < 0) return null;
    return CFG().fase.find((f) => hst >= f.min && hst <= f.max) || null; // null = bera
  }

  // -------------------------------------------------------------------
  // KERENTANAN V — Subbab 3.2
  // -------------------------------------------------------------------

  // Subbab 3.2.1 — Skor tanah St. Pakai AWC (mm/m) bila ada; kalau null pakai tekstur.
  // Dari form, awc_mm_per_m = batas bawah rentang yang dipilih (mis. 130 untuk "130–159 mm/m").
  function skorTanah(petak) {
    if (petak.awc_mm_per_m !== null && petak.awc_mm_per_m !== undefined) {
      const kelas = CFG().skorAwc.find((b) => petak.awc_mm_per_m >= b.min);
      return { skor: kelas.skor, dasar: `AWC ${kelas.label}` };
    }
    const skor = CFG().skorTekstur[String(petak.tekstur).toLowerCase()] ?? 3;
    return { skor, dasar: `tekstur ${petak.tekstur} (AWC tidak diketahui)` };
  }

  // Subbab 3.2.2 — Skor perkolasi Sp (mm/hari): <1→1, 1–<3→2, 3–<6→3, 6–<12→4, ≥12→5.
  // Perkolasi tetap diisi ANGKA karena nilainya juga dipakai di kebutuhan air (L) pada C.
  function skorPerkolasi(perkolasiMmHari) {
    return skorDariMax(perkolasiMmHari, CFG().skorPerkolasi);
  }

  // Subbab 3.2 — Kerentanan total:
  //   Vf = (St + Sp) / 2         (faktor fisik lahan)
  //   Vs = skor sensitivitas fase
  //   V  = 0,5·Vf + 0,5·Vs
  function hitungKerentanan(petak, fase) {
    const tanah = skorTanah(petak);
    const St = tanah.skor;
    const Sp = skorPerkolasi(petak.perkolasi_mm_hari);
    const Vf = (St + Sp) / 2;
    const Vs = fase.vs;
    const b = CFG().bobotKerentanan;
    const V = b.vf * Vf + b.vs * Vs;
    const f = formatAngka;
    return {
      St, Sp, Vf, Vs, V,
      langkah: [
        `St = ${St} (dari ${tanah.dasar})`,
        `Sp = ${Sp} (perkolasi ${f(petak.perkolasi_mm_hari)} mm/hari)`,
        `Vf = (St + Sp) / 2 = (${St} + ${Sp}) / 2 = ${f(Vf)}`,
        `Vs = ${Vs} (fase ${fase.label})`,
        `V = ${f(b.vf)}×${f(Vf)} + ${f(b.vs)}×${Vs} = ${f(V)}`,
      ],
    };
  }

  // -------------------------------------------------------------------
  // KAPASITAS C — Subbab 3.3
  // -------------------------------------------------------------------

  // Subbab 3.3.2 — Irigasi alternatif dari pompa (mm/hari):
  //   Ialt = (Q × 3,6 × h) / (10 × A)
  //   Q = debit (L/detik), h = jam operasi/hari, A = luas (ha).
  //   (Q×3,6 = m³/jam; dibagi 10×A mengubah m³ per ha menjadi mm.)
  function hitungIrigasiAlternatif(debitLDetik, jamPerHari, luasHa) {
    return (debitLDetik * 3.6 * jamPerHari) / (10 * luasHa);
  }

  // Subbab 3.3 — Kapasitas adaptasi C = 0,5·SP + 0,5·ST
  //   ET0 harian = ET0 dasarian / 10 ; ETc = Kc × ET0
  //   Pef = 0,7 × P dasarian / 10   ← ASUMSI faktor hujan efektif 0,7 (config.js)
  //   L = perkolasi ; Kebutuhan = max(ETc + L − Pef, 0,001)
  //   RPA = (irigasi + Ialt) / Kebutuhan → skor SP
  //   d = max(ETc + L − Pef − irigasi − Ialt, 0) ; T = embung / (10 × A × d) hari → skor ST
  // "cuaca" = { p: hujan dasarian mm, et0: ET0 dasarian mm }
  function hitungKapasitas(petak, fase, cuaca) {
    const k = CFG();
    const f = formatAngka;
    const A = petak.luas_ha;
    const et0Harian = cuaca.et0 / 10;
    const ETc = fase.kc * et0Harian;
    const Pef = (k.faktorHujanEfektif * cuaca.p) / 10;
    const L = petak.perkolasi_mm_hari;
    const irigasi = petak.irigasi_mm_hari;
    const Ialt = hitungIrigasiAlternatif(petak.pompa_debit_L_detik, petak.pompa_jam_hari, A);
    const kebutuhan = Math.max(ETc + L - Pef, k.kebutuhanMinimum);
    const RPA = (irigasi + Ialt) / kebutuhan;
    const SP = skorDariMin(RPA, k.skorRpa);

    const d = Math.max(ETc + L - Pef - irigasi - Ialt, 0);
    let T = null;
    let ST;
    let alasanST;
    if (d === 0) {
      ST = 5; alasanST = "d = 0 → air tercukupi, tidak perlu tampungan";
    } else if (!petak.embung_m3) {
      ST = 1; alasanST = "tidak ada embung";
    } else {
      T = petak.embung_m3 / (10 * A * d);
      ST = skorDariMin(T, k.skorTampungan);
      alasanST = `T = ${f(petak.embung_m3, 0)} / (10×${f(A)}×${f(d)}) = ${f(T, 1)} hari`;
    }
    const b = k.bobotKapasitas;
    const C = b.sp * SP + b.st * ST;
    return {
      et0Harian, ETc, Pef, L, irigasi, Ialt, kebutuhan, RPA, SP, d, T, ST, C,
      langkah: [
        `ET0 = ${f(cuaca.et0, 1)} / 10 = ${f(et0Harian)} mm/hari ; ETc = ${f(fase.kc)}×${f(et0Harian)} = ${f(ETc)}`,
        `Pef = ${f(k.faktorHujanEfektif)}×${f(cuaca.p, 1)} / 10 = ${f(Pef)} mm/hari`,
        `Ialt = (${f(petak.pompa_debit_L_detik)}×3,6×${f(petak.pompa_jam_hari)}) / (10×${f(A)}) = ${f(Ialt)} mm/hari`,
        `Kebutuhan = ${f(ETc)} + ${f(L)} − ${f(Pef)} = ${f(kebutuhan)} mm/hari`,
        `RPA = (${f(irigasi)} + ${f(Ialt)}) / ${f(kebutuhan)} = ${f(RPA)} → SP = ${SP}`,
        `d = ${f(d)} mm/hari ; ${alasanST} → ST = ${ST}`,
        `C = ${f(b.sp)}×${SP} + ${f(b.st)}×${ST} = ${f(C)}`,
      ],
    };
  }

  // -------------------------------------------------------------------
  // RISIKO & STATUS — Subbab 3.4
  // -------------------------------------------------------------------

  // Subbab 3.4.1 — R = (H × V) / C
  // Paparan (exposure) sudah termasuk di V (fase tanaman), jadi TIDAK ada variabel E.
  // Dibagi C karena kapasitas adaptasi MENGURANGI risiko: makin besar C, makin kecil R.
  function hitungRisiko(H, V, C) {
    return (H * V) / C;
  }

  // Subbab 3.4.2 — Status:
  //   H = 1 → Aman (tidak ada bahaya kekeringan).
  //   Selain itu: R < 2 Aman · 2–<5 Waspada · 5–<10 Siaga · ≥10 Awas.
  //   Pengaman: kalau H ≥ 4, minimal Waspada.
  function tentukanStatus(H, R) {
    const daftar = CFG().status;
    if (H === 1) return daftar[0];
    let indeks = daftar.findIndex((s) => R < s.max);
    if (H >= CFG().hMinimumPengaman && indeks < 1) indeks = 1;
    return daftar[indeks];
  }

  // Urutan status (0 = Aman … 3 = Awas), berguna untuk perbandingan.
  function tingkatStatus(namaStatus) {
    return CFG().status.findIndex((s) => s.nama === namaStatus);
  }

  // -------------------------------------------------------------------
  // REKOMENDASI — Subbab 3.5
  // -------------------------------------------------------------------

  // Subbab 3.5.1 — Rekomendasi utama: if-else sesuai status.
  function buatRekomendasi(namaStatus) {
    return [CFG().rekomendasi[namaStatus]];
  }

  // Subbab 3.5.1 — Rekomendasi tambahan mengikuti PENYEBAB risiko (tabel pemicu PPT):
  //   SP ≤ 2 · ST ≤ 2 · Vs = 5 · Vf ≥ 4 · H ≥ 4 & belum tanam.
  // Hanya dicek bila status minimal CONFIG.pemicuMulaiStatus (default Waspada).
  // Mengembalikan daftar { kode, syarat, nilai, teks } yang terpenuhi.
  function cariPemicu(namaStatus, H, hst, kerentanan, kapasitas) {
    const k = CFG();
    if (tingkatStatus(namaStatus) < tingkatStatus(k.pemicuMulaiStatus)) return [];
    const nilai = { SP: kapasitas.SP, ST: kapasitas.ST, Vs: kerentanan.Vs, Vf: kerentanan.Vf, H };
    const terpenuhi = {
      SP: (p) => nilai.SP <= p.ambang,
      ST: (p) => nilai.ST <= p.ambang,
      Vs: (p) => nilai.Vs === p.ambang,
      Vf: (p) => nilai.Vf >= p.ambang,
      H:  (p) => nilai.H >= p.ambang && hst < k.batasBelumTanamHst,
    };
    return k.pemicuRekomendasi
      .filter((p) => terpenuhi[p.kode](p))
      .map((p) => ({ ...p, nilai: nilai[p.kode] }));
  }

  // Umpan balik lapangan: bandingkan status prediksi dengan kondisi yang dilaporkan.
  //   selisih = tingkat kondisi lapangan − tingkat status prediksi
  //   0 → sesuai · > 0 → prediksi terlalu ringan (kekeringan terlewat) · < 0 → terlalu berat (alarm palsu)
  function bandingkanLaporan(namaStatusPrediksi, tingkatLapangan) {
    const selisih = tingkatLapangan - tingkatStatus(namaStatusPrediksi);
    if (selisih === 0) return { selisih, hasil: "Sesuai" };
    return { selisih, hasil: selisih > 0 ? "Prediksi terlalu ringan" : "Prediksi terlalu berat" };
  }

  // Subbab 3.5.2 — Kalender tanam: cari 2 dasarian berturut-turut dengan P ≥ 50 mm,
  // mulai dari dasarian terpilih ke depan. Mengembalikan kunci dasarian atau null.
  function cariWaktuTanam(data, indeksMulai) {
    const k = CFG();
    for (let i = indeksMulai; i + k.jumlahDasarianTanam - 1 < data.length; i++) {
      const cukup = data.slice(i, i + k.jumlahDasarianTanam).every((d) => d.p_rf >= k.ambangHujanTanam);
      if (cukup) return data[i].kunci;
    }
    return null;
  }

  // -------------------------------------------------------------------
  // SIMULASI SKENARIO — Subbab 3.5.4
  // -------------------------------------------------------------------

  // Terapkan skenario ke cuaca & petak (TIDAK mengubah data asli, membuat salinan).
  // skenario = { hujanTurun %, et0Naik %, irigasiTurun %, tambahEmbung m³, tambahJamPompa jam }
  function terapkanSkenario(petak, cuaca, s) {
    const cuacaBaru = {
      p: cuaca.p * (1 - s.hujanTurun / 100),
      et0: cuaca.et0 * (1 + s.et0Naik / 100),
    };
    const petakBaru = {
      ...petak,
      irigasi_mm_hari: petak.irigasi_mm_hari * (1 - s.irigasiTurun / 100),
      embung_m3: (petak.embung_m3 || 0) + s.tambahEmbung,
      pompa_jam_hari: Math.min(24, petak.pompa_jam_hari + (petak.pompa_debit_L_detik > 0 ? s.tambahJamPompa : 0)),
    };
    return { petak: petakBaru, cuaca: cuacaBaru };
  }

  // ΔR = (R_skenario − R_awal) / R_awal × 100%
  function hitungPerubahanRisiko(rAwal, rSkenario) {
    return ((rSkenario - rAwal) / rAwal) * 100;
  }

  // -------------------------------------------------------------------
  // GABUNGAN: analisis lengkap satu petak pada satu dasarian
  // -------------------------------------------------------------------

  // baris = satu baris DATA_HAZARD (punya spi_rf, spei_rf, p_rf, et0_rf, kunci)
  // Mengembalikan semua skor + langkah perhitungan untuk panel detail.
  function analisisPetak(petak, baris, skenario) {
    const tanggal = tanggalDasarian(baris.kunci);
    const umur = hitungHST(petak.tanggal_tanam, tanggal);
    const fase = tentukanFase(umur.hst);
    // H dari SPI & SPEI prediksi RF (Subbab 3.1.6), bukan dari kolom H_rf.
    const H = bahayaBaris(baris, "rf");
    if (!fase) {
      return { petak, H, hst: umur.hst, fase: null, bera: true, status: CFG().statusBera, rekomendasi: ["Petak bera / belum ditanami. Risiko tidak dihitung."], pemicu: [] };
    }
    let p = petak;
    let cuaca = { p: baris.p_rf, et0: baris.et0_rf };
    if (skenario) ({ petak: p, cuaca } = terapkanSkenario(petak, cuaca, skenario));

    const kerentanan = hitungKerentanan(p, fase);
    const kapasitas = hitungKapasitas(p, fase, cuaca);
    const R = hitungRisiko(H, kerentanan.V, kapasitas.C);
    const status = tentukanStatus(H, R);
    return {
      petak: p, H, hst: umur.hst, tanggalTanam: umur.tanggalTanam, fase, bera: false, cuaca,
      V: kerentanan.V, C: kapasitas.C, R, status,
      kerentanan, kapasitas,
      rekomendasi: buatRekomendasi(status.nama),
      pemicu: cariPemicu(status.nama, H, umur.hst, kerentanan, kapasitas),
      langkahH: langkahBahaya(baris.spi_rf, baris.spei_rf),
      langkahR: `R = (H × V) / C = (${H} × ${formatAngka(kerentanan.V)}) / ${formatAngka(kapasitas.C)} = ${formatAngka(R)}`,
    };
  }

  // -------------------------------------------------------------------
  // PRAKIRAAN SATU MUSIM TANAM (12 dasarian ≈ 4 bulan)
  // -------------------------------------------------------------------

  // Hitung kondisi lahan untuk 12 dasarian mulai dari dasarian tanam.
  //   lahan       = data lahan dari form (tanah, perkolasi, irigasi, pompa, embung)
  //   data        = DATA_HAZARD (sudah digeser tahunnya)
  //   indeksTanam = posisi dasarian tanam di dalam data
  // Tanggal tanam = tanggal awal dasarian tanam, jadi baris ke-1 = 0 HST,
  // baris ke-12 ≈ 110 HST (menjelang panen). Tiap baris memakai H, P, ET0
  // prediksi dasarian itu, lalu V, C, R, status dihitung ulang.
  function buatPrakiraan(lahan, data, indeksTanam, skenario) {
    const tanggalTanam = teksTanggal(tanggalDasarian(data[indeksTanam].kunci));
    const lahanTanam = { ...lahan, tanggal_tanam: tanggalTanam };
    return data
      .slice(indeksTanam, indeksTanam + CFG().jumlahDasarianPrakiraan)
      .map((baris) => ({ baris, ...analisisPetak(lahanTanam, baris, skenario) }));
  }

  // -------------------------------------------------------------------
  // Kinerja model (untuk tabel validasi)
  // -------------------------------------------------------------------

  // Metrik sama dengan notebook Colab & slide "Validasi Model":
  //   MAE  = rata-rata |prediksi − observasi|        (SPI dan SPEI)
  //   RMSE = akar rata-rata (prediksi − observasi)²  (SPI dan SPEI)
  //   Recall = dari dasarian yang benar-benar kering (indeks obs ≤ −1),
  //            berapa yang juga diprediksi kering (indeks prediksi ≤ −1).
  //   Akurasi H = persen dasarian yang skor H prediksinya SAMA dengan H observasi
  //               (keduanya dihitung dengan skorBahaya dari SPI & SPEI).
  // metode = "rf", "persistensi", atau "klimatologi".
  // Data SPI/SPEI disimpan 5 desimal, jadi MAE sama dengan output Colab sampai 4 desimal.
  function hitungKinerja(data, metode) {
    const n = data.length;
    const ambang = CFG().ambangSpiKering;
    const tepat = data.filter((d) => bahayaBaris(d, metode) === bahayaBaris(d, "obs")).length;
    const metrik = (indeks) => {
      const sel = data.map((d) => d[`${indeks}_${metode}`] - d[`${indeks}_obs`]);
      const kering = data.filter((d) => d[`${indeks}_obs`] <= ambang);
      const terdeteksi = kering.filter((d) => d[`${indeks}_${metode}`] <= ambang).length;
      return {
        mae: sel.reduce((s, x) => s + Math.abs(x), 0) / n,
        rmse: Math.sqrt(sel.reduce((s, x) => s + x * x, 0) / n),
        kejadian: kering.length, terdeteksi,
        recall: kering.length ? (terdeteksi / kering.length) * 100 : 0,
      };
    };
    const spi = metrik("spi");
    const spei = metrik("spei");
    return { akurasiH: (tepat / n) * 100, rmseSpi: spi.rmse, spi, spei };
  }

  // Ekspor ke global supaya bisa dipakai app.js
  window.Rumus = {
    formatAngka, skorIndeks, skorBahaya, langkahBahaya, bahayaBaris, geserKunciDasarian, teksTanggal, tanggalDasarian, hitungHST, tentukanFase,
    skorTanah, skorPerkolasi, hitungKerentanan,
    hitungIrigasiAlternatif, hitungKapasitas,
    hitungRisiko, tentukanStatus, tingkatStatus,
    buatRekomendasi, cariPemicu, bandingkanLaporan, cariWaktuTanam,
    terapkanSkenario, hitungPerubahanRisiko,
    analisisPetak, buatPrakiraan, hitungKinerja,
  };
})();
