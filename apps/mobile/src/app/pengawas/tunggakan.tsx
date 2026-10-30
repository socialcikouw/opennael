import { LABEL_JENIS, namaTenor, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, Text, View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { PesanGalat } from "@/komponen/ui/isian";
import { KotakAngka } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { Pilihan } from "@/komponen/ui/pilihan";
import { useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { api, panggil } from "@/lib/api";

/**
 * PINJAMAN MENUNGGAK (pengawas) — kartu pinjaman aktif yang tertinggal
 * angsuran menurut aturan-usaha B5 (jadwal tagih s/d kemarin dibanding
 * angsuran terbayar), urut tunggakan terbesar.
 */
export default function Tunggakan() {
  const WARNA = useWarna();
  const g = useG();
  const [kolektorId, setKolektorId] = useState<string>("semua");
  const q = useQuery({
    queryKey: ["pinjaman", "aktif"],
    queryFn: async () =>
      (await panggil(() => api.pembiayaan.pinjaman.$get({ query: { status: "aktif" } }))).json(),
  });
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
      refreshControl={
        <RefreshControl refreshing={q.isRefetching} onRefresh={() => void q.refetch()} />
      }
    >
      {q.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={q.error?.message} />
      {q.data ? (
        <>
          <View style={g.baris3}>
            <KotakAngka label="Menunggak" ikon="users" nilai={String(tampil.length)} />
            <KotakAngka label="Total tunggakan" ikon="banknote" nilai={rupiah(total)} />
          </View>
          {kolektor.length > 1 ? (
            <Pilihan
              pilihan={[
                { nilai: "semua", teks: "Semua" },
                ...kolektor.map((k) => ({ nilai: k.id, teks: k.nama })),
              ]}
              nilai={kolektorId}
              onPilih={setKolektorId}
            />
          ) : null}
          {tampil.length === 0 ? <Keterangan>Tidak ada pinjaman yang menunggak.</Keterangan> : null}
          {tampil.map((p) => (
            <View key={p.id} style={[g.butirDaftar, g.tumpuk1]}>
              <View style={g.barisNilai}>
                <Text style={[g.teksTebal, g.isi]}>{p.nasabah.nama}</Text>
                <Text style={[g.teksTebal, { color: WARNA.bahaya }]}>
                  {rupiah(p.tagih?.tunggakan ?? 0)}
                </Text>
              </View>
              <Text style={g.teksKecil}>
                {p.nasabah.kampung} · {p.kolektor.nama} · {LABEL_JENIS[p.jenis]}{" "}
                {namaTenor(p.jenis, p.tenor)} ke-{p.pinjamanKe}
              </Text>
              <View style={g.bungkus}>
                <Lencana
                  teks={
                    p.jenis === "tempoan"
                      ? "Lewat jatuh tempo"
                      : `Tertinggal ${p.tagih?.tertinggal ?? 0}× angsuran`
                  }
                  warna="kuning"
                />
                {p.status === "macet" ? <Lencana teks="Macet" warna="merah" /> : null}
                <Text style={g.teksMini}>saldo {rupiah(p.saldo)}</Text>
              </View>
            </View>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
