import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";
import { LencanaHari } from "./lencana-kartu";

/**
 * Kartu RINGKAS nasabah yang sudah ditagih hari ini — di dasar daftar, tanpa tombol,
 * tiga baris padat:
 *   (12)  BUDI SANTOSO                       ← lingkaran angsuran ke-, nama, alamat
 *         PULE BARAT · harian
 *   [✓ SUDAH BAYAR • 50K] [Rabu]             ← pita status ("LIBUR HARI INI" bila libur)
 *   Angsuran 50.000       Sisa Saldo 650.000
 */
export const KartuSudah = memo(function KartuSudah({
  vm,
  aksen,
  aksi,
}: {
  vm: KartuVM;
  aksen: WarnaAksen;
  aksi: AksiKartu;
}) {
  const libur = vm.p.hariIni?.jenis === "libur";
  const warna = libur ? WARNA.bahayaTeks : aksen.teks;
  const latar = libur ? WARNA.bahayaLembut : aksen.lembut;
  return (
    <View style={gaya.kartu}>
      <View style={gaya.baris}>
        <View
          accessible
          accessibilityLabel={`Angsuran ke-${vm.p.angsuranKe}`}
          style={[gaya.lingkaran, { backgroundColor: latar, borderColor: warna }]}
        >
          <Text
            style={[gaya.lingkaranTeks, { color: warna }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {vm.p.angsuranKe}
          </Text>
        </View>
        <Tekan
          style={({ pressed }) => [gaya.identitas, pressed ? gaya.ditekan : null]}
          onPress={() => aksi.nasabah(vm)}
          onPressIn={() => aksi.siapNasabah(vm)}
          hitSlop={{ top: 4, bottom: 4 }}
          accessibilityRole="button"
          accessibilityHint="Buka detail nasabah"
        >
          <Text style={gaya.nama} numberOfLines={1}>
            {vm.nama}
          </Text>
          <Text style={gaya.alamat} numberOfLines={1}>
            {vm.subjudul}
          </Text>
        </Tekan>
      </View>
      <View style={[gaya.status, gaya.statusBungkus]}>
        <View style={[gaya.pita, { backgroundColor: latar }]}>
          <Ikon nama={libur ? "circle-pause" : "circle-check"} ukuran={11} warna={warna} />
          <Text style={[gaya.pitaTeks, { color: warna }]}>{vm.judulSudah}</Text>
        </View>
        {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} kecil /> : null}
      </View>
      <View style={gaya.angka}>
        <View style={gaya.kolom}>
          <Text style={gaya.labelRapat}>Angsuran</Text>
          <Text
            style={gaya.nilaiRapat}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {vm.angsuranTeks}
          </Text>
        </View>
        <View style={gaya.kolom}>
          <Text style={[gaya.labelRapat, gaya.kanan]}>Sisa Saldo</Text>
          <Text
            style={[gaya.saldoRapat, gaya.kanan]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {vm.saldoTeks}
          </Text>
        </View>
      </View>
    </View>
  );
});

/** Total droping hari ini — di puncak segmen Droping. */
export function KartuDroping({ baru, gulung }: { baru: number; gulung: number }) {
  return (
    <View style={gaya.kartu}>
      <Text style={gaya.judulDroping}>TOTAL DROPING HARI INI</Text>
      <View style={gaya.barisDroping}>
        {[
          { ikon: "user-plus" as const, label: "Drop Baru", nilai: baru },
          { ikon: "repeat" as const, label: "Drop Gulung", nilai: gulung },
        ].map((k) => (
          <View key={k.label} style={gaya.kolomDroping}>
            <View style={gaya.ikonDroping}>
              <Ikon nama={k.ikon} ukuran={14} warna={WARNA.teksKedua} />
            </View>
            {/* Lebar kolom dibatasi: nominal jutaan mengecil sendiri, tak mendesak kolom sebelah. */}
            <View style={gaya.isiDroping}>
              <Text style={gaya.labelDroping} numberOfLines={1}>
                {k.label}
              </Text>
              <Text
                style={gaya.nilaiDroping}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >{`Rp ${k.nilai.toLocaleString("id-ID")}`}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const gaya = StyleSheet.create({
  // Rapat seperti kartu tagih (28 Nov 2026): isian 10, jarak 6.
  kartu: {
    gap: RUANG[1.5],
    marginHorizontal: RUANG[4],
    marginBottom: RUANG[2],
    padding: RUANG[2.5],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  baris: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  lingkaran: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: RUANG[1.5],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 1.5,
  },
  lingkaranTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  identitas: { flex: 1, minWidth: 0 },
  ditekan: { opacity: 0.6 },
  nama: {
    ...HURUF.sm,
    lineHeight: 18,
    fontWeight: TEBAL.tebal,
    textTransform: "uppercase",
    color: WARNA.teks,
  },
  alamat: { ...HURUF["2xs"], color: WARNA.redup },
  status: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  pita: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1],
    paddingHorizontal: RUANG[2],
    paddingVertical: 2,
    borderRadius: SUDUT.bulat,
  },
  pitaTeks: { ...HURUF["3xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
  angka: { flexDirection: "row", justifyContent: "space-between", gap: RUANG[3] },
  kolom: { flex: 1, minWidth: 0, gap: 1 },
  // Angka kartu "Sudah ditagih" = ukuran rapat kartu lain (10 / 12 / 14 pt).
  labelRapat: { ...HURUF["3xs"], color: WARNA.redup },
  nilaiRapat: {
    ...HURUF.xs,
    fontWeight: TEBAL.semi,
    color: WARNA.teksKedua,
    fontVariant: ["tabular-nums"],
  },
  saldoRapat: {
    ...HURUF.sm,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  statusBungkus: { flexWrap: "wrap", rowGap: RUANG[1] },
  kanan: { textAlign: "right" },
  judulDroping: {
    ...HURUF["3xs"],
    fontWeight: TEBAL.ekstra,
    letterSpacing: 0.6,
    color: WARNA.redup,
  },
  barisDroping: { flexDirection: "row", gap: RUANG[4] },
  kolomDroping: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  isiDroping: { flex: 1, minWidth: 0, gap: 1 },
  labelDroping: { ...HURUF["3xs"], color: WARNA.redup },
  nilaiDroping: {
    ...HURUF.sm,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  ikonDroping: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
  },
});
