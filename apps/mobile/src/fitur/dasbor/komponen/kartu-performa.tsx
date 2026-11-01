import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";
import type { RingkasPerforma } from "../inti/performa";

/** Tinggi bidang batang (pt) — 100% persentase. */
const TINGGI_BATANG = 56;
/** Batang terpendek: hari tanpa angka tetap terlihat sebagai tonggak kecil. */
const BATANG_MIN = 4;

/**
 * PERFORMA TAGIHAN MURNI (aturan-usaha N): setoran murni harian ÷ patokan, hanya
 * pinjaman harian. Angka besar = hari ini; batang = tiap hari tagih bulan ini
 * (hari ini paling pekat); di bawahnya rata-rata hari yang sudah lewat.
 * `p` null = belum dimuat; `gagal` = tak ada data dan pemuatan gagal.
 */
export function KartuPerforma(props: {
  p: RingkasPerforma | null;
  gagal: boolean;
  aksen: WarnaMode;
}) {
  const gaya = useGaya(buatGaya);
  const { p, aksen } = props;
  const hariIni = p?.hariIni ?? null;
  const persen = hariIni?.persentase ?? null;
  return (
    <View style={gaya.kartu}>
      <View style={gaya.barisLabel}>
        <Text style={gaya.label}>PERFORMA TAGIHAN MURNI</Text>
        <Text style={gaya.ket}>hanya harian</Text>
      </View>
      <View style={gaya.utama}>
        <Text style={[gaya.angka, { color: aksen.teks }]}>
          {persen !== null ? `${Math.round(persen)}%` : "—"}
        </Text>
        <Text style={gaya.penjelas}>{penjelasHariIni(p, props.gagal)}</Text>
      </View>
      {p && p.titik.length > 0 ? (
        <View
          style={gaya.batangWadah}
          accessible
          accessibilityLabel={`Performa ${p.titik.length} hari tagih bulan ini${
            p.rataRata !== null ? `, rata-rata hari lalu ${p.rataRata} persen` : ""
          }`}
        >
          {p.titik.map((t) => (
            <View key={t.tanggal} style={gaya.lajurBatang}>
              <View
                style={[
                  gaya.batang,
                  {
                    height:
                      t.persentase === null
                        ? BATANG_MIN
                        : Math.max(BATANG_MIN, (Math.min(t.persentase, 100) / 100) * TINGGI_BATANG),
                    backgroundColor: aksen.isi,
                    opacity: t.persentase === null ? 0.25 : t.hariIni ? 1 : 0.5,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      ) : null}
      <View style={gaya.barisLabel}>
        <Text style={gaya.ket}>{p ? `${p.titik.length} hari tagih bulan ini` : "Memuat…"}</Text>
        <Text style={gaya.ket}>
          {p?.rataRata != null ? `Rata-rata hari lalu ${p.rataRata}%` : "Belum ada hari lalu"}
        </Text>
      </View>
    </View>
  );
}

/** Kalimat di samping angka besar: dasar hitungannya, atau mengapa angkanya kosong. */
function penjelasHariIni(p: RingkasPerforma | null, gagal: boolean): string {
  if (!p) return gagal ? "Gagal memuat. Tarik ke bawah untuk mencoba lagi." : "Memuat…";
  const h = p.hariIni;
  if (!h) return "Hari ini bukan hari tagih.";
  if (h.patokan === null) return "Belum ada potret kemarin untuk patokan.";
  if (h.persentase === null) return "Tak ada angsuran harian yang jadi patokan hari ini.";
  return `Setoran murni ${rupiah(h.setoranMurni)} dari patokan ${rupiah(h.patokan)}`;
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    kartu: {
      gap: RUANG[3],
      padding: RUANG[4],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    barisLabel: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    label: { ...HURUF["2xs"], fontWeight: TEBAL.ekstra, letterSpacing: 0.8, color: WARNA.redup },
    ket: { ...HURUF.xs, color: WARNA.redup, fontVariant: ["tabular-nums"] },
    utama: { flexDirection: "row", alignItems: "center", gap: RUANG[4] },
    angka: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    penjelas: { ...HURUF.xs, flex: 1, color: WARNA.teksKedua },
    batangWadah: {
      height: TINGGI_BATANG,
      flexDirection: "row",
      alignItems: "flex-end",
      gap: 3,
    },
    lajurBatang: { flex: 1, height: "100%", justifyContent: "flex-end" },
    batang: { width: "100%", borderRadius: 2 },
  });
