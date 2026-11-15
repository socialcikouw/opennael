import { rupiah, tampilNama } from "@opennael/format";
import { Text, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { Bagian, Baris } from "@/komponen/ui/kartu";
import { WARNA } from "@/tema";
import type { HariKolektor } from "../data";

/**
 * Rincian tunai seharusnya satu hari kolektor (aturan-usaha I2) — hanya ada
 * sesudah kas diterima (hitung buta), dengan tekor / lebih setor.
 */
export function RincianKas({ hari }: { hari: HariKolektor }) {
  const r = hari.rincian;
  const st = hari.serahTerima;
  if (!r || !st) return null;
  const s = st.selisihSetor;
  return (
    <Bagian judul="RINCIAN KAS">
      <Baris label="Kas Lapangan (dibawa pagi)" nilai={rupiah(r.kasLapangan)} />
      <Baris label="+ Storting" nilai={rupiah(r.storting)} />
      <Baris label="+ Tabungan Masuk Akad" nilai={rupiah(r.tabunganMasuk)} />
      <Baris label="+ Potongan Admin" nilai={rupiah(r.potonganAdmin)} />
      <Baris label="− Droping" nilai={rupiah(r.droping)} />
      <Baris label="− Transfer Setoran" nilai={rupiah(r.transfer)} />
      <Baris label="− Biaya Tak Terduga" nilai={rupiah(r.biaya)} />
      <View style={g.tumpuk1}>
        <Baris label="Tunai Seharusnya" nilai={rupiah(st.tunaiSeharusnya)} tebal />
        <Baris label="Tunai Diterima" nilai={rupiah(st.tunaiDiterima)} tebal />
        <Baris
          label={s < 0 ? "Tekor" : s > 0 ? "Lebih Setor" : "Pas"}
          nilai={rupiah(s)}
          tebal
          warna={s < 0 ? WARNA.bahayaTeks : s > 0 ? WARNA.utama : WARNA.teks}
        />
      </View>
      <Text style={g.teksMini}>
        Kas {tampilNama(hari.kolektor.nama)} · diterima {tampilNama(st.diterimaOleh.nama)}
      </Text>
    </Bagian>
  );
}
