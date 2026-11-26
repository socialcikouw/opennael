import { kunci } from "@opennael/api-client";
import { tanggal as formatTanggal } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHariIni } from "@/fitur/lapangan";
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
import { useDataPortofolio } from "./data";
import { portofolioUntuk, sorotSaldoAkhir, susunKartuPortofolio } from "./inti/portofolio";

/**
 * PORTOFOLIO (tab ketiga Mode Rekap; rupa aplikasi lama, 27 Nov 2026) — pegangan kolektor
 * saat ini, satu gulungan:
 *
 *   PEGANGAN · JUMAT, 27 NOV 2026
 *   Portofolio                          ← judul besar (kepala tab disembunyikan)
 *   [Semua][Harian][Mingguan][Tempoan]  ← pil jenis (tanpa permintaan baru)
 *   ███ SALDO AKHIR ███                 ← piutang di lapangan, bar berjalan vs macet
 *   Per Jenis · Nasabah Aktif · Target Angsuran · Tabungan Nasabah · Diputihkan
 *
 * Isi & urutan di `inti/portofolio.ts` (diuji); komponen kartu bersama `komponen/statistik`.
 */
export function LayarPortofolio() {
  const atas = useSafeAreaInsets().top;
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const data = useDataPortofolio();
  const hariIni = useHariIni();
  const [saring, setSaring] = useState<SaringJenis>("semua");
  const jenis = saring === "semua" ? null : saring;

  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const vm = useMemo(
    () =>
      data.data
        ? {
            sorot: sorotSaldoAkhir(portofolioUntuk(data.data, jenis)),
            kartu: susunKartuPortofolio(data.data, jenis),
          }
        : null,
    [data.data, jenis],
  );
  const tanggal = hariIni.data?.kalender.tanggal;

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
      <KepalaJudulBesar
        overline={tanggal ? `Pegangan · ${formatTanggal(tanggal, "panjang")}` : "Pegangan"}
        judul="Portofolio"
      />
      <PilJenis nilai={saring} onPilih={setSaring} />

      {data.isError && data.data ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      {vm ? (
        <View style={gaya.kartu}>
          <KartuSorot vm={vm.sorot} />
          {vm.kartu.map((k) => (
            <KartuRincian key={k.kunci} vm={k} />
          ))}
          <Text style={g.teksMini}>
            Nasabah yang kini Anda pegang. Pinjaman lunas, digulung, dan batal tidak masuk saldo.
          </Text>
        </View>
      ) : data.isError ? (
        <View style={g.tumpuk3}>
          <PesanGalat pesan={data.error.message} />
          <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
        </View>
      ) : (
        <KerangkaStatistik kartu={3} />
      )}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5] },
  kartu: { gap: RUANG[3] },
});
