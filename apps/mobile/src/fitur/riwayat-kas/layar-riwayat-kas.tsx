import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHariIni } from "@/fitur/lapangan";
import { PilGulir } from "@/komponen/pil-gulir";
import { KartuSorot } from "@/komponen/statistik/kartu-sorot";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { daftarBulan } from "@/lib/bulan";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG } from "@/tema";
import { useRiwayatBulan } from "./data";
import { barisHari, ringkasBulan, sorotBulan } from "./inti/riwayat-kas";
import { BarisHari } from "./komponen/baris-hari";

/**
 * RIWAYAT KAS (Mode Rekap › Menu › Riwayat Kas, 28 Nov 2026) — kas harian kolektor per bulan:
 *   [Bulan Ini][Oktober 2026] …          ← pil bulan
 *   ███ SETORAN KE KASIR ███              ← Σ diterima kasir, tekor & lebih setor bulan itu
 *   satu baris per hari, terbaru dulu     ← keadaan, diterima, tekor / lebih / pas
 * Mengetuk hari → rincian hari itu (arus kas I1, serah terima, biaya). Kas HARI INI
 * (gembok & Buka Laporan) tetap di Ringkasan.
 */
export function LayarRiwayatKas() {
  const bawah = useSafeAreaInsets().bottom;
  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const daftar = useMemo(() => (tanggal ? daftarBulan(tanggal) : []), [tanggal]);
  const [kunci, setKunci] = useState<string | null>(null);
  const bulan = daftar.find((b) => b.kunci === kunci) ?? daftar[0] ?? null;
  const riwayat = useRiwayatBulan(bulan);

  const segarkan = useCallback(
    () => Promise.all([hariIni.refetch(), riwayat.refetch()]),
    [hariIni, riwayat],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const vm = useMemo(
    () =>
      riwayat.data && tanggal
        ? {
            sorot: sorotBulan(ringkasBulan(riwayat.data)),
            baris: riwayat.data.map((h) => barisHari(h, tanggal)),
          }
        : null,
    [riwayat.data, tanggal],
  );

  let isi: React.ReactNode;
  if (vm && bulan) {
    isi = (
      <View style={[gaya.susun, riwayat.isPlaceholderData ? gaya.redup : null]}>
        <KartuSorot vm={vm.sorot} />
        {vm.baris.length === 0 ? (
          <KotakKosong
            ikon="calendar-days"
            judul="Belum ada hari tercatat"
            isi={
              bulan.bulanIni
                ? "Hari kerja muncul di sini sejak absen pagi."
                : `Tidak ada hari tercatat di ${bulan.pil}.`
            }
          />
        ) : (
          vm.baris.map((b) => (
            <BarisHari
              key={b.tanggal}
              vm={b}
              onPress={() =>
                router.push({
                  pathname: "/kolektor/riwayat-kas/[tanggal]",
                  params: { tanggal: b.tanggal },
                })
              }
            />
          ))
        )}
        <Text style={g.teksMini}>
          Tekor memotong gaji. Hari yang belum diterima kasir belum punya angka setoran.
        </Text>
      </View>
    );
  } else if (hariIni.isError || (riwayat.isError && !riwayat.data)) {
    isi = (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={(hariIni.error ?? riwayat.error)?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  } else {
    isi = <KerangkaStatistik kartu={1} />;
  }

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: bawah + RUANG[6] }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={tarik}
          tintColor={AKSEN.teks}
          colors={[AKSEN.teks]}
        />
      }
    >
      <PilGulir
        opsi={daftar.map((b) => ({ nilai: b.kunci, label: b.pil }))}
        nilai={bulan?.kunci ?? ""}
        onPilih={setKunci}
      />
      {riwayat.isError && riwayat.data ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}
      {isi}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[3] },
  susun: { gap: RUANG[2.5] },
  /** Bulan baru sedang dimuat: angka lama tetap di tempat, diredupkan. */
  redup: { opacity: 0.45 },
});
