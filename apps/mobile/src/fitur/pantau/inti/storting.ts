import type { TransaksiHari } from "@opennael/contracts";
import type { JenisPinjaman } from "@opennael/domain";
import { LABEL_JENIS_TRANSAKSI, rupiah } from "@opennael/format";

/**
 * TAB STORTING (mode Semua) — setoran yang masuk hari ini dari ketiga jenis
 * pinjaman, dari `GET /transaksi` (setoran berlaku kolektor ini + transfernya).
 * Storting = setoran murni + setoran pelunasan − tabungan keluar (istilah di
 * docs/produk.md); negatif bila tabungan nasabah melebihi saldo saat lunas
 * (aturan-usaha D2: selisihnya dikembalikan tunai). PURE.
 */

export interface RingkasStorting {
  /** Σ storting — uang setoran yang masuk. */
  total: number;
  murni: number;
  pelunasan: number;
  tabunganKeluar: number;
  /** Σ bagian yang dibayar lewat transfer (dicatat kasir). */
  transfer: number;
  /** Banyaknya setoran. */
  jumlah: number;
}

export function ringkasStorting(daftar: readonly TransaksiHari[]): RingkasStorting {
  const r: RingkasStorting = {
    total: 0,
    murni: 0,
    pelunasan: 0,
    tabunganKeluar: 0,
    transfer: 0,
    jumlah: daftar.length,
  };
  for (const t of daftar) {
    r.total += t.storting;
    r.murni += t.setoranMurni;
    r.pelunasan += t.setoranPelunasan;
    r.tabunganKeluar += t.tabunganKeluar;
    r.transfer += t.transfer?.nominal ?? 0;
  }
  return r;
}

export interface BarisStorting {
  id: string;
  pinjamanId: string;
  jenis: JenisPinjaman;
  /** Nama apa adanya dari server (layar merapikan huruf besar-kecilnya). */
  nama: string;
  kampung: string;
  /** "Angsuran" / "Pelunasan" / "Gulung". */
  jenisTransaksi: string;
  storting: number;
  /** Penyusun storting bila bukan angsuran polos, mis. "murni Rp 50.000 · pelunasan Rp 100.000". */
  rincian: string | null;
  /** Nominal transfer yang menempel; null = tunai seluruhnya. */
  transfer: number | null;
}

export function barisStorting(t: TransaksiHari): BarisStorting {
  const bagian: string[] = [];
  if (t.setoranMurni > 0) bagian.push(`murni ${rupiah(t.setoranMurni)}`);
  if (t.setoranPelunasan > 0) bagian.push(`pelunasan ${rupiah(t.setoranPelunasan)}`);
  if (t.tabunganKeluar > 0) bagian.push(`tabungan keluar ${rupiah(t.tabunganKeluar)}`);
  return {
    id: t.id,
    pinjamanId: t.pinjamanId,
    jenis: t.jenisPinjaman,
    nama: t.nasabah.nama,
    kampung: t.kampung,
    jenisTransaksi: LABEL_JENIS_TRANSAKSI[t.jenis],
    storting: t.storting,
    // Angsuran polos (hanya setoran murni) tak perlu dirinci.
    rincian: bagian.length > 1 || t.tabunganKeluar > 0 ? bagian.join(" · ") : null,
    transfer: t.transfer?.nominal ?? null,
  };
}
