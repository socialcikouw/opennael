import { kunci } from "@opennael/api-client";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya, useWarnaMode } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useSesi } from "@/lib/sesi";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useDataDasbor } from "./data";
import { KakiAkun } from "./komponen/kaki-akun";
import { KartuPerforma } from "./komponen/kartu-performa";
import { KartuRasio } from "./komponen/kartu-rasio";
import { Portofolio } from "./komponen/portofolio";

/**
 * DASBOR KOLEKTOR — angka kerja sekilas: rasio bayar hari ini, performa tagihan
 * murni, portofolio pegangan (saldo berjalan, macet, diputihkan, piutang aktif),
 * dan setoran hari ini. Pengingat (belum absen, belum dicatat, laporan) ada di
 * tab Notifikasi; daftar tagih di tab Tagihan.
 */
export function LayarDasbor() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const s = useSesi();
  const aksen = useWarnaMode("semua");
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const { hariIni, tagihan, deret, portofolio, rasio, performa } = useDataDasbor();

  // Semua bacaan Dasbor berawalan `lapangan`: satu invalidasi menyegarkan semuanya, dan
  // pemutarnya hanya menyala karena ditarik (bukan karena penyegaran di latar).
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (hariIni.isPending) return <Memuat teks="Memuat dasbor…" />;
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

  const gagalSegar = hariIni.isError || tagihan.isError;
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <View style={g.tumpuk05}>
        <Text style={gaya.tanggal}>{formatTanggal(keadaan.kalender.tanggal, "panjang")}</Text>
        <Text style={g.judul}>Halo, {s?.pengguna.nama}</Text>
        <Text style={g.teksRedup}>{s?.pengguna.kantor.nama}</Text>
      </View>

      {gagalSegar ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      <KartuRasio
        r={rasio}
        gagal={tagihan.isError && !tagihan.data}
        aksen={aksen}
        onLaporan={() => router.navigate("/kolektor/notifikasi")}
      />
      <KartuPerforma p={performa} gagal={deret.isError && !deret.data} aksen={aksen} />

      <View style={gaya.bagian}>
        <Text style={gaya.judulBagian}>PORTOFOLIO</Text>
        <Portofolio data={portofolio.data} gagal={portofolio.isError && !portofolio.data} />
      </View>

      {keadaan.hari?.absensi === "masuk_kerja" && rasio ? (
        <View style={gaya.bagian}>
          <Text style={gaya.judulBagian}>HARI INI</Text>
          <View style={g.baris3}>
            <KotakAngka
              label="Dicatat"
              ikon="check-check"
              nilai={`${rasio.bayar + rasio.libur} / ${rasio.bayar + rasio.libur + rasio.sisa}`}
            />
            <KotakAngka label="Setoran" ikon="banknote" nilai={rupiah(rasio.setoran)} />
          </View>
        </View>
      ) : null}

      <KakiAkun />
    </ScrollView>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    tanggal: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.utama },
    bagian: { gap: RUANG[2] },
    judulBagian: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: 0.8,
      color: WARNA.redup,
    },
  });
