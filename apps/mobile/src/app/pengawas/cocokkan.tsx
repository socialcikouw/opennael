import { geserTanggal } from "@opennael/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";
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
  Pilihan,
  Spanduk,
  Tombol,
  useG,
} from "../../komponen/ui";
import { api, panggil } from "../../lib/api";
import { rupiah, tanggalPendek } from "../../lib/format";
import { hariIniKantor } from "../../lib/peran";
import { useSesi } from "../../lib/sesi";

const KUNCI = ["pencocokan"] as const;
const LABEL_AKUN = { tunai: "Tunai (brankas)", bank: "Bank (rekening)" } as const;
type Akun = keyof typeof LABEL_AKUN;

/**
 * COCOKKAN KAS (pengawas) — HITUNG BUTA: pengawas mengetik uang nyata di
 * brankas / saldo rekening; saldo buku & selisihnya baru dijawab sesudah
 * tersimpan. Riwayat: pencocokan miliknya 30 hari terakhir.
 */
export default function CocokkanKas() {
  const WARNA = useWarna();
  const g = useG();
  const s = useSesi();
  const klien = useQueryClient();
  const [akun, setAkun] = useState<Akun>("tunai");
  const [nyata, setNyata] = useState(0);
  const [keterangan, setKeterangan] = useState("");
  const hari = s ? hariIniKantor(s.pengguna.kantor.zonaWaktu) : null;

  const riwayat = useQuery({
    queryKey: [...KUNCI, hari],
    queryFn: async () =>
      (
        await panggil(() =>
          api.kas.pencocokan.$get({
            query: { mulai: geserTanggal(hari ?? "", -30), selesai: hari ?? "" },
          }),
        )
      ).json(),
    enabled: hari !== null,
  });
  const cocok = useMutation({
    mutationFn: async () =>
      (
        await panggil(() =>
          api.kas.pencocokan.$post({
            json: {
              akun,
              saldoNyata: nyata,
              ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
            },
          }),
        )
      ).json(),
    onSuccess: () => {
      setNyata(0);
      setKeterangan("");
      void klien.invalidateQueries({ queryKey: KUNCI });
    },
  });
  const hasil = cocok.data;

  const simpan = () =>
    Alert.alert(
      "Simpan hitungan?",
      `${LABEL_AKUN[akun]}: ${rupiah(nyata)}. Saldo buku tampil sesudah disimpan.`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Simpan", onPress: () => cocok.mutate() },
      ],
    );

  return (
    <Gulir>
      {hasil ? (
        <Spanduk
          warna={hasil.selisih === 0 ? "hijau" : "merah"}
          judul={
            hasil.selisih === 0
              ? `${LABEL_AKUN[hasil.akun]} cocok dengan buku`
              : `${LABEL_AKUN[hasil.akun]} ${hasil.selisih < 0 ? "kurang" : "lebih"} ${rupiah(Math.abs(hasil.selisih))}`
          }
          isi={`Buku ${rupiah(hasil.saldoBuku)} · dihitung ${rupiah(hasil.saldoNyata)}`}
        />
      ) : null}
      <Kartu>
        <Text style={g.subjudul}>Hitung kas</Text>
        <Keterangan>
          Hitung uang di brankas atau lihat saldo rekening lebih dulu, lalu ketik angkanya.
        </Keterangan>
        <Pilihan
          segmen
          pilihan={[
            { nilai: "tunai", teks: "Tunai" },
            { nilai: "bank", teks: "Bank" },
          ]}
          nilai={akun}
          onPilih={(a) => {
            setAkun(a);
            cocok.reset();
          }}
        />
        <IsianUang
          label={akun === "tunai" ? "Uang di brankas" : "Saldo rekening"}
          nilai={nyata}
          onUbah={setNyata}
        />
        <Isian
          label="Keterangan (boleh kosong)"
          value={keterangan}
          onChangeText={setKeterangan}
          maxLength={200}
        />
        <PesanGalat pesan={cocok.error?.message} />
        <Tombol
          judul="Simpan hitungan"
          ikon="circle-check"
          memuat={cocok.isPending}
          onPress={simpan}
        />
      </Kartu>

      <Text style={g.subjudul}>Riwayat 30 hari</Text>
      {riwayat.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={riwayat.error?.message} />
      {riwayat.data && riwayat.data.length === 0 ? (
        <Keterangan>Belum ada pencocokan.</Keterangan>
      ) : null}
      {[...(riwayat.data ?? [])].reverse().map((p) => (
        <Kartu key={p.id}>
          <View style={g.barisNilai}>
            <Text style={g.teksTebal}>
              {tanggalPendek(p.tanggal)} · {LABEL_AKUN[p.akun]}
            </Text>
            {p.dibatalkanAt ? (
              <Lencana teks="Dibatalkan bos" warna="abu" />
            ) : (
              <Lencana
                teks={p.selisih === 0 ? "Cocok" : p.selisih < 0 ? "Kurang" : "Lebih"}
                warna={p.selisih === 0 ? "hijau" : "merah"}
              />
            )}
          </View>
          <Baris label="Buku" nilai={rupiah(p.saldoBuku)} />
          <Baris label="Dihitung" nilai={rupiah(p.saldoNyata)} />
          <Baris
            label="Selisih"
            nilai={rupiah(p.selisih)}
            tebal
            warna={p.selisih < 0 ? WARNA.bahaya : WARNA.teks}
          />
          {p.keterangan ? <Text style={g.teksKecil}>{p.keterangan}</Text> : null}
        </Kartu>
      ))}
    </Gulir>
  );
}
