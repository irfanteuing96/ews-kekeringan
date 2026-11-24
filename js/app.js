// =====================================================================
// app.js — TAMPILAN: form data lahan, tabel 12 dasarian, detail, data cuaca,
// peta, simulasi, pesan WA, grafik, peran pengguna, laporan lapangan. Tidak ada rumus di sini; semua
// perhitungan memanggil window.Rumus (js/rumus.js).
// =====================================================================

(function () {
  const K = window.CONFIG;
  const R = window.Rumus;
  const f = R.formatAngka;
  const $ = (id) => document.getElementById(id);

  // Geser tahun data (2022–2023 → 2026–2027). Nilai data tidak berubah, hanya label waktunya.
  const DATA = window.DATA_HAZARD.map((d) => ({
    ...d, kunci: R.geserKunciDasarian(d.kunci, K.geserTahun), tahun: d.tahun + K.geserTahun,
  }));
  const JUMLAH = K.jumlahDasarianPrakiraan;

  // Keadaan aplikasi (state) yang berubah saat pengguna berinteraksi.
  const keadaan = {
    lahan: null,        // data lahan yang terakhir di-generate
    indeksTanam: 0,     // posisi dasarian tanam di DATA
    skenario: skenarioKosong(),
    hasilAwal: [],      // 12 baris tanpa skenario
    hasil: [],          // 12 baris dengan skenario (sama dengan hasilAwal bila slider nol)
    pilihan: 0,         // baris tabel yang dipilih (0–11)
  };
  const grafik = {};
  let poligonWilayah = null;
  let petaLeaflet = null;

  function skenarioKosong() {
    return { hujanTurun: 0, et0Naik: 0, irigasiTurun: 0, tambahEmbung: 0, tambahJamPompa: 0 };
  }
  const skenarioAktif = () => Object.values(keadaan.skenario).some((x) => x !== 0);
  const semuaStatus = () => [...K.status, K.statusBera];

  // "2027-01-III" → "21–31 Jan 2027"
  function rentangTanggal(kunci) {
    const t = R.tanggalDasarian(kunci);
    const bulan = t.toLocaleString("id-ID", { month: "short" });
    const akhir = kunci.endsWith("-III") ? new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() : t.getDate() + 9;
    return `${t.getDate()}–${akhir} ${bulan} ${t.getFullYear()}`;
  }
  const tanggalPanjang = (t) => t.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // ===================================================================
  // 1. FORM DATA LAHAN
  // ===================================================================

  function siapkanForm() {
    const L0 = window.DATA_LAHAN;
    // Pilihan dasarian tanam: hanya yang masih punya 12 dasarian data ke depan.
    $("inDasarianTanam").innerHTML = DATA.slice(0, DATA.length - JUMLAH + 1)
      .map((d, i) => `<option value="${i}">${d.kunci} · mulai ${R.tanggalDasarian(d.kunci).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</option>`)
      .join("");
    $("inDasarianTanam").value = Math.max(0, DATA.findIndex((d) => d.kunci === K.dasarianTanamAwal));
    $("inTekstur").innerHTML = Object.keys(K.skorTekstur).map((t) => `<option value="${t}">${t}</option>`).join("");

    $("inNama").value = L0.nama;
    $("inTekstur").value = L0.tekstur;
    $("inAwc").value = L0.awc_mm_per_m ?? "";
    $("inPerkolasi").value = L0.perkolasi_mm_hari;
    $("inIrigasi").value = L0.irigasi_mm_hari;
    $("inEmbung").value = L0.embung_m3;
    $("inPompaDebit").value = L0.pompa_debit_L_detik;
    $("inPompaJam").value = L0.pompa_jam_hari;

    $("formLahan").addEventListener("submit", (e) => {
      e.preventDefault();
      generate();
    });
    // Beri tanda bila isian berubah tapi belum di-generate.
    $("formLahan").addEventListener("input", () => {
      $("infoForm").textContent = "Data berubah, klik Generate untuk menghitung ulang.";
      $("infoForm").classList.add("perlu-generate");
    });
  }

  // Ambil isian form menjadi objek lahan (satuan sama dengan data-lahan.js).
  function bacaForm() {
    const angka = (id) => Number($(id).value);
    return {
      nama: $("inNama").value.trim() || "Wilayah sawah",
      luas_ha: window.DATA_LAHAN.luas_ha, // tidak diisi di form; tetap dipakai rumus Ialt & T
      tekstur: $("inTekstur").value,
      awc_mm_per_m: $("inAwc").value === "" ? null : angka("inAwc"),
      perkolasi_mm_hari: angka("inPerkolasi"),
      irigasi_mm_hari: angka("inIrigasi"),
      embung_m3: angka("inEmbung"),
      pompa_debit_L_detik: angka("inPompaDebit"),
      pompa_jam_hari: Math.min(24, angka("inPompaJam")),
      koordinat: window.DATA_LAHAN.koordinat,
    };
  }

  // Tombol Generate: hitung 12 dasarian dari dasarian tanam yang dipilih.
  function generate() {
    const lahan = bacaForm();
    keadaan.lahan = lahan;
    keadaan.indeksTanam = Number($("inDasarianTanam").value);
    hitungUlang();
    keadaan.pilihan = indeksPalingParah(keadaan.hasil);
    $("infoForm").textContent = `✓ Dihitung untuk ${JUMLAH} dasarian mulai ${DATA[keadaan.indeksTanam].kunci}.`;
    $("infoForm").classList.remove("perlu-generate");
    gambarSemua();
    isiPilihanLaporan();
  }

  // Hitung prakiraan awal & prakiraan dengan skenario.
  function hitungUlang() {
    keadaan.hasilAwal = R.buatPrakiraan(keadaan.lahan, DATA, keadaan.indeksTanam, null);
    keadaan.hasil = skenarioAktif()
      ? R.buatPrakiraan(keadaan.lahan, DATA, keadaan.indeksTanam, keadaan.skenario)
      : keadaan.hasilAwal;
  }

  // Baris dengan status paling parah (bila seri, R terbesar) → dipilih otomatis.
  function indeksPalingParah(hasil) {
    let terbaik = 0;
    hasil.forEach((h, i) => {
      const a = hasil[terbaik];
      const lebihParah = R.tingkatStatus(h.status.nama) > R.tingkatStatus(a.status.nama) ||
        (h.status.nama === a.status.nama && (h.R || 0) > (a.R || 0));
      if (lebihParah) terbaik = i;
    });
    return terbaik;
  }

  function gambarSemua() {
    gambarRingkasan();
    gambarTabel();
    gambarDetail();
    gambarCuaca();
    warnaiPeta();
    gambarSimulasi();
    gambarWa();
    tandaiGrafik();
  }

  function pilihBaris(i) {
    keadaan.pilihan = i;
    $("lapDasarian").value = i; // laporan lapangan ikut dasarian yang dipilih
    gambarTabel();
    gambarDetail();
    gambarCuaca();
    warnaiPeta();
    gambarSimulasi();
    tandaiGrafik();
  }

  // ===================================================================
  // 2. KARTU RINGKASAN
  // ===================================================================

  function warnaH(H) {
    return [null, K.status[0].warna, K.status[1].warna, K.status[2].warna, K.status[3].warna, "#b91c1c"][H];
  }

  function gambarRingkasan() {
    const hasil = keadaan.hasil;
    const parah = hasil[indeksPalingParah(hasil)];
    const kunciParah = hasil.filter((h) => h.status.nama === parah.status.nama).map((h) => h.baris.kunci);
    $("ringkasStatusMaks").textContent = parah.status.nama;
    $("ringkasStatusMaks").style.color = parah.status.warna;
    $("ringkasStatusMaksKet").textContent = R.tingkatStatus(parah.status.nama) === 0
      ? "Aman sepanjang musim tanam"
      : `${kunciParah.length} dasarian: ${kunciParah.join(", ")}`;

    const jumlah = {};
    semuaStatus().forEach((s) => (jumlah[s.nama] = 0));
    hasil.forEach((h) => jumlah[h.status.nama]++);
    $("ringkasStatus").innerHTML = semuaStatus()
      .filter((s) => s !== K.statusBera || jumlah[s.nama] > 0)
      .map((s) => `<div class="baris-status"><span class="titik" style="background:${s.warna}"></span>${s.nama}<b>${jumlah[s.nama]}</b></div>`)
      .join("");

    const hMaks = Math.max(...hasil.map((h) => h.H));
    $("ringkasH").textContent = hMaks;
    $("ringkasH").style.color = warnaH(hMaks);
    const kunciH = hasil.filter((h) => h.H === hMaks).map((h) => h.baris.kunci);
    $("ringkasHKet").textContent = `${K.labelBahaya[hMaks]}${hMaks > 1 ? " · " + kunciH.join(", ") : ""}`;

    const total = (kolom) => hasil.reduce((s, h) => s + h.baris[kolom], 0);
    $("ringkasHujan").textContent = f(total("p_rf"), 0);
    const saran = R.cariWaktuTanam(DATA, keadaan.indeksTanam);
    $("ringkasHujanKet").innerHTML = `observasi ${f(total("p_obs"), 0)} mm · ET₀ prediksi ${f(total("et0_rf"), 0)} mm<br>` +
      (saran ? `🌱 Hujan cukup untuk tanam mulai <b>${saran}</b>` : "🌱 Belum ada 2 dasarian berturut-turut ≥ 50 mm");
  }

  // ===================================================================
  // 3. TABEL 12 DASARIAN
  // ===================================================================

  function gambarTabel() {
    $("judulTabel").textContent = `· ${keadaan.lahan.nama}` + (skenarioAktif() ? " · skenario aktif" : "");
    let html = `<thead><tr>
      <th>#</th><th>Dasarian</th><th>Umur / fase</th><th class="angka">H</th><th class="angka">Hujan</th>
      <th class="angka">V</th><th class="angka">C</th><th class="angka">R</th><th>Status</th><th>Rekomendasi</th>
    </tr></thead><tbody>`;
    keadaan.hasil.forEach((h, i) => {
      const b = h.baris;
      html += `<tr data-i="${i}" class="${i === keadaan.pilihan ? "terpilih" : ""}">
        <td class="kecil">${i + 1}</td>
        <td><b>${b.kunci}</b><div class="kecil">${rentangTanggal(b.kunci)}</div></td>
        <td>${h.bera ? "–" : `${h.hst} HST<div class="kecil">${h.fase.label}</div>`}</td>
        <td class="angka" style="color:${warnaH(h.H)}"><b>${h.H}</b></td>
        <td class="angka">${f(b.p_rf, 0)} mm</td>
        <td class="angka">${h.bera ? "–" : f(h.V)}</td>
        <td class="angka">${h.bera ? "–" : f(h.C)}</td>
        <td class="angka"><b>${h.bera ? "–" : f(h.R)}</b></td>
        <td><span class="pil-status" style="background:${h.status.warna}">${h.status.nama}</span></td>
        <td class="rekom-singkat">${h.rekomendasi[0]}${h.pemicu.length
          ? `<div class="tambahan">+ ${h.pemicu.length} saran tambahan (${h.pemicu.map((p) => p.syarat).join(" · ")})</div>` : ""}</td>
      </tr>`;
    });
    $("tabelPrakiraan").innerHTML = html + "</tbody>";
    $("tabelPrakiraan").querySelectorAll("tbody tr").forEach((tr) =>
      tr.addEventListener("click", () => pilihBaris(Number(tr.dataset.i))));
  }

  // ===================================================================
  // 4. PANEL DETAIL (rincian perhitungan baris terpilih)
  // ===================================================================

  function barSkor(label, nilai, maks, warna) {
    const persen = Math.min(100, (nilai / maks) * 100);
    return `<div class="skor-baris"><b>${label}</b><div class="bar"><div style="width:${persen}%;background:${warna}"></div></div><span class="nilai">${f(nilai)}</span></div>`;
  }

  // Legenda "Cara menghitung H": matriks 5×5 skor SPI (baris) × skor SPEI (kolom).
  // Sel kombinasi dasarian terpilih diberi bingkai tebal.
  function matriksBahaya(skorSpiTerpilih, skorSpeiTerpilih) {
    let html = `<div class="matriks-h"><div class="matriks-judul">Cara menghitung H = ⌈(skor SPI + skor SPEI) / 2⌉</div>
      <table><tr><th class="sudut">SPI ↓ · SPEI →</th>${[1, 2, 3, 4, 5].map((k) => `<th>${k}</th>`).join("")}</tr>`;
    for (let sSpi = 1; sSpi <= 5; sSpi++) {
      html += `<tr><th>${sSpi}</th>`;
      for (let sSpei = 1; sSpei <= 5; sSpei++) {
        const H = Math.ceil((sSpi + sSpei) / 2);
        const terpilih = sSpi === skorSpiTerpilih && sSpei === skorSpeiTerpilih;
        html += `<td class="${terpilih ? "sel-terpilih" : ""}" style="background:${warnaH(H)}" title="H ${H}: ${K.labelBahaya[H]}">${H}</td>`;
      }
      html += "</tr>";
    }
    return html + `</table><div class="kecil">Skor indeks: >−1 → 1 · ≤−1 → 2 · ≤−1,5 → 3 · ≤−1,76 → 4 · ≤−2 → 5</div></div>`;
  }

  // Rekomendasi tambahan menurut penyebab risiko (tabel pemicu di PPT).
  function kotakPemicu(h) {
    if (!h.pemicu.length) {
      return R.tingkatStatus(h.status.nama) < R.tingkatStatus(K.pemicuMulaiStatus) ? ""
        : `<div class="kecil">Tidak ada pemicu tambahan yang terpenuhi.</div>`;
    }
    return `<div class="kotak-pemicu"><div class="judul-pemicu">Rekomendasi tambahan · mengikuti penyebab risiko</div>
      ${h.pemicu.map((p) => `<p><span class="tag-pemicu">${p.syarat}</span>
        <span class="kecil">(${p.kode} = ${f(p.nilai)})</span><br>${p.teks}</p>`).join("")}</div>`;
  }

  function gambarDetail() {
    const h = keadaan.hasil[keadaan.pilihan];
    const b = h.baris;
    let html = `<div class="muncul">
      <div class="detail-judul">Dasarian ${keadaan.pilihan + 1}: ${b.kunci}</div>
      <div class="detail-sub">${rentangTanggal(b.kunci)} · ${keadaan.lahan.nama}${skenarioAktif() ? " · <b>skenario aktif</b>" : ""}</div>
      <span class="pil-status" style="background:${h.status.warna}">${h.status.nama.toUpperCase()}</span>`;
    if (h.bera) {
      $("panelDetail").innerHTML = html + `<div class="kotak-rekom">${h.rekomendasi.join("<br>")}</div></div>`;
      return;
    }
    html += `<p class="detail-sub" style="margin-top:12px">🌾 Fase <b>${h.fase.label}</b> · umur <b>${h.hst} HST</b>
        (tanam ${tanggalPanjang(h.tanggalTanam)}) · hujan ${f(h.cuaca.p, 0)} mm · ET₀ ${f(h.cuaca.et0, 0)} mm
        <span class="kecil">(prediksi RF${skenarioAktif() ? " + skenario" : ""})</span></p>
      ${barSkor("H", h.H, 5, warnaH(h.H))}
      ${barSkor("V", h.V, 5, "#60a5fa")}
      ${barSkor("C", h.C, 5, "#4ade80")}
      ${barSkor("R", h.R, 15, h.status.warna)}
      <div class="kotak-rekom">${h.rekomendasi.map((r) => `<p>💡 ${r}</p>`).join("")}</div>
      ${kotakPemicu(h)}
      ${matriksBahaya(R.skorIndeks(b.spi_rf), R.skorIndeks(b.spei_rf))}
      <details open>
        <summary>Rincian perhitungan langkah demi langkah</summary>
        <div class="langkah">
          <div class="judul-langkah">Bahaya H (Subbab 3.1.6)</div>
          ${h.langkahH}<br><span class="kecil">(SPI-3 & SPEI-3 prediksi RF, matriks SPI × SPEI)</span>
          <div class="judul-langkah">Kerentanan V (Subbab 3.2)</div>
          ${h.kerentanan.langkah.join("<br>")}
          <div class="judul-langkah">Kapasitas C (Subbab 3.3)</div>
          ${h.kapasitas.langkah.join("<br>")}
          <div class="judul-langkah">Risiko R (Subbab 3.4)</div>
          ${h.langkahR} → <b>${h.status.nama}</b>${h.H === 1 ? " (H = 1 → otomatis Aman)" : ""}
        </div>
      </details></div>`;
    $("panelDetail").innerHTML = html;
  }

  // ===================================================================
  // 4b. DATA CUACA (dari Excel: NASA POWER = data latih model, BMKG = pembanding)
  // ===================================================================

  const NAMA_BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  // "2027-01-II" → "Jan-II" (kunci tabel normal BMKG)
  const labelBmkg = (kunci) => `${NAMA_BULAN[Number(kunci.slice(5, 7)) - 1]}-${kunci.split("-")[2]}`;
  const normalBmkg = (kunci) => window.DATA_BMKG.normal[labelBmkg(kunci)]?.bmkg ?? null;
  // Prakiraan kategori PMH 2026/2027 untuk dasarian yang sama (tahun setelah digeser).
  const prakiraanBmkg = (kunci) =>
    window.DATA_BMKG.prakiraan.find((p) => p.dasarian === `${labelBmkg(kunci)} ${kunci.slice(0, 4)}`) || null;
  const teksPrakiraan = (pr) => (pr ? `${f(pr.bawah, 0)}–${f(pr.atas, 0)}` : "–");

  function ubinCuaca(ikon, label, nilai, satuan, sub) {
    return `<div class="ubin-cuaca"><div class="ikon">${ikon}</div><div class="label-kecil">${label}</div>
      <div class="nilai-cuaca">${nilai}<small> ${satuan}</small></div>${sub ? `<div class="kecil">${sub}</div>` : ""}</div>`;
  }

  function gambarCuaca() {
    const b = keadaan.hasil[keadaan.pilihan].baris;
    $("judulCuaca").textContent = `· ${b.kunci} (${rentangTanggal(b.kunci)})`;
    $("kartuCuaca").innerHTML = [
      ubinCuaca("🌧️", "Curah hujan P", f(b.p_obs, 0), "mm", `prediksi RF ${f(b.p_rf, 0)} mm`),
      ubinCuaca("🌡️", "Suhu maks", f(b.tmax, 1), "°C"),
      ubinCuaca("🌡️", "Suhu min", f(b.tmin, 1), "°C"),
      ubinCuaca("💧", "Kelembapan RH", f(b.rh, 0), "%"),
      ubinCuaca("🍃", "Angin u₂", f(b.u2, 2), "m/s"),
      ubinCuaca("☀️", "Radiasi Rs", f(b.rs, 1), "MJ/m²/hari"),
      ubinCuaca("♨️", "ET₀ (Penman-Monteith)", f(b.et0_obs, 0), "mm", `prediksi RF ${f(b.et0_rf, 0)} mm`),
      ubinCuaca("⚖️", "Neraca D = P − ET₀", f(b.d_obs, 0), "mm", `prediksi RF ${f(b.d_rf, 0)} mm`),
    ].join("");

    const stasiun = b.p_stasiun != null ? `${f(b.p_stasiun, 0)} mm`
      : b.p_stasiun_terukur != null ? `tidak lengkap (terukur ${f(b.p_stasiun_terukur, 0)} mm)` : "–";
    const pr = prakiraanBmkg(b.kunci);
    $("neracaAir").innerHTML = `
      <div><b>Dari cuaca ke indeks:</b> hujan dan D dijumlah 3 dasarian (t−2, t−1, t) lalu dibandingkan dengan sebaran 1991–2020
        → SPI-3 obs <b>${f(b.spi_obs)}</b> / RF <b>${f(b.spi_rf)}</b> · SPEI-3 obs <b>${f(b.spei_obs)}</b> / RF <b>${f(b.spei_rf)}</b>.</div>
      <div class="kecil">Pembanding: stasiun BMKG ${stasiun} · normal BMKG ${f(normalBmkg(b.kunci), 0)} mm` +
      (pr ? ` · prakiraan BMKG (PMH 2026/27) ${teksPrakiraan(pr)} mm` : "") + `</div>`;

    let html = `<thead><tr><th>#</th><th>Dasarian</th>
      <th class="angka">Hujan obs</th><th class="angka">Hujan RF</th><th class="angka">Stasiun BMKG</th>
      <th class="angka">Normal BMKG</th><th class="angka">Prakiraan BMKG</th>
      <th class="angka">ET₀ obs</th><th class="angka">ET₀ RF</th><th class="angka">D obs</th>
      <th class="angka">Tmax</th><th class="angka">Tmin</th><th class="angka">RH</th><th class="angka">u₂</th><th class="angka">Rs</th>
      </tr></thead><tbody>`;
    keadaan.hasil.forEach((h, i) => {
      const d = h.baris;
      html += `<tr data-i="${i}" class="${i === keadaan.pilihan ? "terpilih" : ""}">
        <td class="kecil">${i + 1}</td><td><b>${d.kunci}</b></td>
        <td class="angka">${f(d.p_obs, 0)}</td><td class="angka">${f(d.p_rf, 0)}</td>
        <td class="angka">${d.p_stasiun != null ? f(d.p_stasiun, 0) : `<span class="redup" title="ada hari tanpa data hujan">n/a</span>`}</td>
        <td class="angka">${f(normalBmkg(d.kunci), 0)}</td><td class="angka">${teksPrakiraan(prakiraanBmkg(d.kunci))}</td>
        <td class="angka">${f(d.et0_obs, 0)}</td><td class="angka">${f(d.et0_rf, 0)}</td>
        <td class="angka" style="color:${d.d_obs < 0 ? "var(--siaga)" : "inherit"}">${f(d.d_obs, 0)}</td>
        <td class="angka">${f(d.tmax, 1)}</td><td class="angka">${f(d.tmin, 1)}</td><td class="angka">${f(d.rh, 0)}</td>
        <td class="angka">${f(d.u2, 2)}</td><td class="angka">${f(d.rs, 1)}</td></tr>`;
    });
    $("tabelCuaca").innerHTML = html + "</tbody>";
    $("tabelCuaca").querySelectorAll("tbody tr").forEach((tr) =>
      tr.addEventListener("click", () => pilihBaris(Number(tr.dataset.i))));
    $("catatanCuaca").innerHTML = `Hujan, ET₀, D dalam mm per dasarian; suhu °C, RH %, u₂ m/s, Rs MJ/m²/hari (rata-rata harian).
      <b>obs</b> = NASA POWER (data latih model) · <b>RF</b> = prediksi Random Forest satu dasarian ke depan (dipakai menghitung C).
      Stasiun BMKG "n/a" = ada hari tanpa data hujan (tidak diisi/interpolasi). Normal BMKG 1991–2020 & prakiraan PMH 2026/27 (rentang kategori) = ZOM SULTRA_13.
      Data uji 2022–2023 ditampilkan sebagai 2026–2027, jadi prakiraan BMKG hanya pembanding pola musim.`;
  }

  // ===================================================================
  // 5. PETA (satu wilayah)
  // ===================================================================

  function siapkanPeta() {
    const peta = L.map("peta").setView([K.lokasi.lat, K.lokasi.lon], K.lokasi.zoom);
    petaLeaflet = peta;
    const citra = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      maxZoom: 19, attribution: "Citra © Esri",
    });
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" });
    citra.addTo(peta);
    L.control.layers({ "Citra satelit": citra, "OpenStreetMap": osm }).addTo(peta);
    L.circleMarker([K.lokasi.lat, K.lokasi.lon], { radius: 5, color: "#fff", fillColor: "#4ade80", fillOpacity: 1, weight: 2 })
      .bindTooltip("Titik data iklim NASA POWER").addTo(peta);

    poligonWilayah = L.polygon(window.DATA_LAHAN.koordinat, { weight: 3, color: "#fff", fillOpacity: 0.55 }).addTo(peta);
    // Pusatkan peta ke wilayah + titik iklim. Diulang setelah halaman selesai dimuat
    // karena ukuran kotak peta baru pasti setelah CSS & font terpasang.
    const batas = poligonWilayah.getBounds().extend([K.lokasi.lat, K.lokasi.lon]).pad(0.08);
    peta.fitBounds(batas);
    window.addEventListener("load", () => { peta.invalidateSize(); peta.fitBounds(batas); });

    $("legenda").innerHTML = K.status
      .map((s) => `<span><span class="titik" style="background:${s.warna}"></span>${s.nama}</span>`).join("");
  }

  function warnaiPeta() {
    const h = keadaan.hasil[keadaan.pilihan];
    poligonWilayah.setStyle({ fillColor: h.status.warna });
    poligonWilayah.bindTooltip(`<b>${keadaan.lahan.nama}</b><br>${h.baris.kunci}: ${h.status.nama}`, { sticky: true });
    $("infoPeta").textContent = `warna = status ${h.baris.kunci}`;
  }

  // ===================================================================
  // 6. SIMULASI SKENARIO (Subbab 3.5.4) — berlaku untuk ke-12 dasarian
  // ===================================================================

  const labelSlider = {
    hujanTurun: "Hujan turun", et0Naik: "ET₀ naik", irigasiTurun: "Pasokan irigasi turun",
    tambahEmbung: "Tambah embung", tambahJamPompa: "Tambah jam pompa",
  };

  function siapkanSliderSkenario() {
    $("sliderSkenario").innerHTML = Object.entries(K.simulasi).map(([kunci, s]) => `
      <div class="slider-item">
        <label for="sim-${kunci}">${labelSlider[kunci]} <b id="nilai-${kunci}">0${s.satuan}</b></label>
        <input type="range" id="sim-${kunci}" min="${s.min}" max="${s.max}" step="${s.langkah}" value="0" />
      </div>`).join("");
    Object.keys(K.simulasi).forEach((kunci) => {
      $("sim-" + kunci).addEventListener("input", (e) => {
        keadaan.skenario[kunci] = Number(e.target.value);
        terapkanSlider();
      });
    });
    $("tombolReset").addEventListener("click", () => {
      keadaan.skenario = skenarioKosong();
      terapkanSlider();
    });
  }

  // Samakan slider & label dengan keadaan.skenario, lalu hitung ulang semua.
  function terapkanSlider() {
    Object.entries(K.simulasi).forEach(([kunci, s]) => {
      $("sim-" + kunci).value = keadaan.skenario[kunci];
      $("nilai-" + kunci).textContent = f(keadaan.skenario[kunci], 0) + s.satuan;
    });
    hitungUlang();
    gambarSemua();
  }

  // Jumlah dasarian berstatus Siaga atau Awas.
  const hitungKritis = (hasil) => hasil.filter((h) => !h.bera && R.tingkatStatus(h.status.nama) >= 2).length;
  const rMaks = (hasil) => Math.max(...hasil.filter((h) => !h.bera).map((h) => h.R));

  function gambarSimulasi() {
    const awal = keadaan.hasilAwal[keadaan.pilihan];
    const sim = keadaan.hasil[keadaan.pilihan];
    if (awal.bera) {
      $("hasilSimulasi").innerHTML = `<div class="keterangan" style="grid-column:1/-1">Dasarian ini bera, tidak dihitung.</div>`;
      return;
    }
    const delta = R.hitungPerubahanRisiko(awal.R, sim.R);
    const warnaDelta = delta > 0.05 ? K.status[3].warna : delta < -0.05 ? K.status[0].warna : "#94a3b8";
    $("hasilSimulasi").innerHTML = `
      <div class="hasil-kolom"><div class="label-kecil">R awal · ${awal.baris.kunci}</div>
        <div class="angka-sedang">${f(awal.R)}</div><span class="pil-status" style="background:${awal.status.warna}">${awal.status.nama}</span></div>
      <div class="panah">→</div>
      <div class="hasil-kolom"><div class="label-kecil">R skenario</div>
        <div class="angka-sedang">${f(sim.R)}</div><span class="pil-status" style="background:${sim.status.warna}">${sim.status.nama}</span></div>
      <div><div class="label-kecil">ΔR</div><div class="delta" style="color:${warnaDelta}">${delta > 0 ? "+" : ""}${f(delta, 1)}%</div>
        <div class="keterangan" style="text-align:right">C: ${f(awal.C)} → ${f(sim.C)}</div></div>
      <div class="keterangan" style="grid-column:1/-1">Satu musim (12 dasarian): dasarian Siaga/Awas
        <b>${hitungKritis(keadaan.hasilAwal)} → ${hitungKritis(keadaan.hasil)}</b> ·
        R tertinggi <b>${f(rMaks(keadaan.hasilAwal))} → ${f(rMaks(keadaan.hasil))}</b></div>`;
  }

  // ===================================================================
  // 7. PRATINJAU WHATSAPP (ringkasan satu musim tanam)
  // ===================================================================

  const ikonStatus = { Aman: "✅", Waspada: "🟡", Siaga: "⚠️", Awas: "🚨" };

  function gambarWa() {
    const hasil = keadaan.hasil;
    const lahan = keadaan.lahan;
    const awal = R.tanggalDasarian(hasil[0].baris.kunci);
    const panen = new Date(awal.getTime() + 120 * 86400000);
    const parah = hasil[indeksPalingParah(hasil)];
    let pesan = `📋 PRAKIRAAN MUSIM TANAM\n${lahan.nama}\n` +
      `Tanam ${tanggalPanjang(awal)} · panen ±${tanggalPanjang(panen)}\n\n`;

    if (R.tingkatStatus(parah.status.nama) === 0) {
      pesan += `✅ AMAN sepanjang 12 dasarian. Total hujan diprediksi ±${f(hasil.reduce((s, h) => s + h.baris.p_rf, 0), 0)} mm.\n` +
        `Saran: ${K.rekomendasi.Aman}`;
    } else {
      const bermasalah = hasil.filter((h) => R.tingkatStatus(h.status.nama) >= 1);
      pesan += bermasalah.map((h) =>
        `${ikonStatus[h.status.nama]} ${h.baris.kunci} (${rentangTanggal(h.baris.kunci)}): ${h.status.nama.toUpperCase()}, ` +
        `bahaya ${K.labelBahaya[h.H].toLowerCase()} (H=${h.H}), padi ${h.hst} HST${h.fase.kode === "mid" ? " (berbunga)" : ""}.`).join("\n");
      pesan += `\n\nSaran: ${parah.rekomendasi.join(" ")}`;
      // Saran tambahan (pemicu) dari semua dasarian bermasalah, tanpa duplikat.
      const tambahan = [...new Map(bermasalah.flatMap((h) => h.pemicu).map((p) => [p.kode, p])).values()];
      if (tambahan.length) pesan += "\n" + tambahan.map((p) => `• ${p.teks}`).join("\n");
      pesan += "\nDasarian lainnya: Aman.";
    }
    const jam = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    $("pesanWa").innerHTML = `${pesan}<span class="wa-jam">${jam} ✓✓</span>`;
  }

  // ===================================================================
  // 8. GRAFIK CHART.JS
  // ===================================================================

  // Plugin kecil: arsir 12 dasarian musim tanam + garis di dasarian terpilih.
  const pluginPenanda = {
    id: "penanda",
    beforeDatasetsDraw(chart) {
      if (!keadaan.lahan) return;
      const x = chart.scales.x;
      const { top, bottom } = chart.chartArea;
      const kiri = x.getPixelForValue(keadaan.indeksTanam);
      const kanan = x.getPixelForValue(keadaan.indeksTanam + JUMLAH - 1);
      chart.ctx.save();
      chart.ctx.fillStyle = "rgba(74,222,128,0.09)";
      chart.ctx.fillRect(kiri, top, kanan - kiri, bottom - top);
      chart.ctx.restore();
    },
    afterDatasetsDraw(chart) {
      if (!keadaan.lahan) return;
      const x = chart.scales.x.getPixelForValue(keadaan.indeksTanam + keadaan.pilihan);
      const { top, bottom } = chart.chartArea;
      const ctx = chart.ctx;
      ctx.save();
      ctx.strokeStyle = "rgba(74,222,128,0.95)";
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom); ctx.stroke();
      ctx.restore();
    },
  };

  function opsiGrafik(judulY, minY, maxY) {
    return {
      responsive: true, maintainAspectRatio: false, animation: { duration: 400 },
      interaction: { mode: "index", intersect: false },
      plugins: { legend: { labels: { color: "#cbd5e1", boxWidth: 14 } } },
      scales: {
        x: { ticks: { color: "#94a3b8", maxTicksLimit: 12 }, grid: { color: "rgba(148,163,184,0.08)" } },
        y: { min: minY, max: maxY, title: { display: true, text: judulY, color: "#94a3b8" },
             ticks: { color: "#94a3b8" }, grid: { color: "rgba(148,163,184,0.08)" } },
      },
      // Klik grafik di dalam area arsir → pilih baris tabel yang sesuai.
      onClick: (_e, elemen) => {
        if (!elemen.length) return;
        const i = elemen[0].index - keadaan.indeksTanam;
        if (i >= 0 && i < JUMLAH) pilihBaris(i);
      },
    };
  }

  function garis(label, data, warna, tambahan = {}) {
    return { label, data, borderColor: warna, backgroundColor: warna, pointRadius: 0, borderWidth: 2, tension: 0.3, ...tambahan };
  }

  function siapkanGrafik() {
    Chart.defaults.font.family = "Inter";
    const label = DATA.map((d) => d.kunci);
    grafik.spi = new Chart($("grafikSpi"), {
      type: "line",
      data: { labels: label, datasets: [
        garis("SPI-3 observasi", DATA.map((d) => d.spi_obs), "#e2e8f0"),
        garis("SPI-3 prediksi RF", DATA.map((d) => d.spi_rf), "#4ade80"),
        garis(`Ambang kering (${f(K.ambangSpiKering)})`, DATA.map(() => K.ambangSpiKering), "#ef4444", { borderDash: [6, 5], borderWidth: 1.5, tension: 0 }),
      ] },
      options: opsiGrafik("SPI-3"), plugins: [pluginPenanda],
    });
    grafik.spei = new Chart($("grafikSpei"), {
      type: "line",
      data: { labels: label, datasets: [
        garis("SPEI-3 observasi", DATA.map((d) => d.spei_obs), "#e2e8f0"),
        garis("SPEI-3 prediksi RF", DATA.map((d) => d.spei_rf), "#38bdf8"),
      ] },
      options: opsiGrafik("SPEI-3"), plugins: [pluginPenanda],
    });
    grafik.h = new Chart($("grafikH"), {
      type: "line",
      data: { labels: label, datasets: [
        garis("H observasi", DATA.map((d) => R.bahayaBaris(d, "obs")), "#e2e8f0", { stepped: true, tension: 0 }),
        garis("H prediksi RF", DATA.map((d) => R.bahayaBaris(d, "rf")), "#fb923c", { stepped: true, tension: 0, borderDash: [4, 3] }),
      ] },
      options: opsiGrafik("Skor H (1–5)", 0.5, 5.5), plugins: [pluginPenanda],
    });
    grafik.hujan = new Chart($("grafikHujan"), {
      type: "bar",
      data: { labels: label, datasets: [
        { type: "bar", label: "Hujan observasi (NASA POWER)", data: DATA.map((d) => d.p_obs),
          backgroundColor: "rgba(56,189,248,0.45)", borderRadius: 3, order: 3 },
        garis("Hujan prediksi RF", DATA.map((d) => d.p_rf), "#4ade80", { type: "line", order: 1 }),
        garis("ET₀ prediksi RF", DATA.map((d) => d.et0_rf), "#fb923c", { type: "line", borderDash: [5, 4], order: 2 }),
        garis("Normal BMKG 1991–2020", DATA.map((d) => normalBmkg(d.kunci)), "#e2e8f0", { type: "line", borderWidth: 1.2, borderDash: [2, 3], order: 2 }),
        garis(`Ambang tanam (${K.ambangHujanTanam} mm)`, DATA.map(() => K.ambangHujanTanam), "#ef4444", { type: "line", borderDash: [6, 5], borderWidth: 1.2, tension: 0, order: 2 }),
      ] },
      options: opsiGrafik("mm / dasarian", 0), plugins: [pluginPenanda],
    });
  }

  // Grafik riwayat 1991–2023 (tahun asli, tidak digeser): arsir periode latih/validasi/uji model.
  function siapkanRiwayat() {
    const H = window.DATA_HISTORIS;
    const label = H.map((d) => d.kunci);
    const arsirPeriode = {
      id: "arsirPeriode",
      beforeDatasetsDraw(chart) {
        const x = chart.scales.x;
        const { top, bottom } = chart.chartArea;
        const ctx = chart.ctx;
        ctx.save();
        K.periodeModel.forEach((p) => {
          const i0 = label.findIndex((k) => Number(k.slice(0, 4)) >= p.dari);
          const i1 = label.map((k) => Number(k.slice(0, 4)) <= p.sampai).lastIndexOf(true);
          if (i0 < 0 || i1 < i0) return;
          const kiri = x.getPixelForValue(i0), kanan = x.getPixelForValue(i1);
          ctx.fillStyle = p.warna;
          ctx.fillRect(kiri, top, kanan - kiri, bottom - top);
          ctx.fillStyle = "#94a3b8";
          ctx.font = "600 11px Inter";
          ctx.fillText(`${p.nama} ${p.dari}–${p.sampai}`, kiri + 6, top + 14);
        });
        ctx.restore();
      },
    };
    const opsi = opsiGrafik("indeks (tanpa satuan)", -3.5, 3.5);
    delete opsi.onClick;
    opsi.scales.x.ticks = { color: "#94a3b8", autoSkip: false, maxRotation: 0,
      callback: (i) => (label[i].endsWith("-01-I") && Number(label[i].slice(0, 4)) % 4 === 3 ? label[i].slice(0, 4) : "") };
    opsi.scales.x.grid = { display: false };
    grafik.riwayat = new Chart($("grafikRiwayat"), {
      type: "line",
      data: { labels: label, datasets: [
        garis("SPI-3 observasi", H.map((d) => d.spi), "#4ade80", { borderWidth: 1.2, tension: 0 }),
        garis("SPEI-3 observasi", H.map((d) => d.spei), "#38bdf8", { borderWidth: 1.2, tension: 0 }),
        garis(`Ambang kering (${f(K.ambangSpiKering)})`, H.map(() => K.ambangSpiKering), "#ef4444", { borderDash: [6, 5], borderWidth: 1.2, tension: 0 }),
      ] },
      options: opsi, plugins: [arsirPeriode],
    });
    const kering = H.filter((d) => d.spi !== null && d.spi <= K.ambangSpiKering).length;
    $("infoRiwayat").textContent = `${H.length} dasarian · ${kering} dasarian SPI-3 ≤ −1 · uji 2022–2023 = musim demo (tampil sebagai 2026–2027)`;
  }

  function tandaiGrafik() {
    Object.values(grafik).forEach((g) => g.update("none"));
  }

  // Tabel kinerja RF vs persistensi vs klimatologi — metrik sama dengan slide "Hasil Validasi Model"
  // (MAE SPI/SPEI, recall deteksi kering) + RMSE dan akurasi skor H. Label tahun = tahun asli data.
  function gambarTabelKinerja() {
    const rentangTahun = (d) => `${d[0].tahun}–${d[d.length - 1].tahun}`;
    const metode = [["Random Forest", "rf"], ["Persistence", "persistensi"], ["Climatology", "klimatologi"]];
    const kolom = [
      ["MAE SPI", (k) => k.spi.mae, "min", (v) => f(v, 4)],
      ["MAE SPEI", (k) => k.spei.mae, "min", (v) => f(v, 4)],
      ["RMSE SPI", (k) => k.spi.rmse, "min", (v) => f(v, 3)],
      ["RMSE SPEI", (k) => k.spei.rmse, "min", (v) => f(v, 3)],
      ["Recall SPI", (k) => k.spi.recall, "max", (v, k) => `${f(v, 0)}% <span class="kecil">(${k.spi.terdeteksi}/${k.spi.kejadian})</span>`],
      ["Recall SPEI", (k) => k.spei.recall, "max", (v, k) => `${f(v, 0)}% <span class="kecil">(${k.spei.terdeteksi}/${k.spei.kejadian})</span>`],
      ["Akurasi H", (k) => k.akurasiH, "max", (v) => `${f(v, 1)}%`],
    ];
    const tabel = (judul, data) => {
      const nilai = metode.map(([, kode]) => R.hitungKinerja(data, kode));
      let html = `<div class="judul-kinerja">${judul} · ${data.length} dasarian</div><div class="wadah-tabel"><table class="kinerja">
        <tr><th>Model</th>${kolom.map(([n]) => `<th>${n}</th>`).join("")}</tr>`;
      metode.forEach(([nama], i) => {
        html += `<tr><td>${nama}</td>` + kolom.map(([, ambil, arah, tulis]) => {
          const semua = nilai.map(ambil);
          const terbaik = arah === "min" ? Math.min(...semua) : Math.max(...semua);
          const v = ambil(nilai[i]);
          return `<td class="${Math.abs(v - terbaik) < 1e-9 ? "terbaik" : ""}">${tulis(v, nilai[i])}</td>`;
        }).join("") + "</tr>";
      });
      return html + "</table></div>";
    };
    const rf = R.hitungKinerja(window.DATA_HAZARD, "rf");
    $("tabelKinerja").innerHTML =
      tabel(`Uji ${rentangTahun(window.DATA_HAZARD)}`, window.DATA_HAZARD) +
      tabel(`Validasi ${rentangTahun(window.DATA_VALIDASI)}`, window.DATA_VALIDASI) +
      `<div class="catatan">MAE/RMSE = besar kesalahan indeks (makin kecil makin baik). Recall = dari dasarian yang benar-benar kering
      (indeks ≤ −1), berapa yang terdeteksi: RF uji SPI ${rf.spi.terdeteksi} dari ${rf.spi.kejadian}, SPEI ${rf.spei.terdeteksi} dari ${rf.spei.kejadian}.
      Akurasi H = % dasarian dengan skor H prediksi sama dengan observasi. Hijau = terbaik.
      Model dilatih 1991–2015 di Colab. Persistence = "berikutnya sama dengan sekarang"; climatology = rata-rata historis dasarian yang sama.</div>`;
  }

  // ===================================================================
  // 9. PERAN PENGGUNA (Petani, P3A, Penyuluh, Administrator)
  // ===================================================================
  // Tiap elemen ber-atribut data-bagian ditampilkan hanya bila bagian itu
  // ada di daftar CONFIG.peran[...].bagian. Belum ada login (prototipe).

  const KUNCI_PERAN = "ews-peran";
  let peranAktif = null;

  function siapkanPeran() {
    $("inPeran").innerHTML = K.peran.map((p) => `<option value="${p.kode}">${p.nama}</option>`).join("");
    let simpanan = null;
    try { simpanan = localStorage.getItem(KUNCI_PERAN); } catch (e) { /* localStorage tidak tersedia */ }
    $("inPeran").value = K.peran.some((p) => p.kode === simpanan) ? simpanan : K.peranAwal;
    $("inPeran").addEventListener("change", () => {
      try { localStorage.setItem(KUNCI_PERAN, $("inPeran").value); } catch (e) { /* abaikan */ }
      terapkanPeran();
    });
    terapkanPeran();
  }

  function terapkanPeran() {
    peranAktif = K.peran.find((p) => p.kode === $("inPeran").value);
    $("ketPeran").textContent = peranAktif.keterangan;
    document.querySelectorAll("[data-bagian]").forEach((el) => {
      el.hidden = !peranAktif.bagian.includes(el.dataset.bagian);
    });
    // Baris grid yang tinggal satu kartu → lebarkan penuh.
    document.querySelectorAll(".grid-simulasi, .grid-laporan, .grid-grafik, .grid-cuaca").forEach((grid) => {
      const terlihat = [...grid.children].filter((el) => !el.hidden).length;
      grid.classList.toggle("satu-kolom", terlihat === 1);
      grid.hidden = terlihat === 0;
    });
    // Peta & grafik perlu diukur ulang setelah kotaknya muncul kembali.
    if (petaLeaflet) setTimeout(() => petaLeaflet.invalidateSize(), 0);
    Object.values(grafik).forEach((g) => g.resize());
    gambarRekapLaporan();
  }

  const bolehLihat = (bagian) => peranAktif && peranAktif.bagian.includes(bagian);

  // ===================================================================
  // 10. LAPORAN LAPANGAN (umpan balik → validasi & tuning ulang model)
  // ===================================================================
  // Disimpan di localStorage browser (tanpa server). Status prediksi saat
  // laporan dikirim ikut disimpan, lalu dibandingkan dengan kondisi lapangan.

  const KUNCI_LAPORAN = "ews-laporan-lapangan";

  function bacaLaporan() {
    try { return JSON.parse(localStorage.getItem(KUNCI_LAPORAN)) || []; } catch (e) { return []; }
  }
  function simpanLaporan(daftar) {
    try { localStorage.setItem(KUNCI_LAPORAN, JSON.stringify(daftar)); return true; } catch (e) { return false; }
  }

  function siapkanLaporan() {
    $("lapKondisi").innerHTML = K.kondisiLapangan.map((k) => `<option value="${k.tingkat}">${k.nama}</option>`).join("");
    const tampilCiri = () => {
      const k = K.kondisiLapangan[Number($("lapKondisi").value)];
      $("lapCiri").textContent = `Ciri: ${k.ciri}`;
    };
    $("lapKondisi").addEventListener("change", tampilCiri);
    tampilCiri();

    $("formLaporan").addEventListener("submit", (e) => {
      e.preventDefault();
      const i = Number($("lapDasarian").value);
      const prediksi = keadaan.hasilAwal[i]; // status prediksi tanpa skenario
      const laporan = {
        waktu: new Date().toISOString(),
        kunci: prediksi.baris.kunci,
        tingkat: Number($("lapKondisi").value),
        pelapor: $("lapPelapor").value.trim(),
        peran: peranAktif.nama,
        catatan: $("lapCatatan").value.trim(),
        wilayah: keadaan.lahan.nama,
        statusPrediksi: prediksi.status.nama,
        H: prediksi.H,
        R: prediksi.bera ? null : Number(prediksi.R.toFixed(2)),
      };
      const daftar = bacaLaporan();
      daftar.push(laporan);
      const ok = simpanLaporan(daftar);
      $("lapInfo").textContent = ok
        ? `✓ Laporan ${laporan.kunci} tersimpan (${R.bandingkanLaporan(laporan.statusPrediksi, laporan.tingkat).hasil.toLowerCase()}).`
        : "Gagal menyimpan: penyimpanan browser tidak tersedia.";
      $("lapCatatan").value = "";
      gambarRekapLaporan();
    });

    $("tombolEksporLaporan").addEventListener("click", eksporLaporan);
  }

  // Pilihan dasarian laporan = 12 dasarian musim tanam yang sedang di-generate.
  function isiPilihanLaporan() {
    $("lapDasarian").innerHTML = keadaan.hasilAwal
      .map((h, i) => `<option value="${i}">${h.baris.kunci} · ${rentangTanggal(h.baris.kunci)}</option>`).join("");
    $("lapDasarian").value = keadaan.pilihan;
  }

  function gambarRekapLaporan() {
    if (!bolehLihat("rekapLaporan")) return;
    const daftar = bacaLaporan();
    if (!daftar.length) {
      $("rekapLaporan").innerHTML = `<div class="kosong kecil">Belum ada laporan. Kirim laporan lewat formulir ④.</div>`;
      return;
    }
    const banding = daftar.map((l) => R.bandingkanLaporan(l.statusPrediksi, l.tingkat));
    const sesuai = banding.filter((b) => b.selisih === 0).length;
    const ringan = banding.filter((b) => b.selisih > 0).length;
    const berat = banding.filter((b) => b.selisih < 0).length;
    const warnaStatus = (nama) => (K.status.find((s) => s.nama === nama) || K.statusBera).warna;
    const bolehHapus = bolehLihat("kelolaLaporan");

    let html = `<div class="rekap-angka">
        <div><b>${daftar.length}</b><span>laporan</span></div>
        <div><b style="color:${K.status[0].warna}">${f((sesuai / daftar.length) * 100, 0)}%</b><span>sesuai prediksi</span></div>
        <div><b style="color:${K.status[3].warna}">${ringan}</b><span>prediksi terlalu ringan</span></div>
        <div><b style="color:${K.status[1].warna}">${berat}</b><span>prediksi terlalu berat</span></div>
      </div>
      <div class="wadah-tabel"><table class="tabel-prakiraan tabel-laporan"><thead><tr>
        <th>Dasarian</th><th>Status prediksi</th><th>Kondisi lapangan</th><th>Hasil</th><th>Pelapor</th><th>Catatan</th>${bolehHapus ? "<th></th>" : ""}
      </tr></thead><tbody>`;
    daftar.slice().reverse().forEach((l, j) => {
      const asli = daftar.length - 1 - j;
      const b = banding[asli];
      const kondisi = K.kondisiLapangan[l.tingkat];
      const warnaHasil = b.selisih === 0 ? K.status[0].warna : b.selisih > 0 ? K.status[3].warna : K.status[1].warna;
      html += `<tr>
        <td><b>${l.kunci}</b><div class="kecil">${new Date(l.waktu).toLocaleDateString("id-ID")}</div></td>
        <td><span class="pil-status" style="background:${warnaStatus(l.statusPrediksi)}">${l.statusPrediksi}</span></td>
        <td><span class="pil-status" style="background:${K.status[l.tingkat].warna}">${kondisi.nama}</span></td>
        <td style="color:${warnaHasil};font-weight:700">${b.hasil}</td>
        <td>${esc(l.pelapor)}<div class="kecil">${esc(l.peran)}</div></td>
        <td class="rekom-singkat">${esc(l.catatan) || "–"}</td>
        ${bolehHapus ? `<td><button class="tombol-ikon" data-hapus="${asli}" title="Hapus laporan">🗑</button></td>` : ""}
      </tr>`;
    });
    html += `</tbody></table></div>
      <div class="catatan">Kondisi lapangan disetarakan dengan status: Air cukup = Aman, Mulai kering = Waspada,
        Kering = Siaga, Sangat kering = Awas. "Terlalu ringan" berarti kekeringan terlewat oleh model
        (dipakai untuk tuning ambang/model); "terlalu berat" berarti alarm palsu.</div>`;
    $("rekapLaporan").innerHTML = html;
    $("rekapLaporan").querySelectorAll("[data-hapus]").forEach((tombol) =>
      tombol.addEventListener("click", () => {
        const daftarBaru = bacaLaporan();
        daftarBaru.splice(Number(tombol.dataset.hapus), 1);
        simpanLaporan(daftarBaru);
        gambarRekapLaporan();
      }));
  }

  // Ekspor laporan ke CSV (dibuka di Excel) untuk diolah tim model.
  function eksporLaporan() {
    const daftar = bacaLaporan();
    const kolom = ["waktu", "wilayah", "kunci", "statusPrediksi", "H", "R", "kondisi", "hasil", "pelapor", "peran", "catatan"];
    const sel = (x) => `"${String(x ?? "").replace(/"/g, '""')}"`;
    const baris = daftar.map((l) => {
      const lengkap = { ...l, kondisi: K.kondisiLapangan[l.tingkat].nama, hasil: R.bandingkanLaporan(l.statusPrediksi, l.tingkat).hasil };
      return kolom.map((k) => sel(lengkap[k])).join(",");
    });
    const blob = new Blob(["﻿" + [kolom.join(","), ...baris].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "laporan-lapangan.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Cegah teks isian pengguna terbaca sebagai HTML.
  function esc(teks) {
    return String(teks ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ===================================================================
  // MULAI
  // ===================================================================

  // Unit test kecil aturan H (hasil tampil di Console, tekan F12).
  function ujiAturanBahaya() {
    const harapan = [
      [1, 2, 2, 3, 3],
      [2, 2, 3, 3, 4],
      [2, 3, 3, 4, 4],
      [3, 3, 4, 4, 5],
      [3, 4, 4, 5, 5],
    ];
    // Nilai indeks yang mewakili tiap skor 1..5
    const contohNilai = { 1: 0, 2: -1.2, 3: -1.6, 4: -1.9, 5: -2.5 };
    let lulusMatriks = true;
    for (let a = 1; a <= 5; a++) {
      for (let b = 1; b <= 5; b++) {
        if (R.skorBahaya(contohNilai[a], contohNilai[b]) !== harapan[a - 1][b - 1]) lulusMatriks = false;
      }
    }
    const kasus = [
      ["skorBahaya(-1.89, 0.68) === 3", R.skorBahaya(-1.89, 0.68) === 3],
      ["skorBahaya(-2.1, -2.1) === 5", R.skorBahaya(-2.1, -2.1) === 5],
      ["skorBahaya(0.5, 0.5) === 1", R.skorBahaya(0.5, 0.5) === 1],
      ["25 sel matriks sesuai tabel", lulusMatriks],
    ];
    const uji = window.DATA_HAZARD;
    const sebaran = {};
    uji.forEach((d) => { const h = R.bahayaBaris(d, "obs"); sebaran[h] = (sebaran[h] || 0) + 1; });
    const akurasi = R.hitungKinerja(uji, "rf").akurasiH;
    kasus.push(["Sebaran H observasi uji: 1=61, 2=6, 4=2", sebaran[1] === 61 && sebaran[2] === 6 && sebaran[4] === 2 && Object.keys(sebaran).length === 3]);
    kasus.push(["Akurasi H prediksi RF = 87,0%", akurasi.toFixed(1) === "87.0"]);
    // Angka slide "Hasil Validasi Model" (toleransi 0,00005)
    const kin = R.hitungKinerja(uji, "rf");
    kasus.push(["MAE SPI RF ≈ 0,2897 · MAE SPEI RF ≈ 0,2955", Math.abs(kin.spi.mae - 0.2897) < 5e-5 && Math.abs(kin.spei.mae - 0.2955) < 5e-5]);
    kasus.push(["Recall SPI 1/5 · Recall SPEI 2/7", kin.spi.terdeteksi === 1 && kin.spi.kejadian === 5 && kin.spei.terdeteksi === 2 && kin.spei.kejadian === 7]);

    console.group("Uji aturan Bahaya H (Subbab 3.1.6)");
    kasus.forEach(([nama, lulus]) => console.log(`${lulus ? "✅ LULUS" : "❌ GAGAL"}  ${nama}`));
    console.log("Sebaran H observasi (uji):", sebaran, `· akurasi H RF: ${akurasi.toFixed(1)}%`);
    console.groupEnd();
  }

  function mulai() {
    ujiAturanBahaya();
    $("infoStasiun").textContent = K.stasiun;
    siapkanForm();
    siapkanPeta();
    siapkanGrafik();
    siapkanRiwayat();
    siapkanSliderSkenario();
    gambarTabelKinerja();
    siapkanLaporan();
    generate(); // langsung tampilkan hasil dari nilai awal form
    siapkanPeran();
  }

  document.addEventListener("DOMContentLoaded", mulai);
})();
