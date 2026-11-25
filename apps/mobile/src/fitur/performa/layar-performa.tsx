import { kunci } from "@opennael/api-client";
import { tanggal as formatTanggal, LABEL_JENIS, rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { KartuJatuhTempo } from "@/fitur/tagihan";
import { PilJenis, type SaringJenis } from "@/komponen/pil-jenis";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Kerangka } from "@/komponen/ui/kerangka";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, HURUF, RUANG, TEBAL } from "@/tema";
import { useDataPerforma } from "./data";
import { KartuPerforma } from "./komponen/kartu-performa";
import { KartuRasio } from "./komponen/kartu-rasio";

/**
 * PERFORMA (tab kedua Mode Rekap) — angka kerja kolektor, disaring Semua · Harian · Mingguan ·
 * Tempoan: rasio bayar hari ini (Tempoan: jatuh tempo, karena tak ditagih setiap hari),
 * performa tagihan murni bulan ini, dan yang dicatat & disetor hari ini. Portofolio ada di
 * tab Portofolio; laporan sore di Ringkasan › Mutasi Kas.
 */
export function LayarPerforma() {
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const [saring, setSaring] = useState<SaringJenis>("semua");
  const jenis = saring === "semua" ? null : saring;
  const { hariIni, tagihan, deret, rasio, jatuhTempo, performa } = useDataPerforma(jenis);
  const aksen = AKSEN;

  // Semua bacaan berawalan `lapangan`: satu invalidasi menyegarkan semuanya, dan pemutarnya
  // hanya menyala karena ditarik (bukan karena penyegaran di latar).
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Kerangka jenis="daftar" teks="Memuat performa…" />;
  // Layar galat penuh hanya bila keadaan hari ini belum pernah berhasil dimuat; gagal
  // menyegarkan data yang sudah ada cukup spanduk di atas isi.
  const keadaan = hariIni.data;
  if (!keadaan) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={hariIni.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  const namaJenis = jenis ? LABEL_JENIS[jenis] : "Semua Jenis";
  const gagalSegar = hariIni.isError || tagihan.isError;
  const dicatat = rasio ? rasio.bayar + rasio.libur : 0;
  const wajibTotal = rasio ? dicatat + rasio.sisa : 0;
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <Text style={[gaya.tanggal, { color: aksen.teks }]}>
        {formatTanggal(keadaan.kalender.tanggal, "panjang")}
      </Text>
      <PilJenis nilai={saring} onPilih={setSaring} />

      {gagalSegar ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      {jenis === "tempoan" ? (
        jatuhTempo ? (
          <KartuJatuhTempo r={jatuhTempo} aksen={aksen} />
        ) : null
      ) : (
        <KartuRasio
          r={rasio}
          gagal={tagihan.isError && !tagihan.data}
          aksen={aksen}
          // Laporan sore dibuka dari Ringkasan › Mutasi Kas (tab pertama mode ini).
          onLaporan={() => router.navigate("/kolektor/ringkasan")}
        />
      )}
      <KartuPerforma
        p={performa}
        gagal={deret.isError && !deret.data}
        jenis={jenis ? `pinjaman ${namaJenis.toLowerCase()}` : "semua jenis"}
        aksen={aksen}
      />

      {keadaan.hari?.absensi === "masuk_kerja" && rasio ? (
        <View style={g.bagian}>
          <Text style={g.judulBagian}>HARI INI · {namaJenis.toUpperCase()}</Text>
          <View style={g.baris3}>
            <KotakAngka
              label="Dicatat"
              ikon="check-check"
              nilai={wajibTotal > 0 ? `${dicatat} / ${wajibTotal}` : "—"}
            />
            <KotakAngka label="Setoran" ikon="banknote" nilai={rupiah(rasio.setoran)} />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
  isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang },
});
