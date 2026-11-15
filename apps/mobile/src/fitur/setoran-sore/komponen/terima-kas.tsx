import { rupiah } from "@opennael/format";
import { useState } from "react";
import { Alert } from "react-native";
import { IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Bagian } from "@/komponen/ui/kartu";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { type HariKolektor, tulisSetoran, useTulisSetoran } from "../data";

export function TerimaKas({ hari }: { hari: HariKolektor }) {
  const terima = useTulisSetoran(tulisSetoran.terimaKas);
  const [tunai, setTunai] = useState(0);

  const simpan = () =>
    Alert.alert(
      "Simpan Uang Diterima?",
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
    <Bagian judul="TERIMA KAS">
      <Keterangan>
        Catat transfer & biaya lebih dulu. Hitung uang fisiknya, lalu ketik jumlahnya — angka
        seharusnya baru tampil sesudah disimpan.
      </Keterangan>
      <IsianUang label="Uang Diterima" nilai={tunai} onUbah={setTunai} />
      <PesanGalat pesan={terima.error?.message} />
      <Tombol
        judul="Simpan uang diterima"
        ikon="banknote"
        memuat={terima.isPending}
        onPress={simpan}
      />
    </Bagian>
  );
}
