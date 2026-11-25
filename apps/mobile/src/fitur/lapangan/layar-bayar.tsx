import { hitungBayar } from "@opennael/domain";
import { rupiah, tampilKampung, tampilNama, tanggalBertahun } from "@opennael/format";
import { useMutation } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Gulir } from "@/komponen/ui/layar";
import { SelubungMencatat } from "@/komponen/ui/selubung-mencatat";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { cobaAturan } from "@/lib/aturan";
import { AKSEN, HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import { tulis, useTagihan } from "./data";
import { nilaiDigit, PAPAN_BAYAR, tekanBayar } from "./inti/papan";
import { kabarTercatat } from "./kabar-tercatat";
import { KetNominal, NominalBesar } from "./komponen/nominal-besar";
import { PanelPapan } from "./komponen/panel-papan";

/**
 * BAYAR ANGSURAN — layar sendiri, diisi kolektor berdiri di depan rumah
 * nasabah. Hanya SATU patokan dicetak (angsuran), lalu nominal diketik ulang
 * lewat papan angka sendiri — bukan keyboard HP — supaya tak ada isian
 * otomatis dan tak ada huruf/koma nyasar (patokan SENGAJA tak bisa diketuk untuk
 * mengisi). Sisa saldo dihitung aturan yang sama dengan server; pelunasan
 * sebagian lewat rincian pinjaman.
 *
 * Tata letak: atas = siapa (nasabah) dan berapa (`NominalBesar`); bawah =
 * `PanelPapan` (papan angka + KONFIRMASI) dalam jangkauan jempol — dua blok yang
 * sama dengan layar Gulung.
 */
export function LayarBayar({ id }: { id: string }) {
  const p = useTagihan().data?.find((x) => x.id === id);
  const aksen = AKSEN;
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
  const galat = bayar.error?.message ?? pratinjau?.galat ?? null;
  const pas = nominal === p.angsuran;

  const ubah = (baru: string) => {
    if (bayar.error) bayar.reset();
    setDigit(baru);
  };
  const konfirmasi = () => {
    if (!sah || bayar.isPending) return;
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
      {/* Selama menyimpan: kembali dikunci (header & usap), formulir ditutup selubung. */}
      <Stack.Screen
        options={{
          title: "Bayar Angsuran",
          headerBackVisible: !bayar.isPending,
          gestureEnabled: !bayar.isPending,
        }}
      />

      <View style={gaya.atas}>
        <View style={gaya.nasabah}>
          <View
            style={gaya.angsuranKe}
            accessible
            accessibilityLabel={`Angsuran ke-${p.angsuranKe}`}
          >
            <Text style={gaya.angsuranKeTeks} numberOfLines={1} adjustsFontSizeToFit>
              {p.angsuranKe}
            </Text>
          </View>
          <View style={gaya.isi}>
            <View style={gaya.barisKepala}>
              <Text style={gaya.nama} numberOfLines={1}>
                {tampilNama(p.nasabah.nama)}
              </Text>
              <View style={[gaya.chip, { backgroundColor: aksen.lembut }]}>
                <Text style={[gaya.chipTeks, { color: aksen.teks }]}>
                  Pinjaman ke-{p.pinjamanKe}
                </Text>
              </View>
            </View>
            <View style={gaya.barisKepala}>
              <Text style={gaya.kampung} numberOfLines={1}>
                {tampilKampung(p.nasabah.kampung)}
              </Text>
              <View
                style={[gaya.chip, gaya.chipWaktu]}
                accessible
                accessibilityLabel={`Akad ${tanggalBertahun(p.tanggalAkad)}`}
              >
                <Text style={[gaya.chipTeks, gaya.waktuTeks]}>
                  {tanggalBertahun(p.tanggalAkad)}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <NominalBesar
          patokanLabel="ANGSURAN"
          patokanNilai={rupiah(p.angsuran)}
          nominal={nominal}
          labelAksesibilitas={`Nominal setoran ${rupiah(nominal)}`}
          garis={galat ? "galat" : nominal > 0 ? "terisi" : "kosong"}
          aksen={aksen}
          ket={
            <KetNominal
              ikon={galat ? "circle-alert" : pas ? "circle-check" : undefined}
              warna={galat ? WARNA.bahayaTeks : pas ? aksen.teks : undefined}
              teks={
                galat ??
                (pratinjau?.hasil
                  ? `${pas ? "Pas angsuran · " : ""}sisa saldo ${rupiah(pratinjau.hasil.sisaSaldo)}`
                  : `Sisa saldo ${rupiah(p.saldo)} · ketik nominal setoran`)
              }
            />
          }
        />
      </View>

      <PanelPapan
        papan={PAPAN_BAYAR}
        sisaTinggi={500}
        sah={sah}
        memuat={bayar.isPending}
        aksen={aksen}
        onTekan={(k) => ubah(tekanBayar(digit, k))}
        onKonfirmasi={konfirmasi}
      />
      {bayar.isPending ? (
        <SelubungMencatat judul="Mencatat pembayaran…" warna={aksen.teks} layar />
      ) : null}
    </View>
  );
}

const gaya = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.latar },
  atas: { flex: 1, paddingHorizontal: RUANG[5], paddingTop: RUANG[4] },
  nasabah: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
  // Lingkaran angsuran ke- — sama dengan kotak angka di kartu nasabah.
  angsuranKe: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: RUANG[1],
    borderRadius: SUDUT.bulat,
    backgroundColor: WARNA.isiNetral,
  },
  angsuranKeTeks: {
    ...HURUF.lg,
    fontWeight: TEBAL.ekstra,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
  isi: { flex: 1, gap: RUANG[0.5] },
  barisKepala: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  nama: { ...HURUF.xl, flex: 1, fontWeight: TEBAL.ekstra, color: WARNA.teks },
  kampung: { ...HURUF.sm, flex: 1, color: WARNA.redup },
  chip: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
  chipTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal, fontVariant: ["tabular-nums"] },
  chipWaktu: { backgroundColor: WARNA.isiNetral },
  waktuTeks: { fontWeight: TEBAL.semi, color: WARNA.teksKedua },
});
