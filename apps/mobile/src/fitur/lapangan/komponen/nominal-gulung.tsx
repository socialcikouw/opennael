import type { JenisGulung, JenisPinjaman } from "@opennael/domain";
import { namaTenor, rupiah } from "@opennael/format";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";

/** Lencana jenis gulung di bawah nominal — ikon sama dengan lencana kartu Droping. */
const LENCANA_GULUNG = {
  naik: { teks: "NAIK", ikon: "trending-up" },
  tetap: { teks: "TETAP", ikon: "repeat" },
  turun: { teks: "TURUN", ikon: "trending-down" },
} as const satisfies Record<string, { teks: string; ikon: NamaIkon }>;

/**
 * Bagian tengah layar Gulung: patokan POKOK lama, nominal pokok baru besar,
 * garis + keterangan (galat / jenis gulung / petunjuk), dan pilihan tenor.
 */
export function NominalGulung({
  jenis,
  pokokLama,
  pokok,
  galat,
  jenisGulung,
  pilihanTenor,
  tenor,
  aksen,
  onTenor,
}: {
  jenis: JenisPinjaman;
  pokokLama: number;
  pokok: number;
  galat: string | null;
  /** Jenis gulung hasil hitung; null = belum ada rencana yang sah. */
  jenisGulung: JenisGulung | null;
  pilihanTenor: readonly number[];
  tenor: number | null;
  aksen: WarnaMode;
  onTenor: (tenor: number) => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);

  // Naik = hijau merek, tetap = abu, turun = merah (pokok berkurang).
  const rupaGulung = {
    naik: { teks: WARNA.utama, latar: WARNA.utamaLembut },
    tetap: { teks: WARNA.teksKedua, latar: WARNA.abu },
    turun: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
  };

  return (
    <View style={gaya.tengah}>
      <View style={[gaya.patokan, { backgroundColor: aksen.lembut }]}>
        <Text style={[gaya.patokanLabel, { color: aksen.teks }]}>POKOK</Text>
        <Text style={[gaya.patokanNilai, { color: aksen.teks }]} numberOfLines={1}>
          {rupiah(pokokLama)}
        </Text>
      </View>

      <View style={gaya.nominalBaris} accessible accessibilityLabel={`Pokok baru ${rupiah(pokok)}`}>
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
        ) : jenisGulung ? (
          <>
            <Text style={gaya.ketTeks}>Gulung</Text>
            <View style={[gaya.lencana, { backgroundColor: rupaGulung[jenisGulung].latar }]}>
              <Ikon
                nama={LENCANA_GULUNG[jenisGulung].ikon}
                ukuran={12}
                warna={rupaGulung[jenisGulung].teks}
              />
              <Text style={[gaya.lencanaTeks, { color: rupaGulung[jenisGulung].teks }]}>
                {LENCANA_GULUNG[jenisGulung].teks}
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
                onPress={() => onTenor(t)}
                style={[
                  gaya.tenorPil,
                  aktif ? { backgroundColor: aksen.isi, borderColor: aksen.isi } : null,
                ]}
              >
                <Text style={[gaya.tenorTeks, aktif ? { color: aksen.teksIsi } : null]}>
                  {namaTenor(jenis, t)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
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
  });
