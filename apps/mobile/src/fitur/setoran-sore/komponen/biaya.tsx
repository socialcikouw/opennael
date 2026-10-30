import { rupiah } from "@opennael/format";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Isian, IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { type HariKolektor, tulisSetoran, useBiayaKolektor, useTulisSetoran } from "../data";

export function Biaya({ hari, terkunci }: { hari: HariKolektor; terkunci: boolean }) {
  const WARNA = useWarna();
  const g = useG();
  const biaya = useBiayaKolektor(hari.kolektor.id, hari.tanggal);
  const catat = useTulisSetoran(tulisSetoran.biaya);
  const [nominal, setNominal] = useState(0);
  const [keterangan, setKeterangan] = useState("");

  return (
    <Kartu>
      <Text style={g.subjudul}>Biaya tak terduga</Text>
      <Keterangan>Uang kolektor yang terpakai di lapangan hari ini (mis. ban bocor).</Keterangan>
      {biaya.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={biaya.error?.message} />
      {biaya.data?.biaya.map((b) => (
        <Baris key={b.id} label={b.keterangan} nilai={rupiah(b.nominal)} />
      ))}
      {biaya.data && biaya.data.biaya.length > 0 ? (
        <Baris label="Total" nilai={rupiah(biaya.data.total)} tebal />
      ) : null}
      {terkunci ? null : (
        <View style={g.tumpuk2}>
          <IsianUang label="Nominal" nilai={nominal} onUbah={setNominal} />
          <Isian
            label="Keterangan"
            value={keterangan}
            onChangeText={setKeterangan}
            placeholder="Service motor, ban bocor, …"
            maxLength={100}
          />
          <PesanGalat pesan={catat.error?.message} />
          <Tombol
            judul="Catat biaya"
            jenis="kedua"
            ikon="plus"
            memuat={catat.isPending}
            nonaktif={nominal <= 0 || !keterangan.trim()}
            onPress={() =>
              catat.mutate(
                { kolektorId: hari.kolektor.id, nominal, keterangan: keterangan.trim() },
                {
                  onSuccess: () => {
                    setNominal(0);
                    setKeterangan("");
                  },
                },
              )
            }
          />
        </View>
      )}
    </Kartu>
  );
}
