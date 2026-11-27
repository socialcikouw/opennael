import { rupiah, tanggal } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { type Slip, teksPeriode } from "../inti/gaji";

const AKUN: Record<string, string> = { tunai: "tunai", bank: "transfer bank" };

/**
 * Satu SLIP GAJI yang sudah dibayar bos: periode, gaji bersih, gaji kotor & tekor, tanggal
 * & cara bayar. Slip yang dibatalkan bos tetap tampil — dicoret, dengan alasannya.
 */
export function KartuSlip({ s }: { s: Slip }) {
  const batal = s.dibatalkanAt !== null;
  return (
    <View style={[gaya.kartu, batal ? gaya.batal : null]}>
      <View style={gaya.kepala}>
        <View style={[gaya.ikon, { backgroundColor: batal ? WARNA.isiNetral : AKSEN.lembut }]}>
          <Ikon nama="file-text" ukuran={16} warna={batal ? WARNA.redup : AKSEN.teks} />
        </View>
        <View style={gaya.isi}>
          <Text style={gaya.periode}>{teksPeriode(s.periodeMulai, s.periodeSelesai)}</Text>
          <Text style={gaya.sub}>
            Dibayar {tanggal(s.tanggalBayar, "tanpa")} · {AKUN[s.dariAkun] ?? s.dariAkun}
          </Text>
        </View>
        <Text style={[gaya.bersih, batal ? gaya.coret : null]}>{rupiah(s.gajiBersih)}</Text>
      </View>
      <View style={gaya.rincian}>
        <Text style={gaya.sub}>Kotor {rupiah(s.gajiKotor)}</Text>
        <Text style={[gaya.sub, s.potonganTekor > 0 ? { color: WARNA.bahayaTeks } : null]}>
          Tekor {rupiah(s.potonganTekor)}
        </Text>
      </View>
      {batal ? (
        <Text style={gaya.alasan}>Dibatalkan bos{s.alasanBatal ? `: ${s.alasanBatal}` : ""}</Text>
      ) : s.keterangan ? (
        <Text style={gaya.sub}>{s.keterangan}</Text>
      ) : null}
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[2],
    padding: RUANG[4],
    borderRadius: SUDUT.besar + 2,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  batal: { backgroundColor: WARNA.latar },
  kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
  ikon: {
    width: 32,
    height: 32,
    borderRadius: SUDUT.kecil + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  isi: { flex: 1, minWidth: 0 },
  periode: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teks },
  sub: { ...HURUF.xs, color: WARNA.teksKedua, fontVariant: ["tabular-nums"] },
  bersih: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  coret: { textDecorationLine: "line-through", color: WARNA.redup },
  rincian: { flexDirection: "row", justifyContent: "space-between", paddingLeft: 44 },
  alasan: { ...HURUF.xs, paddingLeft: 44, color: WARNA.bahayaTeks },
});
