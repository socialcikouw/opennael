import { rupiah } from "@opennael/format";
import { useState } from "react";
import { Alert, Text } from "react-native";
import { type HariKolektor, tulisSetoran, useTulisSetoran } from "@/fitur/setoran-sore/data";
import { useG } from "@/komponen/ui/gaya-bersama";
import { IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";

export function TerimaKas({ hari }: { hari: HariKolektor }) {
  const g = useG();
  const terima = useTulisSetoran(tulisSetoran.terimaKas);
  const [tunai, setTunai] = useState(0);

  const simpan = () =>
    Alert.alert(
      "Simpan uang diterima?",
      `${rupiah(tunai)} dari ${hari.kolektor.nama}. Sesudah disimpan, hari kolektor ini terkunci dan angkanya tidak bisa diubah kasir.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan",
          onPress: () => terima.mutate({ kolektorId: hari.kolektor.id, tunaiDiterima: tunai }),
        },
      ],
    );

  return (
    <Kartu>
      <Text style={g.subjudul}>Terima kas</Text>
      <Keterangan>
        Catat transfer & biaya lebih dulu. Hitung uang fisiknya, lalu ketik jumlahnya — angka
        seharusnya baru tampil sesudah disimpan.
      </Keterangan>
      <IsianUang label="Uang diterima" nilai={tunai} onUbah={setTunai} />
      <PesanGalat pesan={terima.error?.message} />
      <Tombol
        judul="Simpan uang diterima"
        ikon="banknote"
        memuat={terima.isPending}
        onPress={simpan}
      />
    </Kartu>
  );
}
