import { hitungBayar } from "@opennael/domain";
import { useMutation } from "@tanstack/react-query";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { kabarTercatat } from "../../../fitur/tagihan/inti/kabar-tercatat";
import { hapusSatu, ketik, nilaiDigit } from "../../../fitur/tagihan/inti/papan";
import { PapanAngka } from "../../../fitur/tagihan/ui/papan-angka";
import { AvatarNasabah } from "../../../komponen/foto-nasabah";
import { useGaya, useWarna, useWarnaMode } from "../../../komponen/tampilan";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import { Gulir, Ikon, Keterangan, Tombol } from "../../../komponen/ui";
import { cobaAturan, rupiah } from "../../../lib/format";
import { tulis, useTagihan } from "../../../lib/lapangan";

/** Tinggi tombol papan menurut tinggi HP: 46–60 pt, papan selalu muat tanpa digulir. */
const tinggiTombol = (tinggiLayar: number) =>
  Math.round(Math.min(60, Math.max(46, (tinggiLayar - 500) / 5)));

/**
 * BAYAR ANGSURAN — layar sendiri, diisi kolektor berdiri di depan rumah
 * nasabah. Hanya SATU patokan dicetak (angsuran), lalu nominal diketik ulang
 * lewat papan angka sendiri — bukan keyboard HP — supaya tak ada isian
 * otomatis dan tak ada huruf/koma nyasar. Sisa saldo dihitung aturan yang
 * sama dengan server; pelunasan sebagian lewat rincian pinjaman.
 *
 * Tata letak: atas = siapa & berapa (nasabah, patokan, nominal besar di
 * tengah); bawah = panel papan angka + KONFIRMASI dalam jangkauan jempol.
 */
export default function Bayar() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  const { height } = useWindowDimensions();
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
  const sah = pratinjau?.hasil != null;
  const bisa = sah && !bayar.isPending;
  const galat = bayar.error?.message ?? pratinjau?.galat ?? null;
  const pas = nominal === p.angsuran;

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
    <View style={gaya.layar}>
      <Stack.Screen options={{ title: "Bayar Angsuran" }} />

      <View style={gaya.atas}>
        <View style={gaya.nasabah}>
          <AvatarNasabah fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} ukuran={48} />
          <View style={gaya.isi}>
            <Text style={gaya.nama} numberOfLines={1}>
              {p.nasabah.nama}
            </Text>
            <Text style={gaya.kampung} numberOfLines={1}>
              {p.nasabah.kampung.toLowerCase()}
            </Text>
          </View>
          <View style={[gaya.ke, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.keTeks, { color: aksen.teks }]}>
              ke-{p.angsuranKe + 1}/{p.tenor}
            </Text>
          </View>
        </View>

        <View style={gaya.tengah}>
          <View style={[gaya.patokan, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.patokanLabel, { color: aksen.teks }]}>ANGSURAN</Text>
            <Text style={[gaya.patokanNilai, { color: aksen.teks }]} numberOfLines={1}>
              {rupiah(p.angsuran)}
            </Text>
          </View>

          <View
            style={gaya.nominalBaris}
            accessible
            accessibilityLabel={`Nominal setoran ${rupiah(nominal)}`}
          >
            <Text style={[gaya.mataUang, nominal > 0 ? { color: WARNA.teks } : null]}>Rp</Text>
            <Text
              style={[gaya.nominal, nominal === 0 ? { color: WARNA.samar } : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {nominal.toLocaleString("id-ID")}
            </Text>
          </View>
          <View
            style={[
              gaya.garisNominal,
              {
                backgroundColor: galat ? WARNA.bahaya : nominal > 0 ? aksen.teks : WARNA.garis,
              },
            ]}
          />
          <View style={gaya.ket}>
            {galat ? <Ikon nama="circle-alert" ukuran={14} warna={WARNA.bahayaTeks} /> : null}
            {!galat && pas ? <Ikon nama="circle-check" ukuran={14} warna={aksen.teks} /> : null}
            <Text
              style={[
                gaya.ketTeks,
                galat ? { color: WARNA.bahayaTeks } : pas ? { color: aksen.teks } : null,
              ]}
              numberOfLines={2}
            >
              {galat ??
                (pratinjau?.hasil
                  ? `${pas ? "Pas angsuran · " : ""}sisa saldo ${rupiah(pratinjau.hasil.sisaSaldo)}`
                  : `Saldo ${rupiah(p.saldo)} · ketik nominal setoran`)}
            </Text>
          </View>
        </View>
      </View>

      <View style={[gaya.panel, { paddingBottom: bawah + RUANG[4] }]}>
        <PapanAngka
          tinggi={tinggiTombol(height)}
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
            sah ? { backgroundColor: aksen.isi } : gaya.konfirmasiMati,
            pressed ? gaya.konfirmasiDitekan : null,
          ]}
        >
          <Ikon
            nama={bayar.isPending ? "clock" : "check"}
            ukuran={20}
            warna={sah ? aksen.teksIsi : WARNA.samar}
            tebal
          />
          <Text style={[gaya.konfirmasiTeks, { color: sah ? aksen.teksIsi : WARNA.samar }]}>
            {bayar.isPending ? "MENYIMPAN…" : "KONFIRMASI"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    atas: { flex: 1, paddingHorizontal: RUANG[5], paddingTop: RUANG[4] },
    nasabah: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    isi: { flex: 1 },
    nama: { ...HURUF.xl, fontWeight: TEBAL.ekstra, color: WARNA.teks },
    kampung: { ...HURUF.sm, color: WARNA.redup },
    ke: { paddingHorizontal: RUANG[2.5], paddingVertical: RUANG[1], borderRadius: SUDUT.bulat },
    keTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal, fontVariant: ["tabular-nums"] },
    tengah: { flex: 1, justifyContent: "center", alignItems: "center", gap: RUANG[3] },
    patokan: {
      alignItems: "center",
      paddingVertical: RUANG[2],
      paddingHorizontal: RUANG[5],
      borderRadius: SUDUT.lebar,
    },
    patokanLabel: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
    patokanNilai: { ...HURUF.xl, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    nominalBaris: {
      width: "100%",
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      gap: RUANG[2],
      paddingHorizontal: RUANG[2],
    },
    mataUang: { ...HURUF["2xl"], fontWeight: TEBAL.semi, color: WARNA.samar },
    // Angka pahlawan layar ini — satu-satunya huruf di atas skala token.
    nominal: {
      fontSize: 48,
      lineHeight: 56,
      flexShrink: 1,
      fontWeight: TEBAL.ekstra,
      letterSpacing: -1,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    garisNominal: { width: "70%", height: 2, borderRadius: SUDUT.bulat },
    ket: {
      minHeight: 20,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1.5],
      paddingHorizontal: RUANG[4],
    },
    ketTeks: { ...HURUF.sm, textAlign: "center", color: WARNA.redup },
    panel: {
      gap: RUANG[4],
      paddingHorizontal: RUANG[4],
      paddingTop: RUANG[4],
      borderTopLeftRadius: SUDUT.lebar,
      borderTopRightRadius: SUDUT.lebar,
      backgroundColor: WARNA.permukaan,
      boxShadow: BAYANGAN.panelBawah,
    },
    konfirmasi: {
      height: 56,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.bulat,
    },
    konfirmasiMati: { backgroundColor: WARNA.abu },
    konfirmasiDitekan: { opacity: 0.88, transform: [{ scale: 0.98 }] },
    konfirmasiTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, letterSpacing: 1.5 },
  });
