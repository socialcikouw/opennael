/** Stempel sementara di kartu yang baru dicatat. */
export type Stempel = "bayar" | "libur" | "lunas";

type Pendengar = (pinjamanId: string, stempel: Stempel) => void;
const pendengar = new Set<Pendengar>();

/**
 * Kabar dari layar transaksi (mis. Bayar) ke layar Tagihan di bawahnya:
 * kartu yang baru dicatat menampilkan stempel dulu, baru turun ke "Sudah
 * ditagih" — sama dengan transaksi langsung dari kartu.
 */
export const kabarTercatat = {
  kirim(pinjamanId: string, stempel: Stempel) {
    for (const p of pendengar) p(pinjamanId, stempel);
  },
  dengar(p: Pendengar) {
    pendengar.add(p);
    return () => {
      pendengar.delete(p);
    };
  },
};
