// =====================================================================
// data-lahan.js — NILAI AWAL form "Data lahan" untuk SATU wilayah sawah.
// Semua angka di sini DUMMY dan bisa diubah langsung di form dashboard.
// ---------------------------------------------------------------------
// Arti kolom:
//   luas_ha             luas wilayah sawah (hektar). TIDAK ada di form, tapi tetap
//                       dipakai rumus C: Ialt = Q×3,6×h/(10×A) dan T = embung/(10×A×d)
//   tekstur             tekstur tanah (USDA), dipakai bila AWC kosong
//   awc_mm_per_m        Available Water Capacity (mm per meter tanah), null = tidak ada data
//   perkolasi_mm_hari   kehilangan air ke bawah (mm/hari)
//   irigasi_mm_hari     pasokan irigasi saluran (mm/hari)
//   pompa_debit_L_detik, pompa_jam_hari   pompa air (0 = tidak punya)
//   embung_m3           volume tampungan embung (0 = tidak punya)
//   koordinat           sudut poligon wilayah [lat, lon] (±1 km timur titik studi)
// Tanggal tanam TIDAK di sini: dipilih di form (dasarian tanam).
// =====================================================================

window.DATA_LAHAN = {
  nama: "Hamparan Sawah Ranomeeto",
  luas_ha: 5,
  tekstur: "sandy loam",
  awc_mm_per_m: null,
  perkolasi_mm_hari: 7,
  irigasi_mm_hari: 3,
  pompa_debit_L_detik: 0,
  pompa_jam_hari: 0,
  embung_m3: 0,
  koordinat: [[-4.056937, 122.456626], [-4.056423, 122.458866], [-4.054734, 122.458539], [-4.054876, 122.457414], [-4.055259, 122.456256]],
};
