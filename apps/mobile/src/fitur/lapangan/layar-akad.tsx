import type { NasabahLama } from "@opennael/contracts";
import { type JenisPinjaman, syaratAkad, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS, namaTenor, rupiah } from "@opennael/format";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert } from "react-native";
import { Isian, IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Gulir } from "@/komponen/ui/layar";
import { Pilihan } from "@/komponen/ui/pilihan";
import { useWarna } from "@/komponen/ui/tampilan";
import { Tombol } from "@/komponen/ui/tombol";
import { cobaAturan } from "@/lib/aturan";
import { useAkad } from "./data";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  IsianFotoSerahTerima,
  KameraSerahTerima,
} from "./komponen/kamera-serah-terima";
import { PilihKampung } from "./komponen/pilih-kampung";
import { PilihNasabahLama } from "./komponen/pilih-nasabah-lama";
import { StatusTitikRumah } from "./komponen/status-titik-rumah";
import { useTitikRumahLatar } from "./titik-rumah-latar";

const POKOK_CEPAT = [500_000, 1_000_000, 1_500_000, 2_000_000];

/**
 * AKAD BARU (A) — orang baru, atau nasabah lama pegangan sendiri yang pinjam
 * lagi. Angka pratinjau = rumus server (`syaratAkad`).
 *
 * Dua tahap (keputusan pemilik, 15 Nov 2026): (+) langsung membuka KAMERA
 * serah terima — batal = kembali tanpa mengisi apa pun — baru sesudah foto
 * terpakai formulir tampil (foto berlaku 1 jam, A7). Sejak layar terbuka GPS
 * dipantau di latar (`useTitikRumahLatar`); titik terbaiknya direkam sebagai
 * titik rumah begitu akad tersimpan, tanpa langkah tambahan kolektor.
 */
