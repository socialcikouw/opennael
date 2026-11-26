import type { NasabahLama } from "@opennael/contracts";
import { type JenisPinjaman, rincianPokok } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { Baris } from "@/komponen/ui/kartu";
import { cobaAturan } from "@/lib/aturan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { PAPAN_POKOK } from "../../inti/papan";
import { PanelPapan } from "../panel-papan";
import { judulLanjut, type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah POKOK — papan pokok yang sama dengan Gulung: tiap tombol MENAMBAH (100k diketuk
 * dua kali = Rp 200.000), jadi pokok selalu kelipatan Rp 100.000 (A1). Di bawah angka:
 * potongan & uang yang dicairkan (rumus server, `syaratAkad`). Nasabah yang pernah
 * melunasi: pinjaman terakhirnya jadi patokan (sudah terisi bila jenisnya sama).
 */
export function LangkahPokok(props: {
  k: Kerangka;
  jenis: JenisPinjaman;
  pokok: number;
  lama: NasabahLama | null;
  onTekan: (kunci: string) => void;
  /** Server sedang memeriksa akad sebelum kamera. */
  memuat?: boolean;
  /** Penolakan server (mis. nasabah diblokir) — kamera tak dibuka. */
  galat?: string | null | undefined;
  onLanjut: () => void;
}) {
  // Potongan & pencairan menurut jenis, tak bergantung tenor (A3).
  const syarat = props.pokok > 0 ? cobaAturan(() => rincianPokok(props.jenis, props.pokok)) : null;
  const h = syarat?.hasil ?? null;
  const terakhir = props.lama?.terakhir ?? null;

  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Berapa pokok pinjamannya?"
      kaki={
        <PanelPapan
          papan={PAPAN_POKOK}
          sisaTinggi={560}
          sah={h !== null}
          memuat={props.memuat ?? false}
          aksen={AKSEN}
          judul={judulLanjut(props.k).toUpperCase()}
          onTekan={props.onTekan}
          onKonfirmasi={props.onLanjut}
        />
      }
    >
      {terakhir ? (
        <Text style={gaya.patokan}>
          Pinjaman terakhir {LABEL_JENIS[terakhir.jenis].toLowerCase()}:{" "}
          <Text style={gaya.patokanAngka}>{rupiah(terakhir.pokok)}</Text>
        </Text>
      ) : null}
      <Text
        style={[gaya.nominal, props.pokok > 0 ? null : gaya.nominalKosong]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.6}
        accessibilityLiveRegion="polite"
      >
        {rupiah(props.pokok)}
      </Text>
      {syarat?.galat ? <Text style={gaya.galat}>{syarat.galat}</Text> : null}
      {props.galat ? <Text style={gaya.galat}>{props.galat}</Text> : null}
      {h ? (
        <View style={gaya.rincian}>
          {h.potonganAdmin > 0 ? (
            <Baris
              label={`Admin ${persen(h.potonganAdmin, props.pokok)}`}
              nilai={`− ${rupiah(h.potonganAdmin)}`}
            />
          ) : (
            <Baris label="Tanpa Potongan" nilai="Rp 0" />
          )}
          {h.tabunganMasuk > 0 ? (
            <Baris
              label={`Tabungan ${persen(h.tabunganMasuk, props.pokok)}`}
              nilai={`− ${rupiah(h.tabunganMasuk)}`}
            />
          ) : null}
          <View style={gaya.garis} />
          <Baris label="Dicairkan ke Nasabah" nilai={rupiah(h.pencairan)} tebal />
        </View>
      ) : null}
    </KerangkaLangkah>
  );
}

/** "5%" / "10%" — persen potongan dari pokok (A3 selalu bulat). */
const persen = (nilai: number, pokok: number) => `${Math.round((nilai / pokok) * 100)}%`;

const gaya = StyleSheet.create({
  patokan: { ...HURUF.sm, color: WARNA.redup },
  patokanAngka: { fontWeight: TEBAL.tebal, color: WARNA.teks },
  nominal: {
    ...HURUF.hero,
    fontWeight: TEBAL.ekstra,
    letterSpacing: -1,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  nominalKosong: { color: WARNA.samar },
  galat: { ...HURUF.sm, color: WARNA.bahayaTeks },
  rincian: {
    gap: RUANG[2],
    padding: RUANG[4],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  garis: { height: 1, backgroundColor: WARNA.garis },
});
