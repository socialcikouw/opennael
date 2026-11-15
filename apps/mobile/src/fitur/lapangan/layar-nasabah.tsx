import { rupiah, tampilKampung, tampilNama } from "@opennael/format";
import { router, Stack } from "expo-router";
import { Alert, Linking, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Kartu } from "@/komponen/ui/kartu";
import { Kerangka } from "@/komponen/ui/kerangka";
import { Gulir } from "@/komponen/ui/layar";
import { Lencana } from "@/komponen/ui/lencana";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import {
  useNasabah,
  usePinjamanNasabah,
  useRekamTitikRumah,
  useSegarkanLapangan,
  useTagihan,
} from "./data";
import {
  fotoTerbaru,
  nomorWhatsApp,
  saldoAktif,
  tautanPeta,
  tautanTelepon,
  tautanWhatsApp,
  tautanWhatsAppWeb,
  urutPinjaman,
} from "./inti/nasabah";
import { AksiCepat } from "./komponen/aksi-cepat";
import { BarisPinjaman } from "./komponen/baris-pinjaman";
import { FotoSerahTerima } from "./komponen/foto-nasabah";
import { KepalaNasabah } from "./komponen/kepala-nasabah";
import { useNamaDesa } from "./nama-desa";

/** Buka tautan luar (telepon, peta); gagal → pemberitahuan, bukan crash. */
function buka(url: string, gagal: string) {
  Linking.openURL(url).catch(() => Alert.alert("Tidak Bisa Dibuka", gagal));
}

/** Langsung ke aplikasi WhatsApp; bila tak terpasang, tautan web (peramban / toko aplikasi). */
function bukaWhatsApp(nomorLengkap: string) {
  Linking.openURL(tautanWhatsApp(nomorLengkap)).catch(() =>
    buka(tautanWhatsAppWeb(nomorLengkap), "WhatsApp tidak bisa dibuka di HP ini."),
  );
}

/**
 * DETAIL NASABAH (diketuk dari nama di kartu tagih), dari atas ke bawah:
 *   1. foto serah terima terbaru, dengan nama desa titik rumah di pojok kiri bawah;
 *   2. kartu identitas — nama, kampung, tabungan (rahasia), sisa pinjaman, nomor HP, NIK;
 *   3. aksi cepat — Telepon, WhatsApp (bila nomor HP tercatat), Peta (bila titik rumah ada);
 *   4. semua pinjamannya, rincian lengkap di tempat (tanpa layar rincian lagi).
 * Titik rumah direkam otomatis saat akad (tak diganti lagi); tombol rekam manual hanya
 * muncul selama nasabah belum punya titik. Nama, kampung, tabungan, dan foto langsung
 * tampil dari daftar tagih yang sudah termuat; sisanya menyusul dari server
 * (`GET /nasabah/:id` dan `GET /pinjaman?nasabahId=`), yang sudah mulai diambil
 * sejak jari menekan nama.
 */
