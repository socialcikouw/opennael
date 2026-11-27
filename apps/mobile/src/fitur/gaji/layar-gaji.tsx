import { rupiah } from "@opennael/format";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KartuRincian } from "@/komponen/statistik/kartu-rincian";
import { KartuSorot } from "@/komponen/statistik/kartu-sorot";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG } from "@/tema";
import { useGajiBerjalan } from "./data";
import { barisHarian, ringkasSlip, sorotGajiBerjalan } from "./inti/gaji";
import { KartuSlip } from "./komponen/kartu-slip";

/**
 * GAJI (Mode Rekap › Menu › Gaji, 28 Nov 2026; aturan-usaha J) — satu gulungan:
 *   ███ GAJI BELUM DIBAYAR ███  sejak slip terakhir s/d hari ini, perkiraan (kotor, tekor)
 *   Rincian Per Hari            storting × tarif, tekor — terbaru di atas
 *   Slip Gaji                   sudah dibayar tahun ini, lalu tiap slip (yang batal dicoret)
 * Gaji dihitung dari storting SEMUA jenis pinjaman; dibayar bos dari web.
 */
export function LayarGaji() {
  const bawah = useSafeAreaInsets().bottom;
  const { hariIni, tanggal, slip, mulai, pratinjau } = useGajiBerjalan();

  const segarkan = useCallback(
    () => Promise.all([hariIni.refetch(), slip.refetch(), pratinjau.refetch()]),
    [hariIni, slip, pratinjau],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const riwayat = useMemo(
    () => (slip.data && tanggal ? ringkasSlip(slip.data, tanggal.slice(0, 4)) : null),
    [slip.data, tanggal],
  );

  const galat = hariIni.error ?? slip.error ?? pratinjau.error;
  let isi: React.ReactNode;
  if (pratinjau.data && mulai && tanggal && riwayat) {
    isi = (
      <>
        <KartuSorot vm={sorotGajiBerjalan(pratinjau.data, mulai, tanggal)} />
        <KartuRincian
          vm={{
            kunci: "harian",
            judul: "Rincian Per Hari",
            ikon: "calendar-days",
            nilai: pratinjau.data.gajiBersih,
            rumus: "Gaji tiap hari tagih dikurangi tekor",
            meta:
              pratinjau.data.hari.length === 0
                ? "Belum ada storting sejak slip terakhir."
                : `${pratinjau.data.hari.length} hari bersetoran atau bertekor`,
            selisih: null,
            segmen: null,
            grid: false,
            rincian: barisHarian(pratinjau.data),
            kaki: null,
            daftar: null,
          }}
        />
        <View style={g.bagian}>
          <Text style={g.judulBagian}>SLIP GAJI</Text>
          <Text style={g.teksRedup}>
            {riwayat.jumlahTahunIni > 0
              ? `Dibayar tahun ini ${rupiah(riwayat.dibayarTahunIni)} · ${riwayat.jumlahTahunIni} slip`
              : "Belum ada slip tahun ini."}
          </Text>
          {riwayat.urut.map((s) => (
            <KartuSlip key={s.id} s={s} />
          ))}
        </View>
        <Text style={g.teksMini}>
          Gaji dihitung dari storting semua jenis pinjaman dengan tarif yang berlaku tiap hari;
          tekor dipotong saat kasir menerima setoran sore. Angka hari ini masih bisa berubah sampai
          laporan diterima.
        </Text>
      </>
    );
  } else if (galat && !pratinjau.data) {
    isi = (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={galat.message} />
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
      {galat && pratinjau.data ? (
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
  isi: { gap: RUANG[3], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
});
