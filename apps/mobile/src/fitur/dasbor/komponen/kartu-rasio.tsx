import { Pressable, StyleSheet, Text, View } from "react-native";
import type { RasioHariIni } from "@/fitur/lapangan";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "@/komponen/ui/tema";

/**
 * RASIO BAYAR hari ini atas seluruh pegangan: bayar ÷ (bayar + libur), bilah,
 * dan rincian Bayar · Libur · Sisa wajib. Hanya jumlah nasabah. Sisa nol →
 * ajakan membuka laporan (di tab Notifikasi).
 */
export function KartuRasio(props: {
  r: RasioHariIni | null;
  /** Daftar tagih gagal dimuat dan belum ada datanya. */
  gagal: boolean;
  aksen: WarnaMode;
  onLaporan: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const { r, aksen } = props;
  const total = r ? r.bayar + r.libur + r.sisa : 0;
  const beres = !!r && total > 0 && r.sisa === 0;
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
            {!r
              ? props.gagal
                ? "Gagal memuat"
                : "Memuat…"
              : total > 0
                ? `${r.sisa} sisa dari ${total}`
                : "Tak ada tagihan wajib"}
          </Text>
        )}
      </View>
      <View style={gaya.utama}>
        <Text style={[gaya.angka, { color: aksen.teks }]}>
          {r?.persen != null ? `${r.persen}%` : "—"}
        </Text>
        <View style={gaya.kanan}>
          <View style={gaya.rel}>
            <View
              style={[gaya.isiRel, { width: `${r?.persen ?? 0}%`, backgroundColor: aksen.isi }]}
            />
          </View>
          <Text style={gaya.ket}>
            {r?.persen == null
              ? "Belum ada yang dicatat hari ini"
              : "bayar dari yang sudah dicatat"}
          </Text>
        </View>
      </View>
      <View style={gaya.rincian}>
        <Butir warna={aksen.isi} label="Bayar" nilai={r?.bayar} />
        <Butir warna={WARNA.waspada} label="Libur" nilai={r?.libur} />
        <Butir warna={WARNA.garisTegas} label="Sisa" nilai={r?.sisa} />
      </View>
    </View>
  );
}

/** Satu butir rincian: titik warna, label, dan angkanya. */
function Butir(props: { warna: string; label: string; nilai: number | undefined }) {
  const gaya = useGaya(buatGaya);
  return (
    <View
      style={gaya.butir}
      accessible
      accessibilityLabel={`${props.label} ${props.nilai ?? "belum dimuat"}`}
    >
      <View style={[gaya.titik, { backgroundColor: props.warna }]} />
      <Text style={gaya.ket}>{props.label}</Text>
      <Text style={gaya.butirAngka}>{props.nilai ?? "—"}</Text>
    </View>
  );
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
    ket: { ...HURUF.xs, color: WARNA.redup },
    selesai: { flexDirection: "row", alignItems: "center", gap: RUANG[1] },
    utama: { flexDirection: "row", alignItems: "center", gap: RUANG[4] },
    angka: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    kanan: { flex: 1, gap: RUANG[1.5] },
    rel: { height: 10, borderRadius: SUDUT.bulat, backgroundColor: WARNA.abu },
    isiRel: { height: 10, borderRadius: SUDUT.bulat },
    rincian: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: RUANG[3],
      borderTopWidth: 1,
      borderTopColor: WARNA.garis,
    },
    butir: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    titik: { width: 8, height: 8, borderRadius: SUDUT.bulat },
    butirAngka: {
      ...HURUF.sm,
      fontWeight: TEBAL.tebal,
      color: WARNA.teks,
      fontVariant: ["tabular-nums"],
    },
  });