export function LayarNasabah({ id }: { id: string }) {
  const g = useG();
  const tagih = useTagihan();
  const nasabah = useNasabah(id);
  const pinjaman = usePinjamanNasabah(id);
  const segarkan = useSegarkanLapangan();
  const rekam = useRekamTitikRumah(id);

  // Cadangan cepat: kartu tagih nasabah ini yang sudah ada di memori.
  const kartu = tagih.data?.find((p) => p.nasabah.id === id);
  const n = nasabah.data;
  const desa = useNamaDesa(n?.lokasi ?? null);
  const nama = n?.nama ?? kartu?.nasabah.nama;
  const kampung = n?.kampung.nama ?? kartu?.nasabah.kampung;
  const tabungan = n?.saldoTabungan ?? kartu?.tabungan ?? null;
  const fotoId = pinjaman.data ? fotoTerbaru(pinjaman.data) : (kartu?.fotoSerahTerimaId ?? null);

  if (!nama) {
    if (nasabah.isPending) return <Kerangka jenis="rincian" />;
    return (
      <Gulir onSegarkan={segarkan}>
        <Keterangan>{nasabah.error?.message ?? "Nasabah ini tidak bisa dimuat."}</Keterangan>
        <Tombol judul="Coba lagi" ikon="refresh-cw" onPress={() => void nasabah.refetch()} />
        <Tombol judul="Kembali" ikon="arrow-left" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const namaTampil = tampilNama(nama);
  const saldoPinjaman = pinjaman.data
    ? rupiah(saldoAktif(pinjaman.data))
    : kartu
      ? rupiah(kartu.saldo)
      : null;
  const nomorHp = n?.nomorHp ?? null;
  const nomorWa = nomorHp ? nomorWhatsApp(nomorHp) : null;
  const lokasi = n?.lokasi ?? null;

  const rekamTitik = () =>
    Alert.alert(
      "Rekam Titik Rumah?",
      `Pastikan Anda sedang berada di depan rumah ${namaTampil}. Titik rumah yang sudah direkam tidak bisa diganti lagi.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Rekam",
          onPress: () =>
            rekam.mutate(undefined, {
              onError: (e) => Alert.alert("Gagal Merekam Titik Rumah", e.message),
            }),
        },
      ],
    );

  return (
    <Gulir onSegarkan={segarkan}>
      <Stack.Screen options={{ title: namaTampil }} />
      {fotoId ? (
        <FotoSerahTerima
          fotoId={fotoId}
          nama={namaTampil}
          keterangan={desa ? tampilKampung(desa) : null}
        />
      ) : null}

      <KepalaNasabah
        nama={namaTampil}
        kampung={kampung ? tampilKampung(kampung) : null}
        diblokir={!!n?.diblokir}
        tabungan={tabungan !== null ? rupiah(tabungan) : null}
        saldoPinjaman={saldoPinjaman}
        nomorHp={nomorHp}
        nik={n?.nik ?? null}
      />

      {nomorHp || lokasi ? (
        <View style={g.baris2}>
          {nomorHp ? (
            <AksiCepat
              ikon="phone"
              label="Telepon"
              petunjuk={`Telepon ${nomorHp}`}
              onPress={() => buka(tautanTelepon(nomorHp), "Aplikasi telepon tidak tersedia.")}
            />
          ) : null}
          {nomorWa ? (
            <AksiCepat
              ikon="message-circle"
              label="WhatsApp"
              petunjuk={`Chat WhatsApp ${nomorHp}`}
              onPress={() => bukaWhatsApp(nomorWa)}
            />
          ) : null}
          {lokasi ? (
            <AksiCepat
              ikon="map-pin"
              label="Peta"
              petunjuk="Buka titik rumah di Google Maps"
              onPress={() => buka(tautanPeta(lokasi), "Aplikasi peta tidak tersedia.")}
            />
          ) : null}
        </View>
      ) : null}

      {n && !lokasi ? (
        <Kartu>
          <Keterangan>
            Titik rumah belum direkam. Biasanya terekam otomatis saat akad; rekam sekarang bila Anda
            sedang di depan rumahnya.
          </Keterangan>
          <Tombol
            judul="Rekam titik rumah di sini"
            ikon="map-pin"
            memuat={rekam.isPending}
            onPress={rekamTitik}
          />
        </Kartu>
      ) : null}

      <View style={g.baris2}>
        <Text style={g.subjudul}>Pinjaman</Text>
        {pinjaman.data ? <Lencana teks={String(pinjaman.data.length)} /> : null}
      </View>
      {pinjaman.isPending ? (
        <Keterangan>Memuat pinjaman…</Keterangan>
      ) : pinjaman.isError ? (
        <>
          <Keterangan>{pinjaman.error.message}</Keterangan>
          <Tombol
            judul="Coba lagi"
            ikon="refresh-cw"
            jenis="kedua"
            onPress={() => void pinjaman.refetch()}
          />
        </>
      ) : pinjaman.data.length === 0 ? (
        <Keterangan>Belum ada pinjaman.</Keterangan>
      ) : (
        urutPinjaman(pinjaman.data).map((p) => <BarisPinjaman key={p.id} p={p} />)
      )}
    </Gulir>
  );
}
