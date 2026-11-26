import { kunci } from "@opennael/api-client";
import { LABEL_JENIS } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHariIni } from "@/fitur/lapangan";
import { KartuJatuhTempo } from "@/fitur/tagihan";
import { PilGulir } from "@/komponen/pil-gulir";
import { PilJenis, type SaringJenis } from "@/komponen/pil-jenis";
import { KepalaJudulBesar } from "@/komponen/statistik/kepala-judul-besar";
import { KerangkaStatistik } from "@/komponen/statistik/kerangka-statistik";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, RUANG } from "@/tema";
import { useDataPerforma } from "./data";
import { daftarBulan } from "./inti/bulan";
import { HeroPerforma } from "./komponen/hero-performa";
import { KartuGrafik } from "./komponen/kartu-grafik";
import { KartuHariIni } from "./komponen/kartu-hari-ini";
import { KartuRasio } from "./komponen/kartu-rasio";
import { RiwayatPerforma } from "./komponen/riwayat-performa";

/**
 * PERFORMA (tab kedua Mode Rekap; rupa aplikasi lama, 27 Nov 2026) — satu gulungan:
 *
 *   NOVEMBER 2026 · S/D 27
 *   Performa                                 ← judul besar (kepala tab disembunyikan)
 *   [Bulan Ini][Oktober 2026] …              ← pil bulan
 *   [Semua][Harian][Mingguan][Tempoan]       ← pil jenis
 *   kartu utama: cincin rata-rata % + tingkat + rata-rata tagihan murni per hari tagih
 *   (Bulan Ini) Hari Ini · Rasio Bayar / Jatuh Tempo tempoan
 *   grafik per hari tagih (warna tingkat) + sorotan + legenda
 *   riwayat harian
 *
 * Aturan-usaha N (N1 harian, N3 mingguan & tempoan, N4 semua); tingkat lima warna dari
 * aplikasi lama (`inti/tingkat.ts`). Laporan sore di Ringkasan (pil Hari Ini).
 */
export function LayarPerforma() {
  const atas = useSafeAreaInsets().top;
  const ruangTab = useRuangTab();
  const klien = useQueryClient();
  const [kunciBulan, setKunciBulan] = useState<string | null>(null);
  const [saring, setSaring] = useState<SaringJenis>("semua");
  const jenis = saring === "semua" ? null : saring;

  // Pil bulan dari hari kantor; sebelum dimuat belum ada pil.
  const tanggal = useHariIni().data?.kalender.tanggal;
  const daftar = useMemo(() => (tanggal ? daftarBulan(tanggal) : []), [tanggal]);
  const bulan = daftar.find((b) => b.kunci === kunciBulan) ?? daftar[0] ?? null;
  const d = useDataPerforma(bulan, jenis);

  // Semua bacaan berawalan `lapangan`: satu invalidasi menyegarkan semuanya.
  const segarkan = useCallback(
    () => klien.invalidateQueries({ queryKey: kunci.lapangan }),
    [klien],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const namaJenis = jenis ? LABEL_JENIS[jenis] : "Semua Jenis";
  const p = d.performa;
  const r = d.rasio;
  const dicatat = r ? r.bayar + r.libur : 0;
  const wajib = r ? dicatat + r.sisa : 0;
  const masukKerja = d.hariIni.data?.hari?.absensi === "masuk_kerja";

  let isi: React.ReactNode;
  if (!bulan || (!p && !d.deret.isError)) {
    isi = d.hariIni.isError ? (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={d.hariIni.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    ) : (
      <KerangkaStatistik />
    );
  } else if (!p) {
    isi = (
      <View style={g.tumpuk3}>
        <PesanGalat pesan={d.deret.error?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  } else {
    const kataBulan = bulan.bulanIni ? "bulan ini" : bulan.pil;
    isi = (
      <View style={[gaya.susun, d.ganti ? gaya.redup : null]}>
        <HeroPerforma
          overline={`Rata-rata ${kataBulan} · ${namaJenis}`}
          persen={p.rataRata}
          murni={p.rataMurni}
          catatan={
            p.hariDinilai > 0
              ? `Dari ${p.hariDinilai} hari tagih selesai · hari ini, Minggu & libur kantor tidak dihitung`
              : bulan.bulanIni
                ? "Belum ada hari tagih selesai yang bisa dinilai bulan ini."
                : `Tidak ada hari tagih yang bisa dinilai di ${bulan.pil}.`
          }
        />

        {bulan.bulanIni ? (
          <>
            <KartuHariIni
              p={p}
              dicatat={masukKerja && r ? (wajib > 0 ? `${dicatat} / ${wajib}` : "—") : null}
              setoran={masukKerja && r ? r.setoran : null}
            />
            {jenis === "tempoan" ? (
              d.jatuhTempo ? (
                <KartuJatuhTempo r={d.jatuhTempo} aksen={AKSEN} />
              ) : null
            ) : (
              <KartuRasio
                r={r}
                gagal={d.tagihan.isError && !d.tagihan.data}
                aksen={AKSEN}
                // Laporan sore dibuka dari Ringkasan (tab pertama mode ini).
                onLaporan={() => router.navigate("/kolektor/ringkasan")}
              />
            )}
          </>
        ) : null}

        <KartuGrafik
          p={p}
          kosong={
            bulan.bulanIni
              ? "Belum ada hari tagih bulan ini."
              : `Tidak ada hari tagih di ${bulan.pil}.`
          }
        />
        <RiwayatPerforma
          titik={p.titik}
          kosong={
            bulan.bulanIni ? "Belum ada riwayat bulan ini." : `Tidak ada riwayat di ${bulan.pil}.`
          }
        />
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
      <KepalaJudulBesar overline={bulan?.judul ?? " "} judul="Performa" />
      <View style={g.tumpuk2}>
        <PilGulir
          opsi={daftar.map((b) => ({ nilai: b.kunci, label: b.pil }))}
          nilai={bulan?.kunci ?? ""}
          onPilih={setKunciBulan}
        />
        <PilJenis nilai={saring} onPilih={setSaring} />
      </View>
      {d.hariIni.isError || d.tagihan.isError || (d.deret.isError && p) ? (
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
  susun: { gap: RUANG[3] },
  /** Bulan/jenis baru sedang dimuat: angka lama tetap di tempat, diredupkan. */
  redup: { opacity: 0.45 },
});
