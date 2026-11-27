import type { IndeksBuku } from "@opennael/contracts";
import { LABEL_JENIS, rupiah, tampilKampung, tampilNama, tanggalBertahun } from "@opennael/format";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { keadaanNasabah } from "../inti/buku";

const LENCANA = {
  aktif: { teks: "Aktif", latar: WARNA.suksesLembut, warna: WARNA.sukses },
  macet: { teks: "Macet", latar: WARNA.bahayaLembut, warna: WARNA.bahayaTeks },
  selesai: { teks: "Selesai", latar: WARNA.isiNetral, warna: WARNA.teksKedua },
} as const;

/**
 * Satu nasabah di Buku: nama, kampung · jenis · pinjaman ke-, dan di kanan lencana keadaan +
 * sisa saldo (aktif/macet) atau tanggal selesai. Ketuk = Detail Nasabah.
 */
export const BarisBuku = memo(function BarisBuku(props: {
  b: IndeksBuku;
  onBuka: (b: IndeksBuku) => void;
}) {
  const { b } = props;
  const k = keadaanNasabah(b);
  const l = LENCANA[k];
  const t = b.terakhir;
  const nama = tampilNama(b.nasabah.nama);
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={`${nama}, ${l.teks}, ${b.jumlahPinjaman} pinjaman. Buka detail nasabah.`}
      onPress={() => props.onBuka(b)}
      style={({ pressed }) => [gaya.baris, pressed ? gaya.ditekan : null]}
    >
      <View style={gaya.kiri}>
        <Text style={gaya.nama} numberOfLines={1}>
          {nama}
        </Text>
        <Text style={gaya.sub} numberOfLines={1}>
          {tampilKampung(b.nasabah.kampung)} · {LABEL_JENIS[t.jenis]} · ke-{t.pinjamanKe}
        </Text>
      </View>
      <View style={gaya.kanan}>
        <View style={[gaya.lencana, { backgroundColor: l.latar }]}>
          <Text style={[gaya.lencanaTeks, { color: l.warna }]}>{l.teks}</Text>
        </View>
        <Text style={gaya.nilai} numberOfLines={1}>
          {k === "selesai"
            ? t.tanggalSelesai
              ? tanggalBertahun(t.tanggalSelesai)
              : "—"
            : rupiah(t.saldo)}
        </Text>
      </View>
      <Ikon nama="chevron-right" ukuran={16} warna={WARNA.samar} />
    </Tekan>
  );
});

const gaya = StyleSheet.create({
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingHorizontal: RUANG[3],
    paddingVertical: RUANG[2.5],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  ditekan: { opacity: 0.8 },
  kiri: { flex: 1, minWidth: 0, gap: 2 },
  nama: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.teks },
  sub: { ...HURUF.xs, color: WARNA.redup },
  kanan: { alignItems: "flex-end", gap: RUANG[1] },
  lencana: { paddingHorizontal: RUANG[2], paddingVertical: 1, borderRadius: SUDUT.bulat },
  lencanaTeks: { ...HURUF["3xs"], fontWeight: TEBAL.ekstra },
  nilai: {
    ...HURUF.xs,
    fontWeight: TEBAL.tebal,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
});
