import { angsuranKe, hitungGulung, KELIPATAN_POKOK, TENOR_PINJAMAN } from "@opennael/domain";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  IsianFotoSerahTerima,
} from "../../../komponen/kamera-serah-terima";
import { useGaya, useWarna, useWarnaMode } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "../../../komponen/tema";
import {
  Baris,
  Gulir,
  IsianUang,
  Kartu,
  Keterangan,
  PesanGalat,
  Pilihan,
  Spanduk,
  Tombol,
  useG,
} from "../../../komponen/ui";
import { cobaAturan, NAMA_JENIS, namaTenor, rupiah } from "../../../lib/format";
import { tulis, useTagihan, useTulis } from "../../../lib/lapangan";

const NAMA_GULUNG = { naik: "Naik", tetap: "Tetap", turun: "Turun" } as const;

/**
 * GULUNG (E) — pinjaman lama dilunasi pinjaman baru berjenis sama. Pratinjau
 * memakai rumus yang sama dengan server; rem bos hanya diketahui server.
 *
 * Seperti lembar gulung aplikasi lama: satu angka PATOKAN dicetak besar
 * (pokok lama — acuan yang diketik ulang kolektor di depan nasabah), lalu
 * pokok baru, tenor, dan ringkasan penerus. Berupa layar, bukan lembar,
 * karena gulung wajib memotret serah terima.
 */
