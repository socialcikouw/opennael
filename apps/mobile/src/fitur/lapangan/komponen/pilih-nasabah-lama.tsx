import type { NasabahLama } from "@opennael/contracts";
import { kunciWilayah } from "@opennael/domain";
import { LABEL_JENIS, rupiah } from "@opennael/format";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Isian, PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { TombolTeks } from "@/komponen/ui/tombol";
import { useNasabahLama } from "../data";

export function PilihNasabahLama(props: {
  terpilih: NasabahLama | null;
  onPilih: (n: NasabahLama | null) => void;
}) {
  const WARNA = useWarna();
  const g = useG();
  const daftar = useNasabahLama();
  const [cari, setCari] = useState("");
  const cocok = useMemo(() => {
    const kunci = kunciWilayah(cari);
    return (daftar.data ?? [])
      .filter((n) => !kunci || kunciWilayah(`${n.nama} ${n.kampung}`).includes(kunci))
      .slice(0, 30);
  }, [daftar.data, cari]);

  if (props.terpilih) {
    const n = props.terpilih;
    return (
      <Kartu>
        <Text style={g.teksTebal}>{n.nama}</Text>
        <Text style={g.teksKecil}>{n.kampung}</Text>
        {n.terakhir ? (
          <Baris
            label={`Terakhir: ${LABEL_JENIS[n.terakhir.jenis]} ke-${n.terakhir.pinjamanKe}`}
            nilai={rupiah(n.terakhir.pokok)}
          />
        ) : null}
        <Baris label="Tabungan" nilai={rupiah(n.tabungan)} />
        <TombolTeks judul="Ganti nasabah" onPress={() => props.onPilih(null)} />
      </Kartu>
    );
  }

  return (
    <View style={g.tumpuk2}>
      <Isian
        label="Cari nasabah lama"
        ikon="search"
        value={cari}
        onChangeText={setCari}
        placeholder="Nama / kampung"
        clearButtonMode="while-editing"
      />
      {daftar.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={daftar.error?.message} />
      {daftar.data && cocok.length === 0 ? (
        <Keterangan>Tidak ada nasabah lama tanpa pinjaman aktif.</Keterangan>
      ) : null}
      {cocok.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => props.onPilih(n)}
          style={({ pressed }) => [g.butirDaftar, pressed ? g.butirDitekan : null]}
        >
          <Text style={g.teksTebal}>{n.nama}</Text>
          <Text style={g.teksKecil}>
            {n.kampung}
            {n.terakhir
              ? ` · terakhir ${LABEL_JENIS[n.terakhir.jenis]} ${rupiah(n.terakhir.pokok)}`
              : ""}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
