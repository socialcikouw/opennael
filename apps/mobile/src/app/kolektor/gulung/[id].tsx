import { angsuranKe, hitungGulung, KELIPATAN_POKOK, TENOR_PINJAMAN } from "@opennael/domain";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  IsianFotoSerahTerima,
} from "../../../komponen/kamera-serah-terima";
import {
  Baris,
  Gulir,
  g,
  IsianUang,
  Kartu,
  Keterangan,
  PesanGalat,
  Pilihan,
  Spanduk,
  Tombol,
  WARNA,
} from "../../../komponen/ui";
import { cobaAturan, NAMA_JENIS, namaTenor, rupiah } from "../../../lib/format";
import { tulis, useTagihan, useTulis } from "../../../lib/lapangan";

const NAMA_GULUNG = { naik: "Naik", tetap: "Tetap", turun: "Turun" } as const;

/**
 * GULUNG (E) — pinjaman lama dilunasi pinjaman baru berjenis sama. Pratinjau
 * memakai rumus yang sama dengan server; rem bos hanya diketahui server.
 */
export default function Gulung() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useTagihan().data?.find((x) => x.id === id);
  const [pokok, setPokok] = useState(p?.pokok ?? 0);
  const [tenor, setTenor] = useState<number | null>(
    p ? (TENOR_PINJAMAN[p.jenis][0] ?? null) : null,
  );
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const gulung = useTulis(tulis.gulung);

  if (!p) {
    return (
      <Gulir>
        <Keterangan>Pinjaman ini sudah tidak ada di daftar tagih.</Keterangan>
        <Tombol judul="Kembali" ikon="arrow-back" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const rencana = cobaAturan(() =>
    hitungGulung({ ...p, angsuranKe: angsuranKe(p) }, pokok, tenor ?? 0, {
      gulungDikunci: false,
      naikDikunci: false,
    }),
  );
  const fotoSah = fotoMasihBerlaku(foto);

  const simpan = () => {
    if (!rencana.hasil || !tenor || !fotoMasihBerlaku(foto)) return;
    const bersih = rencana.hasil.pencairan;
    Alert.alert("Simpan gulung?", `Serahkan ${rupiah(bersih)} tunai ke ${p.nasabah.nama}.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Simpan",
        onPress: () =>
          gulung.mutate(
            { pinjamanId: p.id, pokok, tenor, fotoSerahTerimaId: foto.id },
            { onSuccess: () => router.dismissTo("/kolektor") },
          ),
      },
    ]);
  };

  return (
    <Gulir>
      <Stack.Screen options={{ title: `Gulung · ${p.nasabah.nama}` }} />
      <Kartu>
        <Text style={g.teksTebal}>
          Pinjaman lama: {NAMA_JENIS[p.jenis]} ke-{p.pinjamanKe}
        </Text>
        <Baris label="Pokok lama" nilai={rupiah(p.pokok)} />
        <Baris label="Saldo lama" nilai={rupiah(p.saldo)} />
      </Kartu>

      <IsianUang label="Pokok baru" nilai={pokok} onUbah={setPokok} />
      <View style={g.baris2}>
        <View style={g.isi}>
          <Tombol
            judul={`− ${rupiah(KELIPATAN_POKOK)}`}
            jenis="kedua"
            nonaktif={pokok <= KELIPATAN_POKOK}
            onPress={() => setPokok(Math.max(KELIPATAN_POKOK, pokok - KELIPATAN_POKOK))}
          />
        </View>
        <View style={g.isi}>
          <Tombol
            judul={`+ ${rupiah(KELIPATAN_POKOK)}`}
            jenis="kedua"
            onPress={() => setPokok(pokok + KELIPATAN_POKOK)}
          />
        </View>
      </View>
      {TENOR_PINJAMAN[p.jenis].length > 1 ? (
        <Pilihan
          label="Tenor"
          pilihan={TENOR_PINJAMAN[p.jenis].map((t) => ({ nilai: t, teks: namaTenor(p.jenis, t) }))}
          nilai={tenor}
          onPilih={setTenor}
        />
      ) : null}

      {rencana.hasil ? (
        <Kartu>
          <Baris label="Jenis gulung" nilai={NAMA_GULUNG[rencana.hasil.jenisGulung]} />
          <Baris label="Pencairan akad baru" nilai={rupiah(rencana.hasil.syarat.pencairan)} />
          <Baris label="Dikurangi saldo lama" nilai={`− ${rupiah(rencana.hasil.saldoLama)}`} />
          <Baris
            label="Tunai ke nasabah"
            nilai={rupiah(rencana.hasil.pencairan)}
            tebal
            warna={WARNA.utama}
          />
          <Baris label="Angsuran baru" nilai={rupiah(rencana.hasil.syarat.angsuran)} />
        </Kartu>
      ) : (
        <Spanduk warna="merah" judul="Belum bisa digulung" isi={rencana.galat} />
      )}

      <IsianFotoSerahTerima nilai={foto} onUbah={setFoto} />
      <PesanGalat pesan={gulung.error?.message} />
      <Tombol
        judul="Simpan gulung"
        ikon="checkmark-circle-outline"
        memuat={gulung.isPending}
        nonaktif={!rencana.hasil || !fotoSah}
        onPress={simpan}
      />
    </Gulir>
  );
}
