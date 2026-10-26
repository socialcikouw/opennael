import { hitungBayar } from "@opennael/domain";
import { useMutation } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { kabarTercatat } from "../../../fitur/tagihan/inti/kabar-tercatat";
import { hapusSatu, ketik, nilaiDigit } from "../../../fitur/tagihan/inti/papan";
import { PapanAngka } from "../../../fitur/tagihan/ui/papan-angka";
import { useGaya, useWarna, useWarnaMode } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Gulir, Keterangan, Tombol } from "../../../komponen/ui";
import { cobaAturan, rupiah } from "../../../lib/format";
import { tulis, useTagihan } from "../../../lib/lapangan";

/**
 * BAYAR ANGSURAN — layar sendiri, diisi kolektor berdiri di depan rumah
 * nasabah. Hanya SATU patokan dicetak (angsuran), lalu nominal diketik ulang
 * lewat papan angka sendiri — bukan keyboard HP — supaya tak ada isian
 * otomatis dan tak ada huruf/koma nyasar. Sisa saldo dihitung aturan yang
 * sama dengan server; pelunasan sebagian lewat rincian pinjaman.
 */
export default function Bayar() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useTagihan().data?.find((x) => x.id === id);
  const aksen = useWarnaMode(p?.jenis ?? "harian");
  const [digit, setDigit] = useState("");
  const bayar = useMutation({ mutationFn: tulis.bayar });

  if (!p) {
    return (
      <Gulir>
        <Keterangan>Pinjaman ini sudah tidak ada di daftar tagih.</Keterangan>
        <Tombol judul="Kembali" ikon="arrow-left" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const nominal = nilaiDigit(digit);
  const pratinjau = nominal > 0 ? cobaAturan(() => hitungBayar(p, nominal, 0)) : null;
  const bisa = pratinjau?.hasil != null && !bayar.isPending;
  const galat = bayar.error?.message ?? pratinjau?.galat ?? null;

  const ubah = (baru: string) => {
    if (bayar.error) bayar.reset();
    setDigit(baru);
  };
  const konfirmasi = () => {
    if (!bisa) return;
    bayar.mutate(
      { pinjamanId: p.id, setoranMurni: nominal, setoranPelunasan: 0 },
      {
        onSuccess: () => {
          kabarTercatat.kirim(p.id, "bayar");
          router.back();
        },
      },
    );
  };

  return (
    <View style={[gaya.layar, { paddingBottom: bawah + RUANG[3] }]}>
      <Stack.Screen options={{ title: "Bayar Angsuran" }} />

      <View style={gaya.atas}>
        <View>
          <Text style={gaya.nama} numberOfLines={1}>
            {p.nasabah.nama}
          </Text>
          <Text style={gaya.kampung} numberOfLines={1}>
            {p.nasabah.kampung.toLowerCase()} · angsuran ke-{p.angsuranKe + 1} dari {p.tenor}
          </Text>
        </View>

        <View style={[gaya.patokan, { backgroundColor: aksen.lembut }]}>
          <Text style={[gaya.patokanLabel, { color: aksen.teks }]}>ANGSURAN</Text>
          <Text
            style={[gaya.patokanNilai, { color: aksen.teks }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {rupiah(p.angsuran)}
          </Text>
        </View>

        <View>
          <View
            style={[gaya.isian, { borderColor: nominal > 0 ? aksen.teks : WARNA.garisTegas }]}
            accessible
            accessibilityLabel={`Nominal setoran ${rupiah(nominal)}`}
          >
            <Text style={gaya.mataUang}>Rp</Text>
            <Text
              style={[gaya.nominal, nominal === 0 ? { color: WARNA.samar } : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {nominal.toLocaleString("id-ID")}
            </Text>
          </View>
          <Text style={[gaya.ket, galat ? { color: WARNA.bahayaTeks } : null]} numberOfLines={2}>
            {galat ??
              (pratinjau?.hasil
                ? `Sisa saldo sesudah bayar ${rupiah(pratinjau.hasil.sisaSaldo)}`
                : `Saldo ${rupiah(p.saldo)} · ketik nominal setoran`)}
          </Text>
        </View>
      </View>

      <View style={gaya.bawah}>
        <PapanAngka
          onKetik={(t) => ubah(ketik(digit, t))}
          onHapus={() => ubah(hapusSatu(digit))}
          onKosongkan={() => ubah("")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !bisa }}
          disabled={!bisa}
          onPress={konfirmasi}
          style={({ pressed }) => [
            gaya.konfirmasi,
            { backgroundColor: aksen.isi },
            !bisa ? gaya.mati : null,
            pressed ? gaya.konfirmasiDitekan : null,
          ]}
        >
          <Text style={[gaya.konfirmasiTeks, { color: aksen.teksIsi }]}>
            {bayar.isPending ? "MENYIMPAN…" : "KONFIRMASI"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: {
      flex: 1,
      justifyContent: "space-between",
      gap: RUANG[4],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[4],
      backgroundColor: WARNA.latar,
    },
    atas: { gap: RUANG[4] },
    nama: { ...HURUF["2xl"], fontWeight: TEBAL.ekstra, color: WARNA.teks },
    kampung: { ...HURUF.sm, marginTop: 2, color: WARNA.redup },
    patokan: {
      alignItems: "center",
      gap: RUANG[1],
      paddingVertical: RUANG[3],
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.besar,
    },
    patokanLabel: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
    patokanNilai: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    isian: {
      height: 64,
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2],
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.sedang,
      borderWidth: 1.5,
      backgroundColor: WARNA.permukaan,
    },
    mataUang: { ...HURUF.lg, fontWeight: TEBAL.semi, color: WARNA.redup },
    nominal: {
      ...HURUF["3xl"],
      flex: 1,
      textAlign: "right",
      fontWeight: TEBAL.tebal,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    ket: { ...HURUF.xs, marginTop: RUANG[2], textAlign: "right", color: WARNA.redup },
    bawah: { gap: RUANG[4] },
    konfirmasi: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.sedang,
    },
    konfirmasiDitekan: { opacity: 0.85 },
    konfirmasiTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
    mati: { opacity: 0.4 },
  });
