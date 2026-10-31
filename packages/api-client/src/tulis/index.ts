import type { Bahan } from "../bahan";

/**
 * TULISAN BERSAMA — pembatalan uang oleh bos (aturan-usaha L1): semua rute
 * `…/batal` di satu tempat, karena layar asalnya dan daftar aktivitas memanggil
 * rute yang sama; satu definisi per rute menjaga keduanya tetap sama. Penulisan
 * lain yang hanya punya satu pemakai tetap di dialognya.
 *
 * Semua operasi di sini ada di `OPERASI_IDEMPOTEN` (packages/contracts):
 * transport mengulangnya dengan kunci yang sama bila sinyal putus.
 */
export function buatTulis({ api, ambil }: Bahan) {
  return {
    batal: {
      /** Batalkan akad atau salinan buku (pinjaman). */
      pinjaman: (id: string, alasan: string) =>
        ambil(() =>
          api.pembiayaan.pinjaman[":id"].batal.$post({ param: { id }, json: { alasan } }),
        ),
      pemutihan: (id: string, alasan: string) =>
        ambil(() =>
          api.pembiayaan.pinjaman[":id"].putihkan.batal.$post({ param: { id }, json: { alasan } }),
        ),
      /** Satu setoran nasabah (sebelum ada transfer/serah terima yang bergantung padanya). */
      transaksi: (id: string, alasan: string) =>
        ambil(() =>
          api.pembiayaan.transaksi[":id"].batal.$post({ param: { id }, json: { alasan } }),
        ),
      transferSetoran: (id: string, alasan: string) =>
        ambil(() =>
          api.hariKolektor["transfer-setoran"][":id"].batal.$post({
            param: { id },
            json: { alasan },
          }),
        ),
      serahTerimaKas: (id: string, alasan: string) =>
        ambil(() =>
          api.hariKolektor["serah-terima-kas"][":id"].batal.$post({
            param: { id },
            json: { alasan },
          }),
        ),
      biayaTakTerduga: (id: string, alasan: string) =>
        ambil(() =>
          api.hariKolektor["biaya-tak-terduga"][":id"].batal.$post({
            param: { id },
            json: { alasan },
          }),
        ),
      /** Buka lagi laporan harian seorang kolektor (batal laporan). */
      laporanKolektor: (kolektorId: string, alasan: string) =>
        ambil(() =>
          api.hariKolektor["hari-kolektor"][":kolektorId"].laporan.batal.$post({
            param: { kolektorId },
            json: { alasan },
          }),
        ),
      mutasiKas: (id: string, alasan: string) =>
        ambil(() => api.kas.kas.mutasi[":id"].batal.$post({ param: { id }, json: { alasan } })),
      pencocokanKas: (id: string, alasan: string) =>
        ambil(() => api.kas.kas.pencocokan[":id"].batal.$post({ param: { id }, json: { alasan } })),
      gaji: (id: string, alasan: string) =>
        ambil(() =>
          api.penggajian.kas.gaji[":id"].batal.$post({ param: { id }, json: { alasan } }),
        ),
      penarikanTabungan: (id: string, alasan: string) =>
        ambil(() =>
          api.pembiayaan["penarikan-tabungan"][":id"].batal.$post({
            param: { id },
            json: { alasan },
          }),
        ),
    },
  };
}

export type Tulis = ReturnType<typeof buatTulis>;
