import {
  geserTanggal,
  type JenisPinjaman,
  rincianPokok,
  syaratAkad,
  TENOR_PINJAMAN,
} from "@opennael/domain";
import { namaTenor, rupiah, tanggalBertahun } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { cobaAturan } from "@/lib/aturan";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah TENOR (mingguan & tempoan; harian selalu 25 kali dan dilewati) — tiap pilihan
 * menampilkan angsurannya untuk pokok yang sudah diisi, tempoan juga tanggal jatuh
 * temponya (tanggal akad + tenor hari, A4). Ketuk = langsung lanjut. Tenor yang tak
 * berlaku untuk pokok ini (mingguan 6 kali: pokok kelipatan Rp 300.000, A2) tampil
 * redup dengan sebabnya, tak bisa dipilih.
 */
export function LangkahTenor(props: {
  k: Kerangka;
  jenis: Exclude<JenisPinjaman, "harian">;
  pokok: number;
  /** Tanggal kantor hari ini (`YYYY-MM-DD`) — dasar jatuh tempo; null selama dimuat. */
  hariIni: string | null;
  nilai: number | null;
  onPilih: (tenor: number) => void;
}) {
  const tempo = props.jenis === "tempoan";
  const pilihan = TENOR_PINJAMAN[props.jenis];
  const total = cobaAturan(() => rincianPokok(props.pokok)).hasil?.totalKembali ?? 0;
  return (
    <KerangkaLangkah
      k={props.k}
      tanya={tempo ? "Berapa hari temponya?" : "Berapa kali angsurannya?"}
      sub={`Pokok ${rupiah(props.pokok)} · total kembali ${rupiah(total)}.`}
    >
      {pilihan.map((t) => {
        const { hasil: s, galat } = cobaAturan(() => syaratAkad(props.jenis, props.pokok, t));
        return (
          <KartuPilihan
            key={t}
            judul={tempo ? namaTenor(props.jenis, t) : `${t} kali`}
            ket={
              galat ??
              (tempo
                ? props.hariIni
                  ? `Jatuh tempo ${tanggalBertahun(geserTanggal(props.hariIni, t))}`
                  : undefined
                : "Seminggu sekali")
            }
            nonaktif={s === null}
            terpilih={props.nilai === t}
            onPress={() => props.onPilih(t)}
            kanan={
              s ? (
                <View style={gaya.kanan}>
                  <Text style={gaya.angka}>{rupiah(s.angsuran)}</Text>
                  <Text style={gaya.satuan}>{tempo ? "sekali bayar" : "per minggu"}</Text>
                </View>
              ) : (
                <View />
              )
            }
          />
        );
      })}
    </KerangkaLangkah>
  );
}

const gaya = StyleSheet.create({
  kanan: { alignItems: "flex-end", gap: RUANG[0.5] },
  angka: {
    ...HURUF.base,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  satuan: { ...HURUF.xs, color: WARNA.redup },
});
