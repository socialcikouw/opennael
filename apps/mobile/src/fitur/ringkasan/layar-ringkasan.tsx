import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGerbangMutasi } from "@/fitur/lapangan";
import { usePengingat } from "@/fitur/notifikasi";
import { PilGulir } from "@/komponen/pil-gulir";
import { PilJenis, type SaringJenis } from "@/komponen/pil-jenis";
import { KartuRincian } from "@/komponen/statistik/kartu-rincian";
import { KartuSorot } from "@/komponen/statistik/kartu-sorot";
import { KepalaJudulBesar } from "@/komponen/statistik/kepala-judul-besar";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG } from "@/tema";
import { useBiayaHariIni, useGajiPeriode, useRingkasanPeriode } from "./data";
import { susunKartu } from "./inti/kartu";
import { daftarPeriode } from "./inti/periode";
import { sorotGaji, sorotStortingJenis } from "./inti/sorot";
import { SorotMutasiKas } from "./komponen/sorot-mutasi-kas";

/**
 * RINGKASAN (tab pertama Mode Rekap; rupa dari aplikasi lama, 27 Nov 2026) — satu gulungan:
 *
 *   JUMAT, 27 NOV 2026            ← periode lengkap
 *   Ringkasan                     ← judul besar (kepala tab disembunyikan)
 *   [Hari Ini][Pekan Ini][Bulan Ini][Oktober 2026] …   ← pil periode
 *   [Semua][Harian][Mingguan][Tempoan]                 ← pil jenis
 *   ███ KARTU SOROT ███  Hari Ini: Mutasi Kas (gembok, Buka Laporan, serah terima kasir);
 *                        periode lain: Gaji (perkiraan); satu jenis: Storting jenis itu
 *   kartu rincian: Storting · Droping · Potongan Akad · Operasional · Setoran Sore —
 *     rumus, bar komposisi, naik/turun terhadap periode sepadan sebelumnya; hari ini
 *     Storting & Droping bisa diketuk → daftar per nasabah.
 *
 * Keputusan isi (urutan, angka, aturan) di `inti/` (diuji); layar hanya merangkai.
 * Selalu dibuka di Hari Ini (tujuan "Buka Mutasi Kas" dari Notifikasi).
 */
export function LayarRingkasan() {
  const atas = useSafeAreaInsets().top;
  const ruangTab = useRuangTab();
  const { hariIni, tagihan, kas, pengingat } = usePengingat();
  const { gerbang, belum } = useGerbangMutasi();
  const tanggal = hariIni.data?.kalender.tanggal;

  const daftar = useMemo(() => (tanggal ? daftarPeriode(tanggal) : []), [tanggal]);
  const [kunci, setKunci] = useState("hari-ini");
  const [saring, setSaring] = useState<SaringJenis>("semua");
  const periode = daftar.find((p) => p.kunci === kunci) ?? daftar[0] ?? null;
  const jenis = saring === "semua" ? null : saring;

  const angka = useRingkasanPeriode(periode?.rentang ?? null, jenis);
  const banding = useRingkasanPeriode(periode?.pembanding?.rentang ?? null, jenis);
  const pakaiGaji = periode !== null && !periode.hariIni && jenis === null;
  const gaji = useGajiPeriode(pakaiGaji ? periode.rentang : null);
  const biaya = useBiayaHariIni(periode?.hariIni ? tanggal : undefined);

  const segarkan = useCallback(
    () =>
      Promise.all([
        hariIni.refetch(),
        tagihan.refetch(),
        kas.refetch(),
        angka.refetch(),
        banding.refetch(),
        pakaiGaji ? gaji.refetch() : null,
        periode?.hariIni ? biaya.refetch() : null,
      ]),
    [hariIni, tagihan, kas, angka, banding, gaji, biaya, pakaiGaji, periode?.hariIni],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  // Pembanding hanya bila periode ini punya dan angkanya milik rentang itu (bukan sisa
  // periode sebelumnya yang ditahan `keepPreviousData`).
  const pembanding = useMemo(
    () =>
      periode?.pembanding && banding.data && !banding.isPlaceholderData
        ? { data: banding.data, label: periode.pembanding.label }
        : null,
    [periode, banding.data, banding.isPlaceholderData],
  );
  const kartu = useMemo(
    () =>
      angka.data && periode
        ? susunKartu({
            data: angka.data,
            jenis,
            hariIni: periode.hariIni,
            pembanding,
            biayaHariIni: biaya.data?.biaya
              .filter((b) => !b.dibatalkanAt)
              .map((b) => ({ keterangan: b.keterangan, nominal: b.nominal })),
          })
        : [],
    [angka.data, periode, jenis, pembanding, biaya.data],
  );

  const penahan = (pengingat ?? []).filter(
    (p) => p.jenis === "absen" || p.jenis === "gerbang" || p.jenis === "belum",
  );
  const gantiDimuat = angka.isPlaceholderData || (pakaiGaji && gaji.isPlaceholderData);

  let isi: React.ReactNode;
  if (!periode || (angka.isPending && !angka.data)) {
    isi =
      hariIni.isError || angka.isError ? (
        <View style={g.tumpuk3}>
          <PesanGalat pesan={(hariIni.error ?? angka.error)?.message} />
          <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
        </View>
      ) : (
        <KerangkaStatistik />
      );
  } else {
    const sorot =
      periode.hariIni && jenis === null ? (
        <SorotMutasiKas gerbang={gerbang} belum={belum.length} hari={kas.data} penahan={penahan} />
      ) : jenis !== null ? (
        angka.data ? (
          <KartuSorot vm={sorotStortingJenis(angka.data, jenis, pembanding)} />
        ) : null
      ) : gaji.data ? (
        <KartuSorot vm={sorotGaji(gaji.data)} />
      ) : gaji.isError ? (
        <Spanduk judul="Gaji belum bisa dihitung" isi={gaji.error.message} />
      ) : null;
    isi = (
      <View style={[gaya.kartu, gantiDimuat ? gaya.redup : null]}>
        {sorot}
        {kartu.map((k) => (
          <KartuRincian
            key={k.kunci}
            vm={k}
            onBuka={
              k.daftar
                ? () =>
                    router.push(
                      k.daftar === "storting" ? "/kolektor/storting" : "/kolektor/droping",
                    )
                : undefined
            }
          />
        ))}
        {periode.hariIni ? null : (
          <Text style={g.teksMini}>
            Angka dari catatan yang berlaku; transaksi yang dibatalkan tidak dihitung.
          </Text>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingTop: atas + RUANG[3], paddingBottom: ruangTab }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={tarik}
          tintColor={AKSEN.teks}
          colors={[AKSEN.teks]}
          progressViewOffset={atas}
        />
      }
    >
      <KepalaJudulBesar overline={periode?.judul ?? " "} judul="Ringkasan" />
      <View style={g.tumpuk2}>
        <PilGulir
          opsi={daftar.map((p) => ({ nilai: p.kunci, label: p.pil }))}
          nilai={periode?.kunci ?? kunci}
          onPilih={setKunci}
        />
        <PilJenis nilai={saring} onPilih={setSaring} />
      </View>
      {angka.isError && angka.data ? (
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
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
  kartu: { gap: RUANG[3] },
  /** Periode/jenis baru sedang dimuat: angka lama tetap di tempat, diredupkan. */
  redup: { opacity: 0.45 },
});
