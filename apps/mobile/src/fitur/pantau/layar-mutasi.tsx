import { tanggal as formatTanggal, jam, rupiah } from "@opennael/format";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { ItemPengingat, usePengingat } from "@/fitur/notifikasi";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useZonaKantor } from "@/lib/kantor";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useBiayaHariIni, useKasHariIni } from "./data";
import { barisArusKas, type KeadaanKas, keadaanKas } from "./inti/arus-kas";
import { KartuTotal } from "./komponen/kartu-total";

const LABEL_KEADAAN: Record<KeadaanKas, string> = {
  "belum-absen": "Belum absen",
  "tidak-kerja": "Tidak kerja",
  lapangan: "Di lapangan",
  laporan: "Laporan dibuka",
  diterima: "Kas diterima",
};

const TANDA = { awal: undefined, masuk: "+", keluar: "−" } as const;

/**
 * MUTASI (mode Semua) — arus kas kolektor hari ini (aturan-usaha I1): kas
 * lapangan + storting + tabungan masuk + admin − droping − transfer − biaya
 * tak terduga = tunai yang harus disetor sore. Angkanya dari server, ikut
 * bergerak sampai laporan dibuka, lalu terkunci saat kasir menerima kas
 * (tampil tekor / lebih setor). Absen & buka laporan juga bisa dari sini —
 * di mode Semua tak ada tab Notifikasi.
 */
export function LayarMutasi() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const WARNA = useWarna();
  const aksen = useWarnaMode("semua");
  const ruangTab = useRuangTab();
  const zona = useZonaKantor();
  const { hariIni, tagihan, pengingat, belum } = usePengingat();
  const tanggal = hariIni.data?.kalender.tanggal;
  const kas = useKasHariIni();
  const biaya = useBiayaHariIni(tanggal);

  const { refetch: segarHariIni } = hariIni;
  const { refetch: segarTagihan } = tagihan;
  const { refetch: segarKas } = kas;
  const { refetch: segarBiaya } = biaya;
  const segarkan = useCallback(
    () => Promise.all([segarHariIni(), segarTagihan(), segarKas(), segarBiaya()]),
    [segarHariIni, segarTagihan, segarKas, segarBiaya],
  );
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  const hari = kas.data;
  const keadaan = keadaanKas(hari);
  const arus = useMemo(() => (hari?.rincian ? barisArusKas(hari.rincian) : []), [hari]);
  const daftarBiaya = biaya.data?.biaya.filter((b) => !b.dibatalkanAt) ?? [];

  if (hariIni.isPending || kas.isPending) return <Memuat teks="Memuat mutasi…" />;
  const galat = !hariIni.data ? hariIni.error : kas.isError && !kas.data ? kas.error : null;
  if (galat || !tanggal) {
    return (
      <View style={[g.layar, gaya.galat]}>
        <PesanGalat pesan={galat?.message} />
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void segarkan()} />
      </View>
    );
  }

  const st = hari?.serahTerima ?? null;
  // Sesudah kas diterima, angka yang berlaku adalah yang dibekukan saat itu.
  const harusSetor = st?.tunaiSeharusnya ?? hari?.rincian?.tunaiSeharusnya ?? 0;
  // Pengingat (absen, belum dicatat, laporan siap) hanya relevan sebelum laporan dibuka.
  const tampilPengingat = keadaan === "belum-absen" || keadaan === "lapangan";

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      refreshControl={
        <RefreshControl
          refreshing={menarik}
          onRefresh={tarik}
          tintColor={aksen.teks}
          colors={[aksen.teks]}
        />
      }
    >
      <View style={gaya.barisTanggal}>
        <Text style={[gaya.tanggal, { color: aksen.teks }]}>
          {formatTanggal(tanggal, "panjang")}
        </Text>
        <View style={[gaya.lencana, { backgroundColor: aksen.lembut }]}>
          <Text style={[gaya.lencanaTeks, { color: aksen.teks }]}>{LABEL_KEADAAN[keadaan]}</Text>
        </View>
      </View>

      {hariIni.isError || kas.isError ? (
        <Spanduk
          judul="Gagal menyegarkan"
          isi="Data mungkin belum terbaru. Tarik ke bawah untuk mencoba lagi."
        />
      ) : null}

      {tampilPengingat
        ? pengingat?.map((p) => (
            <ItemPengingat
              key={p.jenis}
              p={p}
              jumlahBelum={belum?.length ?? 0}
              tautanTagihan={false}
            />
          ))
        : null}

      {keadaan === "tidak-kerja" ? (
        <Spanduk
          judul="Tidak kerja hari ini"
          isi={hari?.alasanTidakKerja ?? "Tak ada arus kas lapangan."}
        />
      ) : null}
      {keadaan === "laporan" && hari?.laporanDibukaAt ? (
        <Spanduk
          warna="hijau"
          judul={`Laporan dibuka pukul ${jam(hari.laporanDibukaAt, zona)}`}
          isi="Serahkan tunai ke kasir. Angka di bawah tidak bergerak lagi."
        />
      ) : null}

      {hari && hari.absensi === "masuk_kerja" ? (
        <>
          <KartuTotal
            label={st ? "TUNAI SEHARUSNYA DISETOR" : "TUNAI YANG HARUS DISETOR"}
            ikon="wallet"
            nilai={harusSetor}
            keterangan={`Uang jalan ${rupiah(hari.uangJalan)} tidak ikut disetor`}
            rincian={arus.map((b) => ({ label: b.label, nilai: b.nilai, tanda: TANDA[b.tanda] }))}
            kaki={
              st ? (
                <View style={gaya.serah}>
                  <Baris label="Tunai diterima kasir" nilai={rupiah(st.tunaiDiterima)} tebal />
                  <Baris
                    label={
                      st.selisihSetor < 0 ? "Tekor" : st.selisihSetor > 0 ? "Lebih setor" : "Pas"
                    }
                    nilai={rupiah(st.selisihSetor)}
                    tebal
                    warna={
                      st.selisihSetor < 0
                        ? WARNA.bahaya
                        : st.selisihSetor > 0
                          ? WARNA.utama
                          : WARNA.teks
                    }
                  />
                  <Text style={g.teksMini}>
                    Diterima {st.diterimaOleh.nama} · {jam(st.dibuatAt, zona)}
                  </Text>
                </View>
              ) : null
            }
          />

          <View style={gaya.bagian}>
            <Text style={gaya.judulBagian}>BIAYA TAK TERDUGA</Text>
            {daftarBiaya.length > 0 ? (
              <Kartu>
                {daftarBiaya.map((b) => (
                  <Baris key={b.id} label={b.keterangan} nilai={rupiah(b.nominal)} />
                ))}
              </Kartu>
            ) : (
              <Text style={g.teksRedup}>
                {biaya.isError ? "Gagal memuat biaya." : "Belum ada — dicatat kasir sore hari."}
              </Text>
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    galat: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingVertical: RUANG[6] },
    isi: { gap: RUANG[4], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
    barisTanggal: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    tanggal: { ...HURUF.sm, flex: 1, fontWeight: TEBAL.sedang },
    lencana: { paddingHorizontal: RUANG[2.5], paddingVertical: 2, borderRadius: SUDUT.bulat },
    lencanaTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
    serah: {
      gap: RUANG[1.5],
      marginTop: RUANG[1],
      paddingTop: RUANG[3],
      borderTopWidth: 1,
      borderTopColor: WARNA.garis,
    },
    bagian: { gap: RUANG[2] },
    judulBagian: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: 0.8,
      color: WARNA.redup,
    },
  });
