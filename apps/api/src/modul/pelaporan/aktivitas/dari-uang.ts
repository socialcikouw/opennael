import type { Db } from "../../../platform/db/klien";
import { bacaBarisUang } from "./baris-uang";
import { catatDanBatal, type Kejadian, LABEL_MUTASI, LABEL_PEMUTIHAN } from "./data";

/** Baris tabel uang bertanggal `tanggal` (dicatat atau dibatalkan hari itu) → kejadian. */
export async function dariUang(
  db: Db,
  kantorId: string,
  tanggal: string,
  mulai: Date,
  selesai: Date,
  bos: boolean,
) {
  const {
    akad,
    putih,
    batalSetoran,
    transfer,
    terima,
    biaya,
    mutasi,
    gaji,
    tarik,
    koreksi,
    cocok,
  } = await bacaBarisUang(db, kantorId, tanggal, mulai, selesai, bos);

  const hasil: Kejadian[] = [];
  for (const b of akad) {
    hasil.push(
      ...(b.asal === "migrasi"
        ? catatDanBatal(b, "pinjaman", "salin_pinjaman", {
            ringkasan: `Salin dari buku: ${b.jenis} ${b.nasabah} (pinjaman ke-${b.pinjamanKe})`,
            nominal: b.saldoAwal,
          })
        : catatDanBatal(b, "pinjaman", "akad", {
            ringkasan: `Akad ${b.asal} ${b.jenis} ${b.nasabah} (pinjaman ke-${b.pinjamanKe})`,
            nominal: b.pokok,
          })),
    );
  }
  for (const b of putih) {
    if (!b.waktu || !b.pelakuId) continue;
    hasil.push({
      waktu: b.waktu,
      pelakuId: b.pelakuId,
      kejadian: "pemutihan",
      ringkasan: `Putihkan pinjaman ${b.nasabah}`,
      nominal: b.saldo,
      alasan:
        [b.alasan && LABEL_PEMUTIHAN[b.alasan], b.keterangan].filter(Boolean).join(" — ") || null,
      rujukan: { tabel: "pinjaman", id: b.id },
    });
  }
  for (const b of batalSetoran) {
    if (!b.waktu || !b.pelakuId) continue;
    hasil.push({
      waktu: b.waktu,
      pelakuId: b.pelakuId,
      kejadian: "batal_setoran",
      ringkasan: `Batal setoran ${b.nasabah}`,
      nominal: b.setoranMurni + b.setoranPelunasan,
      alasan: b.alasan,
      rujukan: { tabel: "transaksi", id: b.id },
    });
  }
  for (const b of transfer) {
    hasil.push(
      ...catatDanBatal(b, "transfer_setoran", "transfer_setoran", {
        ringkasan: `Transfer setoran ${b.nasabah}`,
        nominal: b.nominal,
      }),
    );
  }
  for (const b of terima) {
    const selisih = b.selisih < 0 ? " — tekor" : b.selisih > 0 ? " — lebih setor" : "";
    hasil.push(
      ...catatDanBatal(b, "serah_terima_kas", "terima_kas", {
        ringkasan: `Terima setoran sore ${b.kolektor}${selisih}`,
        nominal: b.tunaiDiterima,
      }),
    );
  }
  for (const b of biaya) {
    hasil.push(
      ...catatDanBatal(b, "biaya_tak_terduga", "biaya_tak_terduga", {
        ringkasan: `Biaya tak terduga ${b.kolektor}: ${b.keterangan}`,
        nominal: b.nominal,
      }),
    );
  }
  for (const b of mutasi) {
    hasil.push(
      ...catatDanBatal(b, "mutasi_kas_kantor", "mutasi_kas", {
        ringkasan: `${LABEL_MUTASI[b.jenis] ?? b.jenis}: ${b.keterangan}`,
        nominal: b.nominal,
      }),
    );
  }
  for (const b of gaji) {
    hasil.push(
      ...catatDanBatal(b, "pembayaran_gaji", "bayar_gaji", {
        ringkasan: `Bayar gaji ${b.kolektor} ${b.periodeMulai} s.d. ${b.periodeSelesai}`,
        nominal: b.gajiBersih,
      }),
    );
  }
  for (const b of tarik) {
    hasil.push(
      ...catatDanBatal(b, "penarikan_tabungan", "tarik_tabungan", {
        ringkasan: `Tarik tabungan ${b.nasabah}`,
        nominal: b.nominal,
        alasan: b.alasan,
      }),
    );
  }
  for (const b of koreksi) {
    hasil.push({
      waktu: b.waktu,
      pelakuId: b.pelakuId,
      kejadian: "koreksi_tabungan",
      ringkasan: `Koreksi tabungan ${b.nasabah}`,
      nominal: b.selisih,
      alasan: b.alasan,
      rujukan: { tabel: "koreksi_tabungan", id: b.id },
    });
  }
  for (const b of cocok) {
    hasil.push(
      ...catatDanBatal(b, "pencocokan_kas", "cocokkan_kas", {
        ringkasan: `Cocokkan kas ${b.akun}`,
        nominal: b.selisih,
        alasan: b.keterangan,
      }),
    );
  }
  return hasil;
}
