import { geserTanggal, type JenisPinjaman, syaratAkad, TENOR_PINJAMAN } from "@opennael/domain";
import { namaTenor, rupiah, tanggalBertahun } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { HURUF, RUANG, TEBAL, WARNA } from "@/tema";
import { KartuPilihan } from "./kartu-pilihan";
import { type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah TENOR (mingguan & tempoan; harian selalu 25 kali dan dilewati) — tiap pilihan
 * menampilkan angsurannya untuk pokok yang sudah diisi, tempoan juga tanggal jatuh
 * temponya (tanggal akad + tenor hari, A4). Ketuk = langsung lanjut.
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
  const contoh = syaratAkad(props.jenis, props.pokok, pilihan[0] ?? 0);
  return (
    <KerangkaLangkah
      k={props.k}
      tanya={tempo ? "Berapa hari temponya?" : "Berapa kali angsurannya?"}
      sub={`Pokok ${rupiah(props.pokok)} · total kembali ${rupiah(contoh.totalKembali)}.`}
    >
      {pilihan.map((t) => {
        const s = syaratAkad(props.jenis, props.pokok, t);
        return (
          <KartuPilihan
            key={t}
            judul={tempo ? namaTenor(props.jenis, t) : `${t} kali`}
            ket={
              tempo
                ? props.hariIni
                  ? `Jatuh tempo ${tanggalBertahun(geserTanggal(props.hariIni, t))}`
                  : undefined
                : "Seminggu sekali"
            }
            terpilih={props.nilai === t}
            onPress={() => props.onPilih(t)}
            kanan={
              <View style={gaya.kanan}>
                <Text style={gaya.angka}>{rupiah(s.angsuran)}</Text>
                <Text style={gaya.satuan}>{tempo ? "sekali bayar" : "per minggu"}</Text>
              </View>
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
