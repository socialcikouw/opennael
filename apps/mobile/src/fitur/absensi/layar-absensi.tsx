import { tanggal as formatTanggal, jam } from "@opennael/format";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHariIni } from "@/fitur/lapangan";
import { PilGulir } from "@/komponen/pil-gulir";
import { KartuSorot } from "@/komponen/statistik/kartu-sorot";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Tombol } from "@/komponen/ui/tombol";
import { kueri } from "@/lib/api";
import { daftarBulan } from "@/lib/bulan";
import { useZonaKantor } from "@/lib/kantor";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG, WARNA } from "@/tema";
import { daftarAbsen, ringkasAbsensi, sorotKehadiran, susunKalender } from "./inti/absensi";
import { KalenderAbsensi } from "./komponen/kalender-absensi";

/**
 * ABSENSI (Mode Rekap › Menu › Absensi, 28 Nov 2026) — kehadiran kolektor sebulan:
 *   [Bulan Ini][Oktober 2026] …            ← pil bulan
 *   ███ KEHADIRAN ███                       ← hari masuk dari hari kerja kantor, % hadir
 *   kalender Senin–Minggu berwarna          ← masuk · tidak kerja · tak absen · libur
 *   daftar hari terbaru dulu                ← jam absen pagi / alasan tidak kerja / tak absen
 * Data: riwayat hari (kunci sama dengan Riwayat Kas) + kalender kantor bulan itu.
 */
export function LayarAbsensi() {
  const bawah = useSafeAreaInsets().bottom;
  const zona = useZonaKantor();
  const hariIni = useHariIni();
  const tanggal = hariIni.data?.kalender.tanggal;
  const daftar = useMemo(() => (tanggal ? daftarBulan(tanggal) : []), [tanggal]);
  const [kunci, setKunci] = useState<string | null>(null);
  const bulan = daftar.find((b) => b.kunci === kunci) ?? daftar[0] ?? null;

  const riwayat = useQuery({
    ...kueri.lapangan.riwayatKas(bulan?.mulai ?? "", bulan?.selesai ?? ""),
    placeholderData: keepPreviousData,
  });
  const kalender = useQuery({
    ...kueri.lapangan.kalender(bulan?.kunci),
    placeholderData: keepPreviousData,
  });

  const segarkan = useCallback(
    () => Promise.all([hariIni.refetch(), riwayat.refetch(), kalender.refetch()]),
    [hariIni, riwayat, kalender],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const vm = useMemo(() => {
    if (!bulan || !tanggal || !riwayat.data || !kalender.data) return null;
    const pekan = susunKalender(bulan, tanggal, kalender.data, riwayat.data);
    return {
      pekan,
      sorot: sorotKehadiran(ringkasAbsensi(pekan), bulan.bulanIni),
      baris: daftarAbsen(pekan, riwayat.data),
    };
  }, [bulan, tanggal, riwayat.data, kalender.data]);
  const ganti = riwayat.isPlaceholderData || kalender.isPlaceholderData;

  let isi: React.ReactNode;
  if (vm) {
    isi = (
      <View style={[gaya.susun, ganti ? gaya.redup : null]}>
        <KartuSorot vm={vm.sorot} />
        <KalenderAbsensi pekan={vm.pekan} />
        {vm.baris.length > 0 ? (
          <View style={g.bagian}>
            <Text style={g.judulBagian}>RIWAYAT ABSEN</Text>
            <Kartu>
              {vm.baris.map((b) => (
                <Baris
                  key={b.tanggal}
                  label={formatTanggal(b.tanggal, "panjang").replace(/ \d{4}$/, "")}
                  nilai={
                    b.keadaan === "masuk"
                      ? `Masuk ${b.absenAt ? jam(b.absenAt, zona) : ""}`.trim()
                      : b.keadaan === "tidak-kerja"
                        ? `Tidak kerja${b.alasan ? ` · ${b.alasan}` : ""}`
                        : "Tak absen"
                  }
                  warna={
                    b.keadaan === "masuk"
                      ? WARNA.sukses
                      : b.keadaan === "tidak-kerja"
                        ? WARNA.waspada
                        : WARNA.bahaya
                  }
                />
              ))}
            </Kartu>
          </View>
        ) : null}
        <Text style={g.teksMini}>
          Hari kerja mengikuti pola pekan & libur kantor yang diatur bos. Jam = saat absen pagi
          dicatat.
        </Text>
      </View>
    );
  } else if (hariIni.isError || riwayat.isError || kalender.isError) {
    isi = (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={(hariIni.error ?? riwayat.error ?? kalender.error)?.message} />
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
      {isi}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[3] },
  susun: { gap: RUANG[3] },
  /** Bulan baru sedang dimuat: angka lama tetap di tempat, diredupkan. */
  redup: { opacity: 0.45 },
});
