import type { Peristiwa } from "@opennael/contracts";
import { DialogBatal } from "@/komponen/dialog-batal";
import { ambil, api } from "@/lib/api";

/** Hapus tanda libur salah (bos, hari yang sama) — kolektor bisa mencatat setoran lagi. */
export function DialogHapusLibur({ libur, tutup }: { libur: Peristiwa; tutup: () => void }) {
  return (
    <DialogBatal
      judul={`Hapus tanda libur ${libur.nasabah.nama}?`}
      keterangan="Tanda libur hari ini dihapus dan tercatat di riwayat. Sesudahnya kolektor bisa mencatat setoran pinjaman ini lagi."
      segarkan={[["nasabah"], ["harian"]]}
      tutup={tutup}
      kirim={(alasan) =>
        ambil(() =>
          api.pembiayaan.transaksi.libur[":id"].hapus.$post({
            param: { id: libur.id },
            json: { alasan },
          }),
        )
      }
    />
  );
}
