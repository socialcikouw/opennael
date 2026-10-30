import { LABEL_JENIS_TRANSAKSI, rupiah } from "@opennael/format";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol, TombolTeks } from "@/komponen/ui/tombol";
import { tulisSetoran, useSetoranKolektor, useTulisSetoran } from "../data";

export function Transfer({ kolektorId, terkunci }: { kolektorId: string; terkunci: boolean }) {
  const WARNA = useWarna();
  const g = useG();
  const setoran = useSetoranKolektor(kolektorId);
  const [pilih, setPilih] = useState<{ id: string; nominal: number } | null>(null);
  const catat = useTulisSetoran(tulisSetoran.transfer);
  const bisaTransfer = (setoran.data ?? []).filter((t) => t.batasTransfer > 0 || t.transfer);

  return (
    <Kartu>
      <Text style={g.subjudul}>Transfer setoran</Text>
      <Keterangan>Setoran yang dibayar nasabah lewat transfer, bukan tunai.</Keterangan>
      {setoran.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={setoran.error?.message} />
      {setoran.data && bisaTransfer.length === 0 ? (
        <Text style={g.teksRedup}>Belum ada setoran yang bisa ditransfer.</Text>
      ) : null}
      {bisaTransfer.map((t) => (
        <View key={t.id} style={g.tumpuk2}>
          <View style={g.barisNilai}>
            <View style={[g.isi, g.tumpuk05]}>
              <Text style={g.teksTebal}>{t.nasabah.nama}</Text>
              <Text style={g.teksKecil}>
                {LABEL_JENIS_TRANSAKSI[t.jenis]} · storting {rupiah(t.storting)}
              </Text>
            </View>
            {t.transfer ? (
              <Lencana teks={`Transfer ${rupiah(t.transfer.nominal)}`} warna="hijau" />
            ) : terkunci || pilih?.id === t.id ? null : (
              <TombolTeks
                judul="Catat transfer"
                onPress={() => {
                  catat.reset();
                  setPilih({ id: t.id, nominal: t.batasTransfer });
                }}
              />
            )}
          </View>
          {pilih?.id === t.id ? (
            <View style={g.tumpuk2}>
              <IsianUang
                label={`Nominal transfer (paling banyak ${rupiah(t.batasTransfer)})`}
                nilai={pilih.nominal}
                onUbah={(n) => setPilih({ id: t.id, nominal: n })}
                galat={pilih.nominal > t.batasTransfer ? "Melebihi batas transfer" : null}
              />
              <PesanGalat pesan={catat.error?.message} />
              <Tombol
                judul="Simpan transfer"
                ikon="arrow-left-right"
                memuat={catat.isPending}
                nonaktif={pilih.nominal <= 0 || pilih.nominal > t.batasTransfer}
                onPress={() =>
                  catat.mutate(
                    { transaksiId: t.id, nominal: pilih.nominal },
                    { onSuccess: () => setPilih(null) },
                  )
                }
              />
              <TombolTeks judul="Batal" onPress={() => setPilih(null)} />
            </View>
          ) : null}
        </View>
      ))}
    </Kartu>
  );
}
