import { Cron } from "croner";
import { buatLayananTutupHari, type LayananTutupHari } from "./modul/pembiayaan";
import type { Db } from "./platform/db/klien";
import { ringkasGalat } from "./platform/http/galat";
import type { Log } from "./platform/log";

/**
 * Penjadwal tutup hari: berdetak tiap jam (menit ke-5) dan sekali saat server
 * menyala — menyusul bila server mati saat tengah malam. Sapuan sendiri yang
 * memilih kantor mana yang tengah malamnya sudah lewat (zona masing-masing);
 * detak yang tumpang tindih dilewati (`protect`).
 */
function jadwalkanTutupHari(layanan: LayananTutupHari, log: Log) {
  const detak = async () => {
    const { selesai, gagal } = await layanan.sapu();
    for (const h of selesai) {
      log.info(
        {
          tanggal: h.tanggal,
          kantorId: h.kantorId,
          keMacet: h.keMacet,
          pulih: h.pulih,
          potret: h.potret,
        },
        "tutup hari selesai",
      );
    }
    for (const g of gagal) {
      log.error({ kantorId: g.kantorId, galat: ringkasGalat(g.galat) }, "tutup hari GAGAL");
    }
  };
  // Sapuan yang gagal total (mis. database putus) dicatat, bukan ditelan diam-diam;
  // detak berikutnya tetap jalan.
  const tugas = new Cron(
    "5 * * * *",
    {
      name: "tutup-hari",
      protect: true,
      catch: (e) => log.error({ galat: ringkasGalat(e) }, "sapuan tutup hari gagal"),
    },
    detak,
  );
  void tugas.trigger();
  return tugas;
}

/** Memulai semua pekerjaan terjadwal server (kini: sapuan tutup hari). */
export function mulaiJadwal(db: Db, log: Log) {
  return { tutupHari: jadwalkanTutupHari(buatLayananTutupHari({ db }), log) };
}
