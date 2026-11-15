import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaMode } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";
import { LencanaHari } from "./lencana-kartu";

/**
 * Kartu RINGKAS nasabah yang sudah ditagih hari ini — di dasar daftar, tanpa tombol,
 * tiga baris padat:
 *   (12)  BUDI SANTOSO                       ← lingkaran angsuran ke-, nama, alamat
 *         PULE BARAT · harian
 *   [✓ SUDAH BAYAR • 50K] [Rabu]             ← pita status ("LIBUR HARI INI" bila libur)
 *   Angsuran 50.000            Saldo 650.000
 */
export const KartuSudah = memo(function KartuSudah({
  vm,
  aksen,
  aksi,
}: {
  vm: KartuVM;
  aksen: WarnaMode;
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
        <Pressable
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
        </Pressable>
      </View>
      <View style={gaya.status}>
        <View style={[gaya.pita, { backgroundColor: latar }]}>
          <Ikon nama={libur ? "circle-pause" : "circle-check"} ukuran={12} warna={warna} />
          <Text style={[gaya.pitaTeks, { color: warna }]}>{vm.judulSudah}</Text>
        </View>
        {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
      </View>
      <View style={gaya.angka}>
        <View>
          <Text style={gaya.label}>Angsuran</Text>
          <Text style={gaya.nilai}>{vm.angsuranTeks}</Text>
        </View>
        <View>
          <Text style={[gaya.label, gaya.kanan]}>Saldo</Text>
          <Text style={[gaya.nilai, gaya.kanan, gaya.tegas]}>{vm.saldoTeks}</Text>
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
              <Ikon nama={k.ikon} ukuran={16} warna={WARNA.teksKedua} />
            </View>
            <View>
              <Text style={gaya.label}>{k.label}</Text>
              <Text
                style={[gaya.nilai, gaya.tegas]}
              >{`Rp ${k.nilai.toLocaleString("id-ID")}`}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const gaya = StyleSheet.create({
  kartu: {
    gap: RUANG[2.5],
    marginHorizontal: RUANG[4],
    marginBottom: RUANG[2],
    padding: RUANG[3],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  baris: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
  lingkaran: {
    minWidth: 40,
    height: 40,
    paddingHorizontal: RUANG[1.5],
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 2,
  },
  lingkaranTeks: { ...HURUF.lg, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
  identitas: { flex: 1, minWidth: 0, gap: RUANG[0.5] },
  ditekan: { opacity: 0.6 },
  nama: { ...HURUF.base, fontWeight: TEBAL.tebal, textTransform: "uppercase", color: WARNA.teks },
  alamat: { ...HURUF.xs, color: WARNA.redup },
  status: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  pita: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[1],
    paddingHorizontal: RUANG[2.5],
    paddingVertical: RUANG[1],
    borderRadius: SUDUT.bulat,
  },
  pitaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
  angka: { flexDirection: "row", justifyContent: "space-between" },
  label: { ...HURUF["2xs"], color: WARNA.redup },
  nilai: {
    ...HURUF.sm,
    fontWeight: TEBAL.semi,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  kanan: { textAlign: "right" },
  tegas: { fontWeight: TEBAL.ekstra },
  judulDroping: {
    ...HURUF["2xs"],
    fontWeight: TEBAL.ekstra,
    letterSpacing: 0.6,
    color: WARNA.redup,
  },
  barisDroping: { flexDirection: "row", gap: RUANG[3] },
  kolomDroping: { flex: 1, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  ikonDroping: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
  },
});
