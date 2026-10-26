import type { KartuTagih } from "@opennael/contracts";
import { hitungBayar, hitungLunas } from "@opennael/domain";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { FotoSerahTerima } from "../../../komponen/foto-nasabah";
import {
  Baris,
  Gulir,
  Isian,
  IsianUang,
  Kartu,
  Keterangan,
  Lencana,
  Memuat,
  PesanGalat,
  Pilihan,
  Spanduk,
  Tombol,
  useG,
} from "../../../komponen/ui";
import { cobaAturan, NAMA_JENIS, namaTenor, rupiah, tanggalPendek } from "../../../lib/format";
import { bacaGerbang, tulis, useHariIni, useTagihan, useTulis } from "../../../lib/lapangan";

type Aksi = "setor" | "lunas" | "libur" | "gulung";

/** KARTU PINJAMAN — rincian lalu satu catatan hari ini: setor, lunas, libur, atau gulung. */
export default function KartuPinjaman() {
  const g = useG();
  const { id } = useLocalSearchParams<{ id: string }>();
  const tagihan = useTagihan();
  const hariIni = useHariIni();
  const p = tagihan.data?.find((x) => x.id === id);
  const tempoan = p?.jenis === "tempoan";
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const aksiAktif = aksi ?? (tempoan ? "lunas" : "setor");

  if (tagihan.isPending || hariIni.isPending) return <Memuat />;
  if (!p) {
    return (
      <Gulir>
        <Keterangan>Pinjaman ini sudah tidak ada di daftar tagih (lunas atau digulung).</Keterangan>
        <Tombol judul="Kembali" ikon="arrow-left" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const gerbang = hariIni.data
    ? bacaGerbang(hariIni.data)
    : { buka: false, judul: undefined, isi: undefined };
  const bisaCatat = gerbang.buka && !p.hariIni;
  const pilihanAksi: { nilai: Aksi; teks: string }[] = tempoan
    ? [
        { nilai: "lunas", teks: "Lunas" },
        { nilai: "gulung", teks: "Gulung" },
      ]
    : [
        { nilai: "setor", teks: "Setor" },
        { nilai: "lunas", teks: "Lunas" },
        { nilai: "libur", teks: "Libur" },
        { nilai: "gulung", teks: "Gulung" },
      ];

  return (
    <Gulir>
      <Stack.Screen options={{ title: p.nasabah.nama }} />
      {p.fotoSerahTerimaId ? (
        <FotoSerahTerima fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} />
      ) : null}
      <Kartu>
        <View style={g.bungkus}>
          <Text style={g.subjudul}>
            {NAMA_JENIS[p.jenis]} {namaTenor(p.jenis, p.tenor)} · ke-{p.pinjamanKe}
          </Text>
          {p.status === "macet" ? <Lencana teks="Macet" warna="merah" /> : null}
        </View>
        <Text style={g.teksKecil}>
          {p.nasabah.kampung} · akad {tanggalPendek(p.tanggalAkad)}
          {p.jatuhTempo ? ` · jatuh tempo ${tanggalPendek(p.jatuhTempo)}` : ""}
        </Text>
        <Baris label="Pokok" nilai={rupiah(p.pokok)} />
        <Baris label="Total kembali" nilai={rupiah(p.totalKembali)} />
        {tempoan ? null : (
          <Baris
            label="Angsuran"
            nilai={`${rupiah(p.angsuran)} · ke-${p.angsuranKe} dari ${p.tenor}`}
          />
        )}
        <Baris label="Saldo" nilai={rupiah(p.saldo)} tebal />
        <Baris label="Tabungan nasabah" nilai={rupiah(p.tabungan)} />
      </Kartu>

      {p.hariIni?.jenis === "angsuran" ? (
        <Spanduk warna="hijau" judul={`Sudah setor hari ini: ${rupiah(p.hariIni.storting)}`} />
      ) : p.hariIni?.jenis === "libur" ? (
        <Spanduk judul="Libur hari ini" isi={p.hariIni.alasan ?? undefined} />
      ) : gerbang.judul ? (
        <Spanduk judul={gerbang.judul} isi={gerbang.isi} />
      ) : null}

      {bisaCatat ? (
        <>
          <Pilihan segmen pilihan={pilihanAksi} nilai={aksiAktif} onPilih={setAksi} />
          {aksiAktif === "setor" ? <PanelSetor p={p} /> : null}
          {aksiAktif === "lunas" ? <PanelLunas p={p} /> : null}
          {aksiAktif === "libur" ? <PanelLibur p={p} /> : null}
          {aksiAktif === "gulung" ? (
            <Tombol
              judul="Lanjut ke gulung"
              ikon="repeat"
              onPress={() =>
                router.push({ pathname: "/kolektor/gulung/[id]", params: { id: p.id } })
              }
            />
          ) : null}
        </>
      ) : null}
    </Gulir>
  );
}

function PanelSetor({ p }: { p: KartuTagih }) {
  const [murni, setMurni] = useState(p.angsuran);
  const [pelunasan, setPelunasan] = useState(0);
  const [tambahPelunasan, setTambahPelunasan] = useState(false);
  const bayar = useTulis(tulis.bayar);
  const pratinjau = cobaAturan(() => hitungBayar(p, murni, tambahPelunasan ? pelunasan : 0));
  const kali = [1, 2, 3].filter((n) => n * p.angsuran < p.saldo);

  return (
    <Kartu>
      <IsianUang label="Setoran" nilai={murni} onUbah={setMurni} />
      {kali.length > 1 ? (
        <Pilihan
          pilihan={kali.map((n) => ({
            nilai: n * p.angsuran,
            teks: `${n}× ${rupiah(n * p.angsuran)}`,
          }))}
          nilai={murni}
          onPilih={setMurni}
        />
      ) : null}
      {tambahPelunasan ? (
        <IsianUang label="Pelunasan sebagian" nilai={pelunasan} onUbah={setPelunasan} />
      ) : (
        <Tombol
          judul="Pelunasan sebagian"
          jenis="kedua"
          ikon="plus"
          onPress={() => setTambahPelunasan(true)}
        />
      )}
      {pratinjau.hasil ? (
        <Baris label="Sisa saldo sesudah setor" nilai={rupiah(pratinjau.hasil.sisaSaldo)} tebal />
      ) : (
        <PesanGalat pesan={pratinjau.galat} />
      )}
      <PesanGalat pesan={bayar.error?.message} />
      <Tombol
        judul={`Simpan setoran ${rupiah(murni + (tambahPelunasan ? pelunasan : 0))}`}
        ikon="circle-check"
        memuat={bayar.isPending}
        nonaktif={!pratinjau.hasil}
        onPress={() =>
          bayar.mutate(
            {
              pinjamanId: p.id,
              setoranMurni: murni,
              setoranPelunasan: tambahPelunasan ? pelunasan : 0,
            },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Kartu>
  );
}

function PanelLunas({ p }: { p: KartuTagih }) {
  const lunas = useTulis(tulis.lunas);
  const r = hitungLunas(p.saldo, p.tabungan);
  const kembalian = -r.storting;

  const konfirmasi = () =>
    Alert.alert(
      "Lunaskan pinjaman?",
      kembalian > 0
        ? `Kembalikan ${rupiah(kembalian)} tunai ke ${p.nasabah.nama}.`
        : `Terima ${rupiah(r.setoranMurni)} dari ${p.nasabah.nama}.`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Lunaskan", onPress: () => lunas.mutate(p.id, { onSuccess: () => router.back() }) },
      ],
    );

  return (
    <Kartu>
      <Baris label="Saldo" nilai={rupiah(p.saldo)} />
      <Baris label="Ditutup tabungan" nilai={rupiah(r.setoranPelunasan)} />
      <Baris label="Dibayar nasabah" nilai={rupiah(r.setoranMurni)} tebal />
      {kembalian > 0 ? (
        <Spanduk
          warna="merah"
          judul={`Kembalikan ${rupiah(kembalian)} tunai ke nasabah`}
          isi="Tabungan melebihi saldo. Setoran sore Anda berkurang sebesar ini."
        />
      ) : null}
      <PesanGalat pesan={lunas.error?.message} />
      <Tombol judul="Lunaskan" ikon="badge-check" memuat={lunas.isPending} onPress={konfirmasi} />
    </Kartu>
  );
}

function PanelLibur({ p }: { p: KartuTagih }) {
  const [alasan, setAlasan] = useState("");
  const libur = useTulis(tulis.libur);
  // G3: angsuran terbayar baru 0 atau 1 belum boleh libur (server juga menolak).
  const belumBoleh = p.angsuranKe < 2;

  return (
    <Kartu>
      {belumBoleh ? (
        <Keterangan>Belum boleh libur: angsuran terbayar baru {p.angsuranKe}.</Keterangan>
      ) : (
        <Isian
          label="Alasan (boleh kosong)"
          value={alasan}
          onChangeText={setAlasan}
          placeholder="Sakit, tidak di rumah, …"
          maxLength={100}
        />
      )}
      <PesanGalat pesan={libur.error?.message} />
      <Tombol
        judul="Catat libur hari ini"
        ikon="moon"
        memuat={libur.isPending}
        nonaktif={belumBoleh}
        onPress={() =>
          libur.mutate(
            { pinjamanId: p.id, ...(alasan.trim() ? { alasan: alasan.trim() } : {}) },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Kartu>
  );
}
