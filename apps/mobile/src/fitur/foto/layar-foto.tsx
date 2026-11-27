import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTagihan } from "@/fitur/lapangan";
import { KepalaJudulBesar } from "@/komponen/statistik/kepala-judul-besar";
import { useRuangTab } from "@/komponen/tab-mengambang";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Kerangka } from "@/komponen/ui/kerangka";
import { KotakKosong } from "@/komponen/ui/kotak-kosong";
import { useTarikSegarkan } from "@/lib/tarik-segarkan";
import { AKSEN, HURUF, RUANG, SUDUT, WARNA } from "@/tema";
import { type FotoNasabah, kelompokFoto } from "./inti/kelompok-foto";
import { FotoLayarPenuh } from "./komponen/foto-layar-penuh";
import { JudulKampung } from "./komponen/judul-kampung";
import { KartuFoto } from "./komponen/kartu-foto";

type BarisFoto =
  | { jenis: "judul"; kunci: string; kampung: string; jumlah: number }
  | {
      jenis: "kartu";
      kunci: string;
      foto: FotoNasabah;
      kelompok: readonly FotoNasabah[];
      indeks: number;
      akhir: boolean;
    };

/**
 * FOTO (tab pertama Mode Rekap, 28 Nov 2026 — menggantikan tab Ringkasan yang pindah ke
 * Menu) — foto serah terima nasabah pegangan berupa KARTU seperti tab Harian:
 *
 *   [2] PULE
 *    ├─ ┌──────────────────┐
 *    |  │(9)         MACET │   ← lencana terakota kecil di atas foto
 *    |  │       foto       │
 *    |  │Budi              │
 *    |  │Angsuran Rp 50.000│
 *    ╰─ └──────────────────┘
 *
 * Satu kartu per baris, kampung urut rute kolektor, nasabah urut nama; kolom cari nama di
 * atas. Ketuk kartu = layar penuh, bisa digeser ke foto lain di kampung yang sama.
 */
export function LayarFoto() {
  const atas = useSafeAreaInsets().top;
  const ruangTab = useRuangTab();
  const tagihan = useTagihan();
  const [cari, setCari] = useState("");
  const cariTunda = useDeferredValue(cari);
  const [buka, setBuka] = useState<{ foto: readonly FotoNasabah[]; awal: number } | null>(null);
  const { aktif: menarik, tarik } = useTarikSegarkan(() => tagihan.refetch());

  const { baris, nasabah, kampung } = useMemo(() => {
    const kelompok = tagihan.data ? kelompokFoto(tagihan.data, cariTunda) : [];
    const daftar: BarisFoto[] = [];
    for (const k of kelompok) {
      daftar.push({
        jenis: "judul",
        kunci: `j-${k.kunci}`,
        kampung: k.kampung,
        jumlah: k.foto.length,
      });
      k.foto.forEach((foto, indeks) => {
        daftar.push({
          jenis: "kartu",
          kunci: foto.nasabahId,
          foto,
          kelompok: k.foto,
          indeks,
          akhir: indeks === k.foto.length - 1,
        });
      });
    }
    return {
      baris: daftar,
      nasabah: kelompok.reduce((n, k) => n + k.foto.length, 0),
      kampung: kelompok.length,
    };
  }, [tagihan.data, cariTunda]);

  const renderItem = useCallback(({ item }: { item: BarisFoto }) => {
    if (item.jenis === "judul") return <JudulKampung kampung={item.kampung} jumlah={item.jumlah} />;
    return (
      <KartuFoto
        foto={item.foto}
        akhir={item.akhir}
        onBuka={() => setBuka({ foto: item.kelompok, awal: item.indeks })}
      />
    );
  }, []);

  if (tagihan.isPending) return <Kerangka jenis="daftar" teks="Memuat foto…" />;
  if (!tagihan.data) {
    return (
      <View style={[g.layar, gaya.galat, { paddingTop: atas + RUANG[6] }]}>
        <PesanGalat pesan={tagihan.error?.message} />
      </View>
    );
  }

  return (
    <View style={g.layar}>
      <FlatList
        data={baris}
        keyExtractor={(b) => b.kunci}
        renderItem={renderItem}
        initialNumToRender={6}
        windowSize={7}
        contentContainerStyle={[gaya.isi, { paddingTop: atas + RUANG[3], paddingBottom: ruangTab }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl
            refreshing={menarik}
            onRefresh={tarik}
            tintColor={AKSEN.teks}
            colors={[AKSEN.teks]}
            progressViewOffset={atas}
          />
        }
        ListHeaderComponent={
          <View style={gaya.kepala}>
            <KepalaJudulBesar overline={`${nasabah} nasabah · ${kampung} kampung`} judul="Foto" />
            <View style={gaya.cari}>
              <Ikon nama="search" ukuran={17} warna={WARNA.samar} />
              <TextInput
                style={gaya.teksCari}
                value={cari}
                onChangeText={setCari}
                placeholder="Cari nama nasabah"
                placeholderTextColor={WARNA.samar}
                returnKeyType="search"
                autoCorrect={false}
                underlineColorAndroid="transparent"
              />
            </View>
          </View>
        }
        ListEmptyComponent={
          <KotakKosong
            ikon="image"
            judul={cari ? "Tidak ditemukan" : "Belum ada foto"}
            isi={
              cari
                ? "Tidak ada nasabah yang cocok dengan pencarian ini."
                : "Foto serah terima tampil di sini sesudah akad dicatat."
            }
          />
        }
      />
      <FotoLayarPenuh
        foto={buka?.foto ?? null}
        awal={buka?.awal ?? 0}
        onTutup={() => setBuka(null)}
      />
    </View>
  );
}

const gaya = StyleSheet.create({
  galat: { paddingHorizontal: RUANG[5] },
  isi: { paddingHorizontal: RUANG[4] },
  kepala: { gap: RUANG[3], paddingHorizontal: RUANG[1], paddingBottom: RUANG[1] },
  cari: {
    height: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    paddingHorizontal: RUANG[3],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.permukaan,
    borderWidth: 1,
    borderColor: WARNA.garis,
  },
  teksCari: { ...HURUF.base, flex: 1, paddingVertical: 0, color: WARNA.teks },
});
