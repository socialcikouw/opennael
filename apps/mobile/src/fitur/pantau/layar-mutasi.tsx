import { tanggal as formatTanggal, jam, rupiah } from "@opennael/format";
import { useCallback, useMemo } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { type GerbangMutasi, useGerbangMutasi, useKasHariIni } from "@/fitur/lapangan";
import { AksiLaporan, ItemPengingat, usePengingat } from "@/fitur/notifikasi";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Memuat } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { useZonaKantor } from "@/lib/kantor";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { useBiayaHariIni } from "./data";
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

/** Penjelasan gembok per keadaan gerbang (selain `siap`). */
const ALASAN_GEMBOK: Record<Exclude<GerbangMutasi, "siap">, string> = {
  memuat: "Memeriksa tagihan hari ini…",
  "belum-absen": "Absen pagi dulu. Mutasi kas terbuka sesudah semua nasabah hari ini ditagih.",
  "tidak-kerja": "Anda tidak kerja hari ini — tak ada arus kas lapangan.",
  "belum-ada-nasabah": "Belum ada nasabah untuk ditagih dan belum ada catatan hari ini.",
  "masih-menagih":
    "Masih ada nasabah yang belum ditagih. Mutasi kas terbuka sesudah semuanya dicatat — bayar atau libur.",
};

/**
 * MUTASI (mode Semua) — arus kas kolektor hari ini (aturan-usaha I1): kas
 * lapangan + storting + tabungan masuk + admin − droping − transfer − biaya
 * tak terduga = tunai yang harus disetor sore.
 *
 * TERGEMBOK (ikon tab ikut menjadi gembok) selama gerbang Mutasi belum terbuka
 * (C6): semua nasabah wajib hari ini — harian, mingguan di hari tagihnya,
 * tempoan sejak jatuh tempo — harus sudah dicatat. Selama terkunci tampil
 * alasannya dan siapa yang menahan, dengan tombol pindah ke mode jenisnya.
 * Sesudah terbuka: arus kas, lalu Buka laporan (mengunci catatan lapangan hari
 * ini). Sesudah kasir menerima kas: tekor / lebih setor.
 */
export function LayarMutasi() {
  const gaya = useGaya(buatGaya);
  const g = useG();
  const WARNA = useWarna();
  const aksen = useWarnaMode("semua");
  const ruangTab = useRuangTab();
  const zona = useZonaKantor();
  const { hariIni, tagihan, pengingat } = usePengingat();
  const { gerbang, belum } = useGerbangMutasi();
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
  const terbuka = gerbang === "siap";
  // Saat tergembok: yang menahan (absen, kabar gerbang, yang belum ditagih per jenis).
  const penahan = (pengingat ?? []).filter(
    (p) => p.jenis === "absen" || p.jenis === "gerbang" || p.jenis === "belum",
  );

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

      {terbuka ? null : (
        <>
          <View style={gaya.gembok}>
            <View style={gaya.gembokIkon}>
              <Ikon nama="lock" ukuran={30} warna={WARNA.redup} />
            </View>
            <Text style={gaya.gembokJudul}>
              {gerbang === "masih-menagih"
                ? `Mutasi kas terkunci · ${belum.length} belum ditagih`
                : "Mutasi kas terkunci"}
            </Text>
            <Text style={gaya.gembokIsi}>
              {gerbang === "tidak-kerja" && hari?.alasanTidakKerja
                ? `Anda tidak kerja hari ini: ${hari.alasanTidakKerja}.`
                : ALASAN_GEMBOK[gerbang]}
            </Text>
          </View>
          {penahan.map((p) => (
            <ItemPengingat key={p.kunci} p={p} tanpaMutasi />
          ))}
        </>
      )}

      {terbuka && keadaan === "laporan" && hari?.laporanDibukaAt ? (
        <Spanduk
          warna="hijau"
          judul={`Laporan dibuka pukul ${jam(hari.laporanDibukaAt, zona)}`}
          isi="Serahkan tunai ke kasir. Angka di bawah tidak bergerak lagi."
        />
      ) : null}

      {terbuka && hari && hari.absensi === "masuk_kerja" ? (
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

          {keadaan === "lapangan" ? (
            <View style={gaya.bagian}>
              <Text style={g.teksRedup}>
                Semua nasabah hari ini sudah ditagih. Periksa angkanya, lalu buka laporan dan
                serahkan tunai ke kasir.
              </Text>
              <AksiLaporan />
            </View>
          ) : null}

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
    gembok: {
      alignItems: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
      paddingHorizontal: RUANG[5],
      paddingVertical: RUANG[6],
    },
    gembokIkon: {
      width: 64,
      height: 64,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    gembokJudul: { ...HURUF.lg, fontWeight: TEBAL.tebal, textAlign: "center", color: WARNA.teks },
    gembokIsi: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
    judulBagian: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: 0.8,
      color: WARNA.redup,
    },
  });
