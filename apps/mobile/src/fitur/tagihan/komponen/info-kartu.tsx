import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { KartuVM } from "../inti/kartu";
import { LencanaHari, LencanaStatus } from "./lencana-kartu";

const TINGGI_LINGKARAN = 36;
/** Isian kotak kartu (pt) — kartu-nasabah memakai angka yang sama. */
export const ISIAN_KOTAK = RUANG[3];
/** Jarak dari atas kotak ke garis tengah baris nama — tempat cabang rel masuk. */
export const CABANG_INFO = 1 + ISIAN_KOTAK + TINGGI_LINGKARAN / 2;

/**
 * Bagian atas kotak kartu:
 *   (12) Budi Santoso                 1 Sep 26 • 14.00
 *   Pinjaman Ke-3 [Macet] [Rabu]                  ••••
 * Lingkaran = angsuran yang sudah lunas: pekat berwarna mode dan besar supaya
 * paling mencolok (beda dari lencana jumlah nasabah di judul kelompok yang
 * abu). Tabungan tanpa label — "••••" sampai diketuk, lalu nominalnya.
 * `onLunasi` (tahan lama kartu) juga ditawarkan sebagai aksi aksesibilitas
 * pada baris nama.
 */
export function InfoKartu({
  vm,
  aksen,
  onLunasi,
}: {
  vm: KartuVM;
  aksen: WarnaMode;
  onLunasi: (() => void) | null;
}) {
  const gaya = useGaya(buatGaya);
  return (
    <View style={gaya.info}>
      <View
        style={gaya.baris}
        accessible
        accessibilityLabel={`${vm.namaTampil}, angsuran ke-${vm.p.angsuranKe}, akad ${vm.akadTeks}`}
        accessibilityActions={onLunasi ? [{ name: "lunasi", label: "Lunasi pinjaman" }] : []}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName === "lunasi") onLunasi?.();
        }}
      >
        <View style={[gaya.lingkaran, { backgroundColor: aksen.isi }]}>
          <Text
            style={[gaya.lingkaranTeks, { color: aksen.teksIsi }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {vm.angsuranKeTeks}
          </Text>
        </View>
        <Text style={gaya.nama} numberOfLines={1}>
          {vm.namaTampil}
        </Text>
        <Text style={gaya.akad}>{vm.akadTeks}</Text>
      </View>
      <View style={gaya.barisKecil}>
        <View style={gaya.kiri}>
          <Text style={gaya.pinjamanKe} numberOfLines={1}>
            {vm.pinjamanKeTeks}
          </Text>
          {vm.hariTagih ? <LencanaHari hari={vm.hariTagih} aksen={aksen} /> : null}
          {vm.lencana ? <LencanaStatus lencana={vm.lencana} /> : null}
        </View>
        <TabunganRahasia nilai={vm.tabunganRp} />
      </View>
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
      <Text style={gaya.tabungan}>{buka ? nilai : "••••"}</Text>
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    info: { gap: RUANG[1] },
    baris: {
      minHeight: TINGGI_LINGKARAN,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
    },
    lingkaran: {
      minWidth: TINGGI_LINGKARAN,
      height: TINGGI_LINGKARAN,
      paddingHorizontal: RUANG[1.5],
      borderRadius: SUDUT.bulat,
      alignItems: "center",
      justifyContent: "center",
    },
    lingkaranTeks: { ...HURUF.lg, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    nama: { ...HURUF.base, flex: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    akad: { ...HURUF.xs, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    barisKecil: { minHeight: 20, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    kiri: { flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    pinjamanKe: { ...HURUF.xs, flexShrink: 1, color: WARNA.redup },
    tabungan: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
  });
