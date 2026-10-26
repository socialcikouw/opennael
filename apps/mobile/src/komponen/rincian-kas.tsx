import { Text, View } from "react-native";
import { rupiah } from "../lib/format";
import type { HariKolektor } from "../lib/setoran";
import { useWarna } from "./tampilan";
import { Baris, Kartu, useG } from "./ui";

/**
 * Rincian tunai seharusnya satu hari kolektor (aturan-usaha I2) — hanya ada
 * sesudah kas diterima (hitung buta), dengan tekor / lebih setor.
 */
export function RincianKas({ hari }: { hari: HariKolektor }) {
  const WARNA = useWarna();
  const g = useG();
  const r = hari.rincian;
  const st = hari.serahTerima;
  if (!r || !st) return null;
  const s = st.selisihSetor;
  return (
    <Kartu>
      <Text style={g.subjudul}>Kas {hari.kolektor.nama}</Text>
      <Baris label="Kas lapangan (dibawa pagi)" nilai={rupiah(r.kasLapangan)} />
      <Baris label="+ Storting" nilai={rupiah(r.storting)} />
      <Baris label="+ Tabungan masuk akad" nilai={rupiah(r.tabunganMasuk)} />
      <Baris label="+ Potongan admin" nilai={rupiah(r.potonganAdmin)} />
      <Baris label="− Droping" nilai={rupiah(r.droping)} />
      <Baris label="− Transfer setoran" nilai={rupiah(r.transfer)} />
      <Baris label="− Biaya tak terduga" nilai={rupiah(r.biaya)} />
      <View style={g.tumpuk1}>
        <Baris label="Tunai seharusnya" nilai={rupiah(st.tunaiSeharusnya)} tebal />
        <Baris label="Tunai diterima" nilai={rupiah(st.tunaiDiterima)} tebal />
        <Baris
          label={s < 0 ? "Tekor" : s > 0 ? "Lebih setor" : "Pas"}
          nilai={rupiah(s)}
          tebal
          warna={s < 0 ? WARNA.bahaya : s > 0 ? WARNA.utama : WARNA.teks}
        />
      </View>
      <Text style={g.teksMini}>Diterima {st.diterimaOleh.nama}</Text>
    </Kartu>
  );
}
