import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, TEBAL, type Warna } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";

/**
 * Bagian atas kotak kartu: kampung · tanggal & jam akad, pinjaman ke- ·
 * Tabungan (rahasia sampai diketuk), lalu sinyal gulung ("Bisa Digulung").
 */
export function InfoKartu({ vm }: { vm: KartuVM }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.info}>
      <Baris
        kiri={
          <Text style={gaya.kampung} numberOfLines={1}>
            {vm.kampungJudul}
          </Text>
        }
        kanan={<Text style={gaya.akad}>{vm.akadTeks}</Text>}
      />
      <Baris
        kiri={
          <Text style={gaya.pinjamanKe} numberOfLines={1}>
            {vm.pinjamanKeTeks}
          </Text>
        }
        kanan={<TabunganRahasia nilai={vm.tabunganRp} />}
      />
      {vm.progres ? <SinyalGulung progres={vm.progres} /> : null}
    </View>
  );
}

function Baris({ kiri, kanan }: { kiri: ReactNode; kanan: ReactNode }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.baris}>
      <View style={gaya.kiri}>{kiri}</View>
      {kanan}
    </View>
  );
}

/** Tabungan nasabah tak dipampang: "••••" sampai diketuk (kartu sering terbuka di depan orang lain). */
function TabunganRahasia({ nilai }: { nilai: string }) {
  const gaya = useGaya(buatGaya);
  const [buka, setBuka] = useState(false);
  return (
    <Pressable
      onPress={() => setBuka((b) => !b)}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={
        buka
          ? `Tabungan ${nilai}. Ketuk untuk menyembunyikan`
          : "Tabungan tersembunyi. Ketuk untuk menampilkan"
      }
    >
      <Text style={gaya.tabunganLabel}>
        Tabungan <Text style={gaya.tabunganNilai}>{buka ? nilai : "••••"}</Text>
      </Text>
    </Pressable>
  );
}

/** "✓ Bisa Digulung" — hijau boleh, merah belum waktunya, samar terkunci. */
function SinyalGulung({ progres }: { progres: NonNullable<KartuVM["progres"]> }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warna =
    progres.status === "boleh"
      ? WARNA.utama
      : progres.status === "belum"
        ? WARNA.bahaya
        : WARNA.samar;
  return (
    <View style={gaya.sinyal}>
      <Ikon nama={progres.ikon} ukuran={13} warna={warna} />
      <Text style={[gaya.sinyalTeks, { color: warna }]} numberOfLines={1}>
        {progres.petunjuk}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    info: { gap: RUANG[1], padding: RUANG[3] },
    // Tinggi 20 = tinggi baris `sm`: siku rel di kepala berakhir di tengahnya.
    baris: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    kiri: { flex: 1, minWidth: 0 },
    kampung: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teks },
    akad: { ...HURUF.xs, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    pinjamanKe: { ...HURUF.xs, color: WARNA.redup },
    tabunganLabel: { ...HURUF.xs, color: WARNA.redup },
    tabunganNilai: { fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    sinyal: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5], paddingTop: RUANG[0.5] },
    sinyalTeks: { ...HURUF.xs, flex: 1, fontWeight: TEBAL.semi },
  });
