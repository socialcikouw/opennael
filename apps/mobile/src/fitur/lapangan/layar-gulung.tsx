import { angsuranKe, hitungGulung, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS, rupiah, tampilKampung } from "@opennael/format";
import { router, Stack } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { Gulir } from "@/komponen/ui/layar";
import { useGaya, useWarnaMode } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { cobaAturan } from "@/lib/aturan";
import { tulis, useTagihan, useTulis } from "./data";
import { jumlahKetukan, tekanPokok } from "./inti/papan";
import { FotoGulung } from "./komponen/foto-gulung";
import { AvatarNasabah } from "./komponen/foto-nasabah";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  KameraSerahTerima,
} from "./komponen/kamera-serah-terima";
import { NominalGulung } from "./komponen/nominal-gulung";
import { PanelGulung } from "./komponen/panel-gulung";

/**
 * GULUNG (E) — pinjaman lama dilunasi pinjaman baru berjenis sama.
 *
 * Alur: tombol Gulung → KAMERA langsung terbuka (foto serah terima wajib,
 * A7) → formulir bergaya layar Bayar: nasabah, foto tepat di bawahnya,
 * patokan POKOK lama, nominal pokok baru besar, papan pokok, KONFIRMASI.
 * Batal di kamera sebelum ada foto = kembali ke daftar.
 *
 * Papan pokok MENAMBAH: 100k diketuk dua kali = Rp 200.000; ⌫ membatalkan
 * ketukan terakhir. Pratinjau memakai rumus yang sama dengan server; rem bos
 * hanya diketahui server.
 */
export function LayarGulung({ id }: { id: string }) {
  const gaya = useGaya(buatGaya);
  const p = useTagihan().data?.find((x) => x.id === id);
  const aksen = useWarnaMode(p?.jenis ?? "harian");
  const [ketukan, setKetukan] = useState<readonly number[]>([]);
  /** Pilihan kolektor; null = bawaan (tenor pinjaman lama bila masih berlaku). */
  const [tenorDipilih, setTenor] = useState<number | null>(null);
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const [kamera, setKamera] = useState(true);
  const gulung = useTulis(tulis.gulung);

  if (!p) {
    return (
      <Gulir>
        <Keterangan>Pinjaman ini sudah tidak ada di daftar tagih.</Keterangan>
        <Tombol judul="Kembali" ikon="arrow-left" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const pilihanTenor = TENOR_PINJAMAN[p.jenis];
  const tenor =
    tenorDipilih ?? (pilihanTenor.includes(p.tenor) ? p.tenor : (pilihanTenor[0] ?? null));
  const pokok = jumlahKetukan(ketukan);
  const rencana =
    pokok > 0
      ? cobaAturan(() =>
          hitungGulung({ ...p, angsuranKe: angsuranKe(p) }, pokok, tenor ?? 0, {
            gulungDikunci: false,
            naikDikunci: false,
          }),
        )
      : null;
  const hasil = rencana?.hasil ?? null;
  const fotoSah = fotoMasihBerlaku(foto);
  const sah = hasil !== null && tenor !== null && fotoSah;
  const galat =
    gulung.error?.message ??
    rencana?.galat ??
    (foto && !fotoSah ? "Foto sudah lebih dari 1 jam — potret ulang." : null);

  const tekan = (kunci: string) => {
    if (gulung.error) gulung.reset();
    setKetukan((k) => tekanPokok(k, kunci));
  };
  const konfirmasi = () => {
    if (!sah || !hasil || !tenor || !fotoMasihBerlaku(foto)) return;
    Alert.alert("Setuju Digulung?", `Pokok Pinjaman: ${rupiah(pokok)}`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Setuju",
        onPress: () =>
          gulung.mutate(
            { pinjamanId: p.id, pokok, tenor, fotoSerahTerimaId: foto.id },
            {
              // Penerusnya cair hari ini: kolektor dibawa ke segmen Droping.
              onSuccess: () =>
                router.dismissTo({
                  pathname: "/kolektor/tagihan",
                  params: { segmen: "droping" },
                }),
            },
          ),
      },
    ]);
  };

  return (
    <View style={gaya.layar}>
      <Stack.Screen options={{ title: "Gulung" }} />

      <ScrollView
        style={gaya.gulir}
        contentContainerStyle={gaya.atas}
        showsVerticalScrollIndicator={false}
      >
        <View style={gaya.nasabah}>
          <AvatarNasabah fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} ukuran={48} />
          <View style={gaya.isi}>
            <Text style={gaya.nama} numberOfLines={1}>
              {p.nasabah.nama}
            </Text>
            <Text style={gaya.kampung} numberOfLines={1}>
              {tampilKampung(p.nasabah.kampung)} · saldo {rupiah(p.saldo)}
            </Text>
          </View>
          <View style={[gaya.chip, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.chipTeks, { color: aksen.teks }]}>
              {LABEL_JENIS[p.jenis]} ke-{p.pinjamanKe}
            </Text>
          </View>
        </View>

        <FotoGulung foto={foto} fotoSah={fotoSah} aksen={aksen} onPotret={() => setKamera(true)} />

        <NominalGulung
          jenis={p.jenis}
          pokokLama={p.pokok}
          pokok={pokok}
          galat={galat}
          jenisGulung={hasil?.jenisGulung ?? null}
          pilihanTenor={pilihanTenor}
          tenor={tenor}
          aksen={aksen}
          onTenor={setTenor}
        />
      </ScrollView>

      <PanelGulung
        sah={sah}
        memuat={gulung.isPending}
        aksen={aksen}
        onTekan={tekan}
        onKonfirmasi={konfirmasi}
      />

      <KameraSerahTerima
        terbuka={kamera}
        onTutup={() => {
          setKamera(false);
          // Gulung dimulai dari kamera: batal sebelum ada foto = batal gulung.
          if (!foto) router.back();
        }}
        onSelesai={(fotoId, uri) => {
          setFoto({ id: fotoId, uri, diambilAt: Date.now() });
          setKamera(false);
        }}
      />
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    layar: { flex: 1, backgroundColor: WARNA.latar },
    gulir: { flex: 1 },
    atas: {
      flexGrow: 1,
      gap: RUANG[3],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[4],
      paddingBottom: RUANG[3],
    },
    nasabah: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    isi: { flex: 1 },
    nama: { ...HURUF.xl, fontWeight: TEBAL.ekstra, color: WARNA.teks },
    kampung: { ...HURUF.sm, color: WARNA.redup },
    chip: { paddingHorizontal: RUANG[2.5], paddingVertical: RUANG[1], borderRadius: SUDUT.bulat },
    chipTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal },
  });