export function LayarAkad({ jenis: param }: { jenis?: string }) {
  const WARNA = useWarna();
  const [siapa, setSiapa] = useState<"baru" | "lama">("baru");
  const [nama, setNama] = useState("");
  const [kampungTeks, setKampungTeks] = useState("");
  const [kampungId, setKampungId] = useState<string | null>(null);
  const [nik, setNik] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [lama, setLama] = useState<NasabahLama | null>(null);
  // Dibuka dari tombol + mode Harian/Mingguan/Tempoan: jenisnya mengikuti mode, tanpa pilihan.
  const jenisTetap = param && param in TENOR_PINJAMAN ? (param as JenisPinjaman) : null;
  const [jenis, setJenis] = useState<JenisPinjaman>(jenisTetap ?? "harian");
  const [tenor, setTenor] = useState<number>(TENOR_PINJAMAN[jenisTetap ?? "harian"][0] ?? 0);
  const [pokok, setPokok] = useState(1_000_000);
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const akad = useAkad();
  const titikLatar = useTitikRumahLatar();

  const pilihJenis = (j: JenisPinjaman) => {
    setJenis(j);
    setTenor(TENOR_PINJAMAN[j][0] ?? 0);
  };
  const pilihLama = (n: NasabahLama | null) => {
    setLama(n);
    if (n?.terakhir && (!jenisTetap || n.terakhir.jenis === jenisTetap)) {
      pilihJenis(n.terakhir.jenis);
      setPokok(n.terakhir.pokok);
    }
  };

  const syarat = cobaAturan(() => syaratAkad(jenis, pokok, tenor));
  const namaNasabah = siapa === "lama" ? lama?.nama : nama.trim();
  const nasabahLengkap = siapa === "lama" ? !!lama : !!nama.trim() && !!kampungTeks.trim();
  const fotoSah = fotoMasihBerlaku(foto);

  // Tahap 1: kamera dulu, tanpa formulir. Batal = kembali ke layar asal.
  if (!foto) {
    return (
      <KameraSerahTerima
        terbuka
        onTutup={() => router.back()}
        onSelesai={(id, uri) => setFoto({ id, uri, diambilAt: Date.now() })}
      />
    );
  }

  const simpan = () => {
    if (!syarat.hasil || !fotoMasihBerlaku(foto)) return;
    const nasabah =
      siapa === "lama" && lama
        ? { nasabahId: lama.id }
        : {
            nama: nama.trim(),
            kampung: kampungId ? { wilayahId: kampungId } : { nama: kampungTeks.trim() },
            ...(nik ? { nik } : {}),
            ...(nomorHp ? { nomorHp } : {}),
          };
    Alert.alert(
      "Simpan Akad?",
      `Serahkan ${rupiah(syarat.hasil.pencairan)} tunai ke ${namaNasabah}.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan",
          onPress: () =>
            akad.mutate(
              {
                akad: { nasabah, jenis, pokok, tenor, fotoSerahTerimaId: foto.id },
                titik: titikLatar.status === "siap" ? titikLatar.titik : null,
              },
              { onSuccess: () => router.back() },
            ),
        },
      ],
    );
  };

  return (
    <Gulir>
      <IsianFotoSerahTerima nilai={foto} onUbah={setFoto} />
      <StatusTitikRumah titik={titikLatar} lama={siapa === "lama"} />

      <Pilihan
        segmen
        pilihan={[
          { nilai: "baru", teks: "Orang Baru" },
          { nilai: "lama", teks: "Nasabah Lama" },
        ]}
        nilai={siapa}
        onPilih={setSiapa}
      />

      {siapa === "baru" ? (
        <>
          <Isian
            label="Nama Nasabah"
            value={nama}
            onChangeText={setNama}
            maxLength={50}
            autoCapitalize="words"
          />
          <PilihKampung
            teks={kampungTeks}
            terpilih={kampungId}
            onUbah={(teks, id) => {
              setKampungTeks(teks);
              setKampungId(id);
            }}
          />
          <Isian
            label="NIK (boleh kosong)"
            value={nik}
            onChangeText={(t) => setNik(t.replace(/\D/g, "").slice(0, 16))}
            keyboardType="number-pad"
            galat={nik && nik.length !== 16 ? "NIK 16 digit" : undefined}
          />
          <Isian
            label="Nomor HP (boleh kosong)"
            value={nomorHp}
            onChangeText={setNomorHp}
            keyboardType="phone-pad"
            maxLength={16}
          />
        </>
      ) : (
        <PilihNasabahLama terpilih={lama} onPilih={pilihLama} />
      )}

      {jenisTetap ? (
        <Stack.Screen options={{ title: `Akad ${LABEL_JENIS[jenisTetap]}` }} />
      ) : (
        <Pilihan
          segmen
          label="Jenis Pinjaman"
          pilihan={(["harian", "mingguan", "tempoan"] as const).map((j) => ({
            nilai: j,
            teks: LABEL_JENIS[j],
          }))}
          nilai={jenis}
          onPilih={pilihJenis}
        />
      )}
      {TENOR_PINJAMAN[jenis].length > 1 ? (
        <Pilihan
          label="Tenor"
          pilihan={TENOR_PINJAMAN[jenis].map((t) => ({ nilai: t, teks: namaTenor(jenis, t) }))}
          nilai={tenor}
          onPilih={setTenor}
        />
      ) : null}
      <IsianUang label="Pokok" nilai={pokok} onUbah={setPokok} />
      <Pilihan
        pilihan={POKOK_CEPAT.map((n) => ({ nilai: n, teks: rupiah(n) }))}
        nilai={pokok}
        onPilih={setPokok}
      />

      {syarat.hasil ? (
        <Kartu>
          <Baris label="Potongan Admin" nilai={rupiah(syarat.hasil.potonganAdmin)} />
          <Baris label="Masuk Tabungan" nilai={rupiah(syarat.hasil.tabunganMasuk)} />
          <Baris
            label="Tunai Ke Nasabah"
            nilai={rupiah(syarat.hasil.pencairan)}
            tebal
            warna={WARNA.utama}
          />
          <Baris label="Total Kembali" nilai={rupiah(syarat.hasil.totalKembali)} />
          <Baris
            label={jenis === "tempoan" ? "Dibayar Sekali" : "Angsuran"}
            nilai={rupiah(syarat.hasil.angsuran)}
          />
        </Kartu>
      ) : (
        <PesanGalat pesan={syarat.galat} />
      )}

      <PesanGalat pesan={akad.error?.message} />
      <Tombol
        judul="Simpan akad"
        ikon="circle-check"
        memuat={akad.isPending}
        nonaktif={!nasabahLengkap || !syarat.hasil || !fotoSah || (!!nik && nik.length !== 16)}
        onPress={simpan}
      />
    </Gulir>
  );
}
