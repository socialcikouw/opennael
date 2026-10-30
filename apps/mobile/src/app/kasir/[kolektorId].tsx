import { LABEL_JENIS_TRANSAKSI, rupiah } from "@opennael/format";
import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
import { RincianKas } from "../../komponen/rincian-kas";
import { useWarna } from "../../komponen/tampilan";
import {
  Baris,
  Gulir,
  Isian,
  IsianUang,
  Kartu,
  Keterangan,
  Lencana,
  PesanGalat,
  Spanduk,
  Tombol,
  TombolTeks,
  useG,
} from "../../komponen/ui";
import {
  type HariKolektor,
  tulisSetoran,
  useBiayaKolektor,
  useHariKolektor,
  useSetoranKolektor,
  useTulisSetoran,
} from "../../lib/setoran";

/**
 * SATU KOLEKTOR (kasir) — urutan kerja sore: catat transfer & biaya tak
 * terduga, lalu terima kas dengan HITUNG BUTA (angka seharusnya baru tampil
 * sesudah disimpan). Kasir hanya mencatat; pembatalan oleh bos di web.
 */
export default function KasKolektor() {
  const WARNA = useWarna();
  const g = useG();
  const { kolektorId } = useLocalSearchParams<{ kolektorId: string }>();
  const hari = useHariKolektor();
  const h = hari.data?.find((x) => x.kolektor.id === kolektorId);

  if (hari.isPending) return <ActivityIndicator style={g.memuat} color={WARNA.utama} />;
  if (!h) {
    return (
      <Gulir>
        <PesanGalat pesan={hari.error?.message ?? "Kolektor ini belum absen hari ini."} />
      </Gulir>
    );
  }
  const terkunci = Boolean(h.serahTerima);

  return (
    <Gulir>
      <Stack.Screen options={{ title: h.kolektor.nama }} />
      {terkunci ? (
        <>
          <Spanduk
            warna="hijau"
            judul="Kas sudah diterima"
            isi="Hari kolektor ini terkunci. Salah catat dibetulkan bos dari web."
          />
          <RincianKas hari={h} />
        </>
      ) : h.laporanDibukaAt ? null : (
        <Spanduk
          judul="Kolektor belum membuka laporan"
          isi="Transfer & biaya boleh dicatat sekarang; kas diterima sesudah ia membuka laporan."
        />
      )}
      <Transfer kolektorId={h.kolektor.id} terkunci={terkunci} />
      <Biaya hari={h} terkunci={terkunci} />
      {h.laporanDibukaAt && !terkunci ? <TerimaKas hari={h} /> : null}
    </Gulir>
  );
}

function Transfer({ kolektorId, terkunci }: { kolektorId: string; terkunci: boolean }) {
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

function Biaya({ hari, terkunci }: { hari: HariKolektor; terkunci: boolean }) {
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

function TerimaKas({ hari }: { hari: HariKolektor }) {
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
