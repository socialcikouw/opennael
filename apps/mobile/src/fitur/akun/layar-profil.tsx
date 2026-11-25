import { kunciWilayah } from "@opennael/domain";
import { LABEL_PERAN, tampilKampung, tampilNama } from "@opennael/format";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTagihan } from "@/fitur/lapangan";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { useSesi } from "@/lib/sesi";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { BarisAkun, DaftarAkun } from "./komponen/baris-akun";

/**
 * PROFIL (tab pertama Mode Akun) — kolektor yang tertaut di HP ini: inisial, nama, peran ·
 * kantor, nomor HP, wilayah tagih (kampung nasabah pegangan, urut rute), dan banyaknya
 * nasabah & pinjaman aktif pegangannya. Hanya-baca; mengubah data akun lewat bos (web).
 */
export function LayarProfil() {
  const s = useSesi();
  const ruangTab = useRuangTab();
  const tagihan = useTagihan();
  const p = s?.pengguna;

  const pegangan = useMemo(() => {
    const daftar = tagihan.data;
    if (!daftar) return null;
    const kampung = new Map<string, { nama: string; rute: number }>();
    for (const k of daftar) {
      const kunci = kunciWilayah(k.nasabah.kampung);
      const rute = k.ruteKe ?? Number.POSITIVE_INFINITY;
      const ada = kampung.get(kunci);
      if (!ada || rute < ada.rute) kampung.set(kunci, { nama: k.nasabah.kampung, rute });
    }
    return {
      nasabah: new Set(daftar.map((k) => k.nasabah.id)).size,
      pinjaman: daftar.length,
      wilayah: [...kampung.values()]
        .sort((a, b) => a.rute - b.rute || a.nama.localeCompare(b.nama))
        .map((k) => tampilKampung(k.nama)),
    };
  }, [tagihan.data]);

  if (!p) return null;
  const memuat = tagihan.isPending ? "Memuat…" : "Gagal memuat";
  return (
    <ScrollView style={g.layar} contentContainerStyle={[gaya.isi, { paddingBottom: ruangTab }]}>
      <View style={gaya.kepala}>
        <View style={gaya.avatar}>
          <Text style={gaya.avatarHuruf}>{p.nama.trim().charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={gaya.nama}>{tampilNama(p.nama)}</Text>
        <Text style={gaya.peran}>
          {LABEL_PERAN[p.peran]} · {p.kantor.nama}
        </Text>
      </View>

      <DaftarAkun>
        <BarisAkun ikon="phone" judul="Nomor HP" ket={p.nomorHp ?? "Belum tercatat"} />
        <BarisAkun
          garis
          ikon="map-pin"
          judul="Wilayah Tagih"
          ket={pegangan ? pegangan.wilayah.join(" · ") || "Belum ada nasabah" : memuat}
        />
        <BarisAkun
          garis
          ikon="users-round"
          judul="Nasabah Pegangan"
          ket={
            pegangan ? `${pegangan.nasabah} nasabah · ${pegangan.pinjaman} pinjaman aktif` : memuat
          }
        />
      </DaftarAkun>
    </ScrollView>
  );
}

const gaya = StyleSheet.create({
  isi: { gap: RUANG[5], paddingHorizontal: RUANG[5], paddingTop: RUANG[2] },
  kepala: { alignItems: "center", gap: RUANG[1], paddingVertical: RUANG[3] },
  avatar: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.utamaIsi,
    marginBottom: RUANG[2],
  },
  avatarHuruf: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, color: WARNA.teksAtasUtama },
  nama: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, color: WARNA.teks },
  peran: { ...HURUF.sm, color: WARNA.redup },
});
