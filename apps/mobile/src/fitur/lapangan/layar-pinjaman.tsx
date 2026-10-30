import { LABEL_JENIS, namaTenor, rupiah, tanggalPendek } from "@opennael/format";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Gulir, Memuat } from "@/komponen/ui/layar";
import { Lencana } from "@/komponen/ui/lencana";
import { Pilihan } from "@/komponen/ui/pilihan";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { useHariIni, useTagihan } from "./data";
import { bacaGerbang } from "./gerbang";
import { FotoSerahTerima } from "./komponen/foto-nasabah";
import { PanelLibur } from "./komponen/panel-libur";
import { PanelLunas } from "./komponen/panel-lunas";
import { PanelSetor } from "./komponen/panel-setor";

type Aksi = "setor" | "lunas" | "libur" | "gulung";

/** KARTU PINJAMAN — rincian lalu satu catatan hari ini: setor, lunas, libur, atau gulung. */
export function LayarPinjaman({ id, lihat }: { id: string; lihat?: string }) {
  const g = useG();
  // lihat=1: dibuka dari mode Semua — rincian saja, tanpa transaksi.
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
  const bisaCatat = lihat !== "1" && gerbang.buka && !p.hariIni;
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
            {LABEL_JENIS[p.jenis]} {namaTenor(p.jenis, p.tenor)} · ke-{p.pinjamanKe}
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
      ) : lihat !== "1" && gerbang.judul ? (
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
