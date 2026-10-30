import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useGaya, useWarna } from "@/komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/tema";
import { Ikon } from "@/komponen/ui";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari } from "./kartu-nasabah";

/**
 * Kartu RINGKAS nasabah yang sudah ditagih hari ini — di dasar daftar, tanpa
 * tombol: pita status ("SUDAH BAYAR • 50K" / "LIBUR HARI INI"), lingkaran
 * besar angsuran ke-, siapa, lalu Angsuran · Saldo.
 */
export const KartuSudah = memo(function KartuSudah({
  vm,
  aksen,
}: {
  vm: KartuVM;
  aksen: WarnaMode;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const libur = vm.p.hariIni?.jenis === "libur";
  const warna = libur ? WARNA.bahayaTeks : aksen.teks;
  const latar = libur ? WARNA.bahayaLembut : aksen.lembut;
  return (
    <View style={gaya.kartu}>
      <View style={gaya.atas}>
        <View style={[gaya.pita, { backgroundColor: latar }]}>
          <Ikon nama={libur ? "circle-pause" : "circle-check"} ukuran={12} warna={warna} />
          <Text style={[gaya.pitaTeks, { color: warna }]}>{vm.judulSudah}</Text>
        </View>
        {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
      </View>
      <View
        accessible
        accessibilityLabel={`Angsuran ke-${vm.p.angsuranKe}`}
        style={[gaya.lingkaran, { backgroundColor: latar, borderColor: warna }]}
      >
        <Text style={[gaya.lingkaranTeks, { color: warna }]}>{vm.p.angsuranKe}</Text>
      </View>
      <View style={gaya.identitas}>
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.nama}
        </Text>
        <Text style={gaya.alamat} numberOfLines={1}>
          {vm.subjudul}
        </Text>
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
  const gaya = useGaya(buatGaya);
  const WARNA = useWarna();
  return (
    <View style={[gaya.kartu, gaya.droping]}>
      <Text style={gaya.judulDroping}>TOTAL DROPING HARI INI</Text>
      <View style={gaya.barisDroping}>
        {[
          { ikon: "user-plus" as const, label: "Drop baru", nilai: baru },
          { ikon: "repeat" as const, label: "Drop gulung", nilai: gulung },
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

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      alignItems: "center",
      gap: RUANG[3],
      marginHorizontal: RUANG[4],
      marginBottom: RUANG[3],
      padding: RUANG[4],
      borderRadius: SUDUT.lebar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    atas: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    pita: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2.5],
      paddingVertical: RUANG[1],
      borderRadius: SUDUT.bulat,
    },
    pitaTeks: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
    lingkaran: {
      width: 64,
      height: 64,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      borderWidth: 2,
    },
    lingkaranTeks: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    identitas: { alignItems: "center", gap: RUANG[0.5] },
    nama: { ...HURUF.base, fontWeight: TEBAL.tebal, textTransform: "uppercase", color: WARNA.teks },
    alamat: { ...HURUF.xs, color: WARNA.redup },
    angka: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch" },
    label: { ...HURUF["2xs"], color: WARNA.samar },
    nilai: {
      ...HURUF.sm,
      fontWeight: TEBAL.semi,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    kanan: { textAlign: "right" },
    tegas: { fontWeight: TEBAL.ekstra },
    droping: { alignItems: "stretch" },
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
      backgroundColor: WARNA.abu,
    },
  });
