import { angsuranKe, hitungGulung, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS, namaTenor, rupiah } from "@opennael/format";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { jumlahKetukan, PAPAN_POKOK, tekanPokok } from "@/fitur/tagihan/inti/papan";
import { PapanTombol, tinggiTombolPapan } from "@/fitur/tagihan/ui/papan-tombol";
import { AvatarNasabah } from "@/komponen/foto-nasabah";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  KameraSerahTerima,
} from "@/komponen/kamera-serah-terima";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Gulir } from "@/komponen/ui/layar";
import { useGaya, useWarna, useWarnaMode } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { BAYANGAN, HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import { cobaAturan } from "@/lib/aturan";
import { tulis, useTagihan, useTulis } from "@/lib/lapangan";

/** Lencana jenis gulung di bawah nominal — ikon sama dengan lencana kartu Droping. */
const LENCANA_GULUNG = {
  naik: { teks: "NAIK", ikon: "trending-up" },
  tetap: { teks: "TETAP", ikon: "repeat" },
  turun: { teks: "TURUN", ikon: "trending-down" },
} as const satisfies Record<string, { teks: string; ikon: NamaIkon }>;

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
export default function Gulung() {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  const { height } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
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

  // Naik = hijau merek, tetap = abu, turun = merah (pokok berkurang).
  const rupaGulung = {
    naik: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    tetap: { teks: WARNA.teksKedua, latar: WARNA.abu },
    turun: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
  };

  const tekan = (kunci: string) => {
    if (gulung.error) gulung.reset();
    setKetukan((k) => tekanPokok(k, kunci));
  };
  const konfirmasi = () => {
    if (!sah || !hasil || !tenor || !fotoMasihBerlaku(foto)) return;
    Alert.alert("Setuju digulung?", `Pokok Pinjaman: ${rupiah(pokok)}`, [
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
              {p.nasabah.kampung.toLowerCase()} · saldo {rupiah(p.saldo)}
            </Text>
          </View>
          <View style={[gaya.chip, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.chipTeks, { color: aksen.teks }]}>
              {LABEL_JENIS[p.jenis]} ke-{p.pinjamanKe}
            </Text>
          </View>
        </View>

        {foto ? (
          <View
            style={[gaya.foto, { height: Math.round(Math.min(160, Math.max(96, height * 0.15))) }]}
          >
            <Image source={{ uri: foto.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
            <View style={gaya.fotoKaki}>
              <View style={[gaya.fotoChip, fotoSah ? null : gaya.fotoChipLewat]}>
                <Ikon nama="clock" ukuran={12} warna={WARNA.putih} />
                <Text style={gaya.fotoChipTeks}>
                  {fotoSah
                    ? `${new Date(foto.diambilAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })} · berlaku 1 jam`
                    : "Lewat 1 jam"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Potret ulang foto serah terima"
                onPress={() => setKamera(true)}
                hitSlop={6}
                style={({ pressed }) => [gaya.fotoChip, pressed ? gaya.ditekan : null]}
              >
                <Ikon nama="camera" ukuran={12} warna={WARNA.putih} />
                <Text style={gaya.fotoChipTeks}>Potret ulang</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => setKamera(true)}
            style={({ pressed }) => [gaya.fotoKosong, pressed ? gaya.ditekan : null]}
          >
            <Ikon nama="camera" ukuran={20} warna={aksen.teks} />
            <Text style={[gaya.fotoKosongTeks, { color: aksen.teks }]}>Potret serah terima</Text>
          </Pressable>
        )}

        <View style={gaya.tengah}>
          <View style={[gaya.patokan, { backgroundColor: aksen.lembut }]}>
            <Text style={[gaya.patokanLabel, { color: aksen.teks }]}>POKOK</Text>
            <Text style={[gaya.patokanNilai, { color: aksen.teks }]} numberOfLines={1}>
              {rupiah(p.pokok)}
            </Text>
          </View>

          <View
            style={gaya.nominalBaris}
            accessible
            accessibilityLabel={`Pokok baru ${rupiah(pokok)}`}
          >
            <Text style={[gaya.mataUang, pokok > 0 ? { color: WARNA.teks } : null]}>Rp</Text>
            <Text
              style={[gaya.nominal, pokok === 0 ? { color: WARNA.samar } : null]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.5}
            >
              {pokok.toLocaleString("id-ID")}
            </Text>
          </View>
          <View
            style={[
              gaya.garisNominal,
              { backgroundColor: galat ? WARNA.bahaya : pokok > 0 ? aksen.teks : WARNA.garis },
            ]}
          />
          <View style={gaya.ket}>
            {galat ? (
              <>
                <Ikon nama="circle-alert" ukuran={12} warna={WARNA.bahayaTeks} />
                <Text
                  style={[gaya.ketTeks, { color: WARNA.bahayaTeks }]}
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {galat}
                </Text>
              </>
            ) : hasil ? (
              <>
                <Text style={gaya.ketTeks}>Gulung</Text>
                <View
                  style={[gaya.lencana, { backgroundColor: rupaGulung[hasil.jenisGulung].latar }]}
                >
                  <Ikon
                    nama={LENCANA_GULUNG[hasil.jenisGulung].ikon}
                    ukuran={12}
                    warna={rupaGulung[hasil.jenisGulung].teks}
                  />
                  <Text style={[gaya.lencanaTeks, { color: rupaGulung[hasil.jenisGulung].teks }]}>
                    {LENCANA_GULUNG[hasil.jenisGulung].teks}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={gaya.ketTeks} numberOfLines={2}>
                Ketuk nominal pokok baru — setiap ketukan menambah
              </Text>
            )}
          </View>

          {pilihanTenor.length > 1 ? (
            <View style={gaya.tenor}>
              {pilihanTenor.map((t) => {
                const aktif = t === tenor;
                return (
                  <Pressable
                    key={t}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: aktif }}
                    onPress={() => setTenor(t)}
                    style={[
                      gaya.tenorPil,
                      aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
                    ]}
                  >
                    <Text style={[gaya.tenorTeks, aktif ? { color: aksen.teksIsi } : null]}>
                      {namaTenor(p.jenis, t)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[gaya.panel, { paddingBottom: bawah + RUANG[4] }]}>
        <PapanTombol
          papan={PAPAN_POKOK}
          tinggi={tinggiTombolPapan(height, PAPAN_POKOK.length, 600)}
          onTekan={tekan}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !sah || gulung.isPending }}
          disabled={!sah || gulung.isPending}
          onPress={konfirmasi}
          style={({ pressed }) => [
            gaya.konfirmasi,
            sah ? { backgroundColor: aksen.isi } : gaya.konfirmasiMati,
            pressed ? gaya.konfirmasiDitekan : null,
          ]}
        >
          <Ikon
            nama={gulung.isPending ? "clock" : "check"}
            ukuran={20}
            warna={sah ? aksen.teksIsi : WARNA.samar}
            tebal
          />
          <Text style={[gaya.konfirmasiTeks, { color: sah ? aksen.teksIsi : WARNA.samar }]}>
            {gulung.isPending ? "MENYIMPAN…" : "KONFIRMASI"}
          </Text>
        </Pressable>
      </View>

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
    foto: {
      overflow: "hidden",
      justifyContent: "flex-end",
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.abu,
    },
    fotoKaki: {
      flexDirection: "row",
      justifyContent: "space-between",
      padding: RUANG[2],
    },
    fotoChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2.5],
      paddingVertical: RUANG[1],
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.tiraiGelap,
    },
    fotoChipLewat: { backgroundColor: WARNA.bahaya },
    fotoChipTeks: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.putih },
    fotoKosong: {
      height: 72,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[2],
      borderRadius: SUDUT.besar,
      borderWidth: 1.5,
      borderStyle: "dashed",
      borderColor: WARNA.garisTegas,
    },
    fotoKosongTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal },
    ditekan: { opacity: 0.8 },
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
    // Angka pahlawan layar ini — sama dengan layar Bayar, di atas skala token.
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
      // Dua baris huruf xs dipesan: munculnya galat tak menggeser nominal.
      minHeight: 32,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: RUANG[1.5],
      paddingHorizontal: RUANG[4],
    },
    ketTeks: { ...HURUF.xs, flexShrink: 1, textAlign: "center", color: WARNA.redup },
    lencana: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[1],
      paddingHorizontal: RUANG[2],
      paddingVertical: 2,
      borderRadius: SUDUT.bulat,
    },
    lencanaTeks: { ...HURUF.xs, fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
    tenor: { flexDirection: "row", gap: RUANG[2] },
    tenorPil: {
      paddingHorizontal: RUANG[4],
      paddingVertical: RUANG[1.5],
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garisTegas,
      backgroundColor: WARNA.permukaan,
    },
    tenorTeks: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.teksKedua },
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
