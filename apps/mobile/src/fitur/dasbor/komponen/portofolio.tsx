import type { Portofolio as DataPortofolio } from "@opennael/contracts";
import { rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

type Nada = "netral" | "bahaya" | "redup";

interface Ubin {
  ikon: NamaIkon;
  label: string;
  nilai: number | null;
  sub: string;
  nada: Nada;
}

/** Ubin portofolio dari angka server; `data` undefined = belum dimuat. */
function susunUbin(data: DataPortofolio | undefined, gagal: boolean): Ubin[] {
  const kosong = gagal ? "Gagal memuat" : "Memuat…";
  if (!data) {
    return [
      { ikon: "trending-up", label: "Saldo berjalan", nilai: null, sub: kosong, nada: "netral" },
      { ikon: "triangle-alert", label: "Macet", nilai: null, sub: kosong, nada: "netral" },
      { ikon: "eraser", label: "Diputihkan", nilai: null, sub: kosong, nada: "redup" },
      { ikon: "banknote", label: "Piutang aktif", nilai: null, sub: kosong, nada: "netral" },
    ];
  }
  const { berjalan, macet, diputihkan } = data;
  const piutang = berjalan.saldo + macet.saldo;
  const persenMacet = piutang > 0 ? Math.round((macet.saldo / piutang) * 100) : 0;
  return [
    {
      ikon: "trending-up",
      label: "Saldo berjalan",
      nilai: berjalan.saldo,
      sub: `${berjalan.jumlah} pinjaman`,
      nada: "netral",
    },
    {
      ikon: "triangle-alert",
      label: "Macet",
      nilai: macet.saldo,
      sub: `${macet.jumlah} pinjaman${piutang > 0 ? ` · ${persenMacet}% piutang` : ""}`,
      nada: macet.jumlah > 0 ? "bahaya" : "netral",
    },
    {
      ikon: "eraser",
      label: "Diputihkan",
      nilai: diputihkan.saldo,
      sub: `${diputihkan.jumlah} pinjaman · dihapus bos`,
      nada: "redup",
    },
    {
      ikon: "banknote",
      label: "Piutang aktif",
      nilai: piutang,
      sub: `${berjalan.jumlah + macet.jumlah} pinjaman`,
      nada: "netral",
    },
  ];
}

/**
 * PORTOFOLIO pegangan kolektor: saldo berjalan, macet, diputihkan, dan piutang
 * aktif (berjalan + macet, aturan-usaha M). Macet yang ada berwarna merah;
 * diputihkan sudah dihapus bos, jadi diredupkan.
 */
export function Portofolio(props: { data: DataPortofolio | undefined; gagal: boolean }) {
  const gaya = useGaya(buatGaya);
  const ubin = susunUbin(props.data, props.gagal);
  return (
    <View style={gaya.grid}>
      <View style={gaya.baris}>
        {ubin.slice(0, 2).map((u) => (
          <UbinPortofolio key={u.label} u={u} />
        ))}
      </View>
      <View style={gaya.baris}>
        {ubin.slice(2).map((u) => (
          <UbinPortofolio key={u.label} u={u} />
        ))}
      </View>
    </View>
  );
}

function UbinPortofolio({ u }: { u: Ubin }) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const warnaNilai =
    u.nada === "bahaya" ? WARNA.bahayaTeks : u.nada === "redup" ? WARNA.teksKedua : WARNA.teks;
  return (
    <View
      style={[gaya.ubin, u.nada === "bahaya" ? gaya.ubinBahaya : null]}
      accessible
      accessibilityLabel={`${u.label} ${u.nilai !== null ? rupiah(u.nilai) : "belum dimuat"}, ${u.sub}`}
    >
      <View style={gaya.baris1}>
        <Ikon
          nama={u.ikon}
          ukuran={14}
          warna={u.nada === "bahaya" ? WARNA.bahayaTeks : WARNA.redup}
        />
        <Text style={gaya.label}>{u.label}</Text>
      </View>
      <Text
        style={[gaya.nilai, { color: warnaNilai }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {u.nilai !== null ? rupiah(u.nilai) : "—"}
      </Text>
      <Text style={gaya.sub} numberOfLines={1}>
        {u.sub}
      </Text>
    </View>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    grid: { gap: RUANG[3] },
    baris: { flexDirection: "row", gap: RUANG[3] },
    ubin: {
      flex: 1,
      gap: RUANG[1],
      padding: RUANG[3],
      borderRadius: SUDUT.besar,
      borderWidth: 1,
      borderColor: WARNA.garis,
      backgroundColor: WARNA.permukaan,
    },
    ubinBahaya: { borderColor: WARNA.bahayaGaris, backgroundColor: WARNA.bahayaLembut },
    baris1: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    label: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.redup },
    nilai: { ...HURUF.lg, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    sub: { ...HURUF.xs, color: WARNA.redup },
  });
