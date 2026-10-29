import { Cron } from "croner";
import { buatLayananTutupHari, type LayananTutupHari } from "./modul/tutup-hari/layanan";
import type { Db } from "./platform/db/klien";

/**
 * Penjadwal tutup hari: berdetak tiap jam (menit ke-5) dan sekali saat server
 * menyala — menyusul bila server mati saat tengah malam. Sapuan sendiri yang
 * memilih kantor mana yang tengah malamnya sudah lewat (zona masing-masing);
 * detak yang tumpang tindih dilewati (`protect`).
 */
function jadwalkanTutupHari(layanan: LayananTutupHari) {
  const detak = async () => {
    const { selesai, gagal } = await layanan.sapu();
    for (const h of selesai) {
      console.log(
        `tutup hari ${h.tanggal} kantor ${h.kantorId}: ${h.keMacet} macet, ${h.pulih} pulih, ${h.potret} potret`,
      );
    }
    for (const g of gagal) console.error(`tutup hari GAGAL kantor ${g.kantorId}`, g.galat);
  };
  const tugas = new Cron("5 * * * *", { name: "tutup-hari", protect: true, catch: true }, detak);
  void tugas.trigger();
  return tugas;
}

/** Memulai semua pekerjaan terjadwal server (kini: sapuan tutup hari). */
export function mulaiJadwal(db: Db) {
  return { tutupHari: jadwalkanTutupHari(buatLayananTutupHari({ db })) };
}