export default function Gulung() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const g = useG();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useTagihan().data?.find((x) => x.id === id);
  const [pokok, setPokok] = useState(p?.pokok ?? 0);
  const [tenor, setTenor] = useState<number | null>(
    p ? (TENOR_PINJAMAN[p.jenis][0] ?? null) : null,
  );
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const gulung = useTulis(tulis.gulung);
  const aksen = useWarnaMode(p?.jenis ?? "harian");

  if (!p) {
    return (
      <Gulir>
        <Keterangan>Pinjaman ini sudah tidak ada di daftar tagih.</Keterangan>
        <Tombol judul="Kembali" ikon="arrow-left" jenis="kedua" onPress={() => router.back()} />
      </Gulir>
    );
  }

  const rencana = cobaAturan(() =>
    hitungGulung({ ...p, angsuranKe: angsuranKe(p) }, pokok, tenor ?? 0, {
      gulungDikunci: false,
      naikDikunci: false,
    }),
  );
  const fotoSah = fotoMasihBerlaku(foto);

  const simpan = () => {
    if (!rencana.hasil || !tenor || !fotoMasihBerlaku(foto)) return;
    const bersih = rencana.hasil.pencairan;
    Alert.alert("Simpan gulung?", `Serahkan ${rupiah(bersih)} tunai ke ${p.nasabah.nama}.`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Simpan",
        onPress: () =>
          gulung.mutate(
            { pinjamanId: p.id, pokok, tenor, fotoSerahTerimaId: foto.id },
            {
              // Penerusnya cair hari ini: kolektor dibawa ke segmen Droping.
              onSuccess: () =>
                router.dismissTo({ pathname: "/kolektor/tagihan", params: { segmen: "droping" } }),
            },
          ),
      },
    ]);
  };

  return (
    <Gulir>
      <Stack.Screen options={{ title: `Gulung · ${p.nasabah.nama}` }} />
      <View style={gaya.kepala}>
        <View style={gaya.bulat}>
          <Text style={gaya.bulatTeks}>{p.angsuranKe}</Text>
        </View>
        <View style={g.isi}>
          <View style={gaya.barisNama}>
            <Text style={gaya.nama} numberOfLines={1}>
              {p.nasabah.nama}
            </Text>
            <View style={[gaya.chip, { backgroundColor: aksen.lembut }]}>
              <Text style={[gaya.chipTeks, { color: aksen.teks }]}>
                {NAMA_JENIS[p.jenis]} ke-{p.pinjamanKe}
              </Text>
            </View>
          </View>
          <Text style={gaya.sub} numberOfLines={1}>
            {p.nasabah.kampung} · saldo {rupiah(p.saldo)}
          </Text>
        </View>
      </View>

      <View style={gaya.patokan}>
        <Text style={gaya.patokanLabel}>POKOK</Text>
        <Text
          style={gaya.patokanNilai}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          maxFontSizeMultiplier={1.15}
        >
          {rupiah(p.pokok)}
        </Text>
      </View>

      <IsianUang label="Nominal pokok baru" nilai={pokok} onUbah={setPokok} />
      <View style={g.baris2}>
        <View style={g.isi}>
          <Tombol
            judul={`− ${rupiah(KELIPATAN_POKOK)}`}
            jenis="kedua"
            nonaktif={pokok <= KELIPATAN_POKOK}
            onPress={() => setPokok(Math.max(KELIPATAN_POKOK, pokok - KELIPATAN_POKOK))}
          />
        </View>
        <View style={g.isi}>
          <Tombol
            judul={`+ ${rupiah(KELIPATAN_POKOK)}`}
            jenis="kedua"
            onPress={() => setPokok(pokok + KELIPATAN_POKOK)}
          />
        </View>
      </View>
      {TENOR_PINJAMAN[p.jenis].length > 1 ? (
        <Pilihan
          label="Tenor"
          pilihan={TENOR_PINJAMAN[p.jenis].map((t) => ({ nilai: t, teks: namaTenor(p.jenis, t) }))}
          nilai={tenor}
          onPilih={setTenor}
        />
      ) : null}

      {rencana.hasil ? (
        <Kartu>
          <Baris label="Jenis gulung" nilai={NAMA_GULUNG[rencana.hasil.jenisGulung]} />
          <Baris label="Pencairan akad baru" nilai={rupiah(rencana.hasil.syarat.pencairan)} />
          <Baris label="Saldo lama ditutup" nilai={`− ${rupiah(rencana.hasil.saldoLama)}`} />
          <View style={gaya.tunai}>
            <Text style={gaya.tunaiLabel}>Tunai ke nasabah</Text>
            <Text style={[gaya.tunaiNilai, { color: WARNA.utama }]} numberOfLines={1}>
              {rupiah(rencana.hasil.pencairan)}
            </Text>
          </View>
          <Baris
            label={p.jenis === "tempoan" ? "Kembali sekali bayar" : "Angsuran baru"}
            nilai={
              p.jenis === "tempoan"
                ? rupiah(rencana.hasil.syarat.totalKembali)
                : `${rupiah(rencana.hasil.syarat.angsuran)} × ${rencana.hasil.syarat.tenor}`
            }
          />
        </Kartu>
      ) : (
        <Spanduk warna="merah" judul="Belum bisa digulung" isi={rencana.galat} />
      )}

      <IsianFotoSerahTerima nilai={foto} onUbah={setFoto} />
      <PesanGalat pesan={gulung.error?.message} />
      <Tombol
        judul="Simpan gulung"
        ikon="circle-check"
        memuat={gulung.isPending}
        nonaktif={!rencana.hasil || !fotoSah}
        onPress={simpan}
      />
    </Gulir>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    bulat: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.abu,
    },
    bulatTeks: { ...HURUF.base, fontWeight: TEBAL.ekstra, color: WARNA.teks },
    barisNama: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
    nama: { ...HURUF.lg, flexShrink: 1, fontWeight: TEBAL.tebal, color: WARNA.teks },
    chip: { paddingHorizontal: RUANG[2], paddingVertical: 2, borderRadius: SUDUT.bulat },
    chipTeks: { ...HURUF["2xs"], fontWeight: TEBAL.tebal },
    sub: { ...HURUF.sm, color: WARNA.redup },
    patokan: {
      alignItems: "center",
      gap: RUANG[1],
      paddingVertical: RUANG[5],
      paddingHorizontal: RUANG[4],
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.abu,
    },
    patokanLabel: {
      ...HURUF.xs,
      fontWeight: TEBAL.tebal,
      letterSpacing: 1,
      color: WARNA.redup,
    },
    patokanNilai: {
      ...HURUF["3xl"],
      fontWeight: TEBAL.ekstra,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
    tunai: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: RUANG[3],
      paddingVertical: RUANG[1],
    },
    tunaiLabel: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teks },
    tunaiNilai: {
      ...HURUF.xl,
      flexShrink: 1,
      fontWeight: TEBAL.ekstra,
      fontVariant: ["tabular-nums"],
    },
  });
