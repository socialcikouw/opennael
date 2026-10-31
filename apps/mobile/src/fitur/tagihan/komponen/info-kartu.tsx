import { type ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari, LencanaStatus } from "./lencana-kartu";

const TINGGI_NAMA = 24;
const TINGGI_BARIS = 20;
const ISIAN = RUANG[3];
/** Jarak dari atas kotak ke garis tengah baris nama — tempat cabang rel masuk. */
export const CABANG_INFO = 1 + ISIAN + TINGGI_NAMA / 2;

/**
 * Isi kotak pertama kartu:
 *   (12) Budi Santoso                      [Macet] [Rabu]
 *   Pinjaman Ke-3                          Tabungan ••••
 *   ✓ Bisa Digulung                        1 Sep 26 • 14.00
 * Lingkaran = angsuran yang sudah lunas. Tabungan tersembunyi sampai diketuk.
 */
export function InfoKartu({ vm, aksen }: { vm: KartuVM; aksen: WarnaMode }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.info}>
      <View style={gaya.baris}>
        <View
          accessible
          accessibilityLabel={`Angsuran ke-${vm.p.angsuranKe}`}
          style={[gaya.lingkaran, { backgroundColor: aksen.lembut }]}
        >
          <Text
            style={[gaya.lingkaranTeks, { color: aksen.teks }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {vm.angsuranKeTeks}
          </Text>
        </View>
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.namaJudul}
        </Text>
        {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
        {vm.lencana ? <LencanaStatus lencana={vm.lencana} /> : null}
      </View>
      <BarisKetik
        kiri={
          <Text style={gaya.pinjamanKe} numberOfLines={1}>
            {vm.pinjamanKeTeks}
          </Text>
        }
        kanan={<TabunganRahasia nilai={vm.tabunganRp} />}
      />
      <BarisKetik
        kiri={vm.progres ? <SinyalGulung progres={vm.progres} /> : null}
        kanan={<Text style={gaya.akad}>{vm.akadTeks}</Text>}
      />
    </View>
  );
}

function BarisKetik({ kiri, kanan }: { kiri: ReactNode; kanan: ReactNode }) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.barisKecil}>
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

/** "✓ Bisa Digulung" hijau · "✕ Tidak Bisa Digulung" merah (belum waktunya) atau samar (terkunci). */
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
      <Ikon nama={progres.sinyal.ikon} ukuran={13} warna={warna} />
      <Text style={[gaya.sinyalTeks, { color: warna }]} numberOfLines={1}>
        {progres.sinyal.teks}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    info: { gap: RUANG[1], padding: ISIAN },
    baris: { minHeight: TINGGI_NAMA, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    lingkaran: {
      minWidth: TINGGI_NAMA,
      height: TINGGI_NAMA,
      paddingHorizontal: RUANG[1],
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
    },
    lingkaranTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    barisKecil: {
      minHeight: TINGGI_BARIS,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
    },
    kiri: { flex: 1, minWidth: 0 },
    pinjamanKe: { ...HURUF.xs, color: WARNA.redup },
    tabunganLabel: { ...HURUF.xs, color: WARNA.redup },
    tabunganNilai: { fontWeight: TEBAL.semi, color: WARNA.teksKedua },
    akad: { ...HURUF.xs, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    sinyal: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    sinyalTeks: { ...HURUF.xs, flex: 1, fontWeight: TEBAL.semi },
  });
