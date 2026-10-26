import { Pressable, StyleSheet, Text, View } from "react-native";
import { LembarBawah } from "../../../komponen/lembar-bawah";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "../../../komponen/tema";
import { Ikon } from "../../../komponen/ui";
import type { LompatRute } from "../inti/daftar";

/**
 * Kartu RASIO BAYAR di kepala layar: bayar ÷ (bayar + libur) hari ini, bilah,
 * legenda Bayar · Libur, dan sisa wajib. Hanya jumlah nasabah — uang hari ini
 * sengaja tak dicetak. Sisa nol → ajakan membuka laporan.
 */
export function KartuRasio(props: {
  bayar: number;
  libur: number;
  sisa: number;
  aksen: WarnaMode;
  onLaporan: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const ditagih = props.bayar + props.libur;
  const total = ditagih + props.sisa;
  const persen = ditagih > 0 ? Math.round((props.bayar / ditagih) * 100) : 0;
  const beres = total > 0 && props.sisa === 0;
  return (
    <View style={gaya.kartu}>
      <View style={gaya.barisLabel}>
        <Text style={gaya.label}>RASIO BAYAR</Text>
        {beres ? (
          <Pressable onPress={props.onLaporan} style={gaya.selesai} accessibilityRole="button">
            <Ikon nama="circle-check" ukuran={12} warna={WARNA.utama} />
            <Text style={[gaya.ket, { color: WARNA.utama }]}>
              Tagihan wajib selesai · buka laporan
            </Text>
          </Pressable>
        ) : (
          <Text style={gaya.ket}>
            {total > 0 ? `${props.sisa} sisa dari ${total}` : "Tak ada tagihan wajib"}
          </Text>
        )}
      </View>
      <View style={gaya.rasio}>
        <Text style={[gaya.angka, { color: props.aksen.teks }]}>
          {ditagih > 0 ? `${persen}%` : "—"}
        </Text>
        <View style={gaya.kanan}>
          <View style={gaya.rel}>
            <View
              style={[gaya.isiRel, { width: `${persen}%`, backgroundColor: props.aksen.isi }]}
            />
          </View>
          <View style={gaya.legenda}>
            <Text style={gaya.legendaTeks}>
              Bayar <Text style={gaya.legendaAngka}>{props.bayar}</Text>
            </Text>
            <Text style={gaya.legendaTeks}>
              Libur <Text style={gaya.legendaAngka}>{props.libur}</Text>
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/**
 * Lembar LOMPAT KE RUTE — satu baris per kelompok di daftar yang sedang
 * tampil: nama rute & jumlah kartunya; kelompok yang sedang di layar
 * ditandai. Memilih = lembar tertutup, lalu daftar menggulung ke judul itu.
 */
export function LembarRute(props: {
  terbuka: boolean;
  rute: readonly LompatRute[];
  ruteKini: string | null;
  aksen: WarnaMode;
  onPilih: (r: LompatRute) => void;
  onTutup: () => void;
  onSelesaiTutup: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  return (
    <LembarBawah
      terbuka={props.terbuka}
      onTutup={props.onTutup}
      onSelesaiTutup={props.onSelesaiTutup}
      judul="Lompat ke rute"
    >
      {props.rute.map((r) => {
        const kini = r.rute === props.ruteKini;
        return (
          <Pressable
            key={r.id}
            onPress={() => props.onPilih(r)}
            accessibilityRole="button"
            style={({ pressed }) => [
              gaya.baris,
              kini ? { backgroundColor: props.aksen.lembut, borderColor: props.aksen.teks } : null,
              pressed ? gaya.ditekan : null,
            ]}
          >
            <Ikon
              nama={r.sudah ? "circle-check" : "map-pin"}
              ukuran={16}
              warna={kini ? props.aksen.teks : WARNA.redup}
            />
            <Text style={gaya.ruteTeks} numberOfLines={1}>
              {r.label}
            </Text>
            <Text style={gaya.ruteJumlah}>{r.jumlah}</Text>
          </Pressable>
        );
      })}
    </LembarBawah>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      gap: RUANG[2],
      padding: RUANG[3],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    barisLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.8, color: WARNA.redup },
    ket: { ...HURUF.xs, color: WARNA.redup },
    selesai: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
    rasio: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    angka: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    kanan: { flex: 1, gap: RUANG[1.5] },
    rel: { height: 8, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    isiRel: { height: 8, borderRadius: SUDUT.bulat },
    legenda: { flexDirection: "row", gap: RUANG[4] },
    legendaTeks: { ...HURUF.xs, color: WARNA.redup },
    legendaAngka: { fontWeight: TEBAL.tebal, color: WARNA.teks },
    baris: {
      flexDirection: "row",
      alignItems: "center",
      gap: RUANG[2.5],
      padding: RUANG[3],
      borderRadius: SUDUT.sedang,
      borderWidth: 1,
      borderColor: WARNA.garis,
    },
    ditekan: { opacity: 0.7 },
    ruteTeks: { ...HURUF.sm, flex: 1, fontWeight: TEBAL.semi, color: WARNA.teks },
    ruteJumlah: {
      ...HURUF.sm,
      fontWeight: TEBAL.tebal,
      color: WARNA.teksKedua,
      fontVariant: ["tabular-nums"],
    },
  });
