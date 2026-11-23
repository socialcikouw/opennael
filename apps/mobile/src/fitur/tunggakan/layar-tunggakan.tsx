import { LABEL_JENIS, namaTenor, rupiah, tampilKampung, tampilNama } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { g } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Kerangka } from "@/komponen/ui/kerangka";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { Lencana } from "@/komponen/ui/lencana";
import { Pilihan } from "@/komponen/ui/pilihan";
import { kueri } from "@/lib/api";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { WARNA } from "@/tema";

/**
 * PINJAMAN MENUNGGAK (pengawas) — kartu pinjaman aktif yang tertinggal
 * angsuran menurut aturan-usaha B5 (jadwal tagih s/d kemarin dibanding
 * angsuran terbayar), urut tunggakan terbesar.
 */
export function LayarTunggakan() {
  const [kolektorId, setKolektorId] = useState<string>("semua");
  const q = useQuery(kueri.pinjaman.aktif());
  const { refetch } = q;
  const segarkan = useCallback(() => refetch(), [refetch]);
  const { aktif: menarik, tarik } = useTarikSegarkan(segarkan);

  if (q.isPending) return <Kerangka jenis="daftar" teks="Memuat pinjaman menunggak…" />;

  const menunggak = (q.data ?? [])
    .filter((p) => (p.tagih?.tertinggal ?? 0) > 0)
    .sort((a, b) => (b.tagih?.tunggakan ?? 0) - (a.tagih?.tunggakan ?? 0));
  const kolektor = [...new Map(menunggak.map((p) => [p.kolektor.id, p.kolektor])).values()].sort(
    (a, b) => a.nama.localeCompare(b.nama),
  );
  const tampil = menunggak.filter((p) => kolektorId === "semua" || p.kolektor.id === kolektorId);
  const total = tampil.reduce((s, p) => s + (p.tagih?.tunggakan ?? 0), 0);

  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      refreshControl={<RefreshControl refreshing={menarik} onRefresh={tarik} />}
    >
      <PesanGalat pesan={q.error?.message} />
      {q.data ? (
        <>
          <View style={g.baris3}>
            <KotakAngka label="Menunggak" ikon="users" nilai={String(tampil.length)} />
            <KotakAngka label="Total Tunggakan" ikon="banknote" nilai={rupiah(total)} />
          </View>
          {kolektor.length > 1 ? (
            <Pilihan
              pilihan={[
                { nilai: "semua", teks: "Semua" },
                ...kolektor.map((k) => ({ nilai: k.id, teks: tampilNama(k.nama) })),
              ]}
              nilai={kolektorId}
              onPilih={setKolektorId}
            />
          ) : null}
          {tampil.length === 0 ? (
            <KotakKosong
              ikon="circle-check"
              judul="Tidak ada tunggakan"
              isi="Tidak ada pinjaman aktif yang tertinggal angsuran."
            />
          ) : null}
          {tampil.map((p) => (
            <View key={p.id} style={[g.butirDaftar, g.tumpuk1]}>
              <View style={g.barisNilai}>
                <Text style={[g.teksTebal, g.isi]}>{tampilNama(p.nasabah.nama)}</Text>
                <Text style={[g.teksTebal, { color: WARNA.bahayaTeks }]}>
                  {rupiah(p.tagih?.tunggakan ?? 0)}
                </Text>
              </View>
              <Text style={g.teksKecil}>
                {tampilKampung(p.nasabah.kampung)} · {tampilNama(p.kolektor.nama)} ·{" "}
                {LABEL_JENIS[p.jenis]} {namaTenor(p.jenis, p.tenor)} ke-{p.pinjamanKe}
              </Text>
              <View style={g.bungkus}>
                <Lencana
                  teks={
                    p.jenis === "tempoan"
                      ? "Lewat Jatuh Tempo"
                      : `Tertinggal ${p.tagih?.tertinggal ?? 0}× Angsuran`
                  }
                  warna="kuning"
                />
                {p.status === "macet" ? <Lencana teks="Macet" warna="merah" /> : null}
                <Text style={g.teksMini}>sisa saldo {rupiah(p.saldo)}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
