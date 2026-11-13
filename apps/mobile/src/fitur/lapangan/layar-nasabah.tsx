import { rupiah, tampilKampung, tampilNama } from "@opennael/format";
import { router, Stack } from "expo-router";
import { Alert, Linking, Pressable, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Kerangka } from "@/komponen/ui/kerangka";
import { Gulir } from "@/komponen/ui/layar";
import { Lencana } from "@/komponen/ui/lencana";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { useNasabah, usePinjamanNasabah, useSegarkanLapangan, useTagihan } from "./data";
import { fotoTerbaru, tautanPeta, tautanTelepon, urutPinjaman } from "./inti/nasabah";
import { BarisPinjaman } from "./komponen/baris-pinjaman";
import { FotoSerahTerima } from "./komponen/foto-nasabah";
import { TabunganRahasia } from "./komponen/tabungan-rahasia";

/** Buka tautan luar (telepon, peta); gagal → pemberitahuan, bukan crash. */
function buka(url: string, gagal: string) {
  Linking.openURL(url).catch(() => Alert.alert("Tidak Bisa Dibuka", gagal));
}

/**
 * DETAIL NASABAH (diketuk dari nama di kartu tagih) — foto serah terima
 * terbaru, kampung, nomor HP, tabungan (rahasia sampai diketuk), titik rumah
 * GPS, dan semua pinjamannya. Nama, kampung, tabungan, dan foto langsung
 * tampil dari daftar tagih yang sudah termuat; sisanya menyusul dari server
 * (`GET /nasabah/:id` dan `GET /pinjaman?nasabahId=`), yang sudah mulai diambil
 * sejak jari menekan nama.
 */
export function LayarNasabah({ id }: { id: string }) {
  const g = useG();
  const WARNA = useWarna();
  const tagih = useTagihan();
  const nasabah = useNasabah(id);
  const pinjaman = usePinjamanNasabah(id);
  const segarkan = useSegarkanLapangan();

  // Cadangan cepat: kartu tagih nasabah ini yang sudah ada di memori.
  const kartu = tagih.data?.find((p) => p.nasabah.id === id);
  const n = nasabah.data;
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
  return (
    <Gulir onSegarkan={segarkan}>
      <Stack.Screen options={{ title: namaTampil }} />
      {fotoId ? <FotoSerahTerima fotoId={fotoId} nama={namaTampil} /> : null}

      <Kartu>
        <View style={g.bungkus}>
          <Text style={g.subjudul}>{namaTampil}</Text>
          {n?.diblokir ? <Lencana teks="Diblokir" warna="merah" /> : null}
        </View>
        {kampung ? <Baris label="Kampung" nilai={tampilKampung(kampung)} /> : null}
        {tabungan !== null ? (
          <View style={g.barisNilai}>
            <Text style={g.barisLabel}>Tabungan</Text>
            <TabunganRahasia nilai={rupiah(tabungan)} besar />
          </View>
        ) : null}
        {n?.nomorHp ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={`Telepon ${n.nomorHp}`}
            onPress={() => buka(tautanTelepon(n.nomorHp ?? ""), "Aplikasi telepon tidak tersedia.")}
            style={({ pressed }) => [g.barisNilai, pressed ? g.ditekan : null]}
          >
            <Text style={g.barisLabel}>Nomor HP</Text>
            <View style={g.baris1}>
              <Ikon nama="phone" ukuran={14} warna={WARNA.utama} />
              <Text style={[g.barisAngka, { color: WARNA.utama }]}>{n.nomorHp}</Text>
            </View>
          </Pressable>
        ) : null}
        {n?.nik ? <Baris label="NIK" nilai={n.nik} /> : null}
      </Kartu>

      <Kartu>
        <View style={g.baris1}>
          <Ikon nama="map-pin" ukuran={16} warna={WARNA.teksKedua} />
          <Text style={g.teksTebal}>Titik Rumah</Text>
        </View>
        {n?.lokasi ? (
          <>
            <Text style={g.teksKecil}>
              {n.lokasi.latitude.toFixed(5)}, {n.lokasi.longitude.toFixed(5)} · akurasi ±
              {n.lokasi.akurasiMeter} m
            </Text>
            <Tombol
              judul="Buka peta"
              ikon="map-pin"
              jenis="kedua"
              onPress={() =>
                n.lokasi && buka(tautanPeta(n.lokasi), "Aplikasi peta tidak tersedia.")
              }
            />
          </>
        ) : (
          <Keterangan>{nasabah.isPending ? "Memuat…" : "Titik rumah belum direkam."}</Keterangan>
        )}
      </Kartu>

      <Text style={g.subjudul}>Pinjaman</Text>
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
