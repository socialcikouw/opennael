import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SENTUH, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";

/**
 * Kaki kartu — dua baris (sinyal gulung kini di DALAM tombol Gulung, bukan baris sendiri);
 * kartu MACET satu baris [ LIBUR ][ BAYAR  Rp … ] tanpa Gulung (macet tak bisa digulung):
 *   [ LIBUR ]   [ GULUNG            ]
 *               [ Bisa Digulung     ]   ← hijau bisa · merah belum · abu macet
 *   [ BAYAR                  Rp 15.000 ]
 * Libur & Gulung tonal; mati beserta alasannya bila belum boleh (tetap bisa
 * diketuk untuk membacanya). Bayar — satu-satunya bidang berwarna pekat,
 * selebar kartu — mencetak nominalnya. Tempoan hanya Janji Besok & Lunasi (keputusan
 * pemilik 26 Nov 2026): Lunasi seharga saldo; Janji Besok sejak jatuh tempo, mati pada batas
 * lunas (G1); tanpa Gulung (E5). Lunasi harian & mingguan: geser kartu ke kiri.
 */
export function KakiKartu({
  vm,
  aksi,
  aksen,
}: {
  vm: KartuVM;
  aksi: AksiKartu;
  aksen: WarnaAksen;
}) {
  const status = vm.progres?.status ?? "terkunci";
  // Tempoan tak bisa digulung (E5); MACET juga tak pernah bisa (F) — tombol Gulung yang selalu
  // mati tak ditampilkan, dan Libur + Bayar sebaris supaya kartu macet lebih rapat (28 Nov 2026).
  // Sebelum jatuh tempo tempoan tak ada Janji Besok — baris tonal hilang.
  const macet = vm.p.status === "macet";
  const gulung = !vm.sekaliBayar && !macet;
  const sebaris = macet && vm.tampilkanLibur;
  const libur = vm.tampilkanLibur ? (
    <TombolTonal
      label={vm.labelLibur}
      ikon={vm.sekaliBayar ? "calendar-clock" : "circle-pause"}
      sorot={false}
      mati={vm.alasanLibur ? "merah" : null}
      alasan={vm.alasanLibur}
      sinyal={null}
      onPress={() => aksi.libur(vm)}
    />
  ) : null;
  const bayar = (
    <Tekan
      accessibilityRole="button"
      accessibilityLabel={
        vm.sekaliBayar ? `Lunasi ${vm.bayarTeks}` : `Bayar angsuran ${vm.bayarTeks}`
      }
      onPress={() => (vm.sekaliBayar ? aksi.lunas(vm) : aksi.bayar(vm))}
      style={({ pressed }) => [
        gaya.bayar,
        sebaris ? gaya.bayarSebaris : null,
        { backgroundColor: aksen.isi },
        pressed ? gaya.ditekan : null,
      ]}
    >
      <View style={gaya.bayarKiri}>
        <Ikon
          nama={vm.sekaliBayar ? "circle-check" : "hand-coins"}
          ukuran={sebaris ? 16 : 20}
          warna={aksen.teksIsi}
        />
        <Text style={[gaya.bayarLabel, { color: aksen.teksIsi }]}>
          {vm.sekaliBayar ? "LUNASI" : "BAYAR"}
        </Text>
      </View>
      <Text style={[gaya.bayarNominal, { color: aksen.teksIsi }]} numberOfLines={1}>
        {vm.bayarTeks}
      </Text>
    </Tekan>
  );
  if (sebaris) {
    return (
      <View style={gaya.barisTonal}>
        {libur}
        {bayar}
      </View>
    );
  }
  return (
    <View style={gaya.kaki}>
      {vm.tampilkanLibur || gulung ? (
        <View style={gaya.barisTonal}>
          {libur}
          {gulung ? (
            <TombolTonal
              label="GULUNG"
              ikon="repeat"
              sorot={status === "boleh"}
              mati={status === "belum" ? "merah" : status === "terkunci" ? "abu" : null}
              alasan={vm.progres?.petunjuk ?? null}
              sinyal={vm.progres?.sinyal ?? null}
              onPress={() => aksi.gulung(vm)}
            />
          ) : null}
        </View>
      ) : null}
      {bayar}
    </View>
  );
}

/**
 * Tombol tonal kaki kartu: netral biasa · `sorot` hijau (mis. Gulung yang sudah
 * boleh) · mati merah (belum waktunya — terbuka sendiri nanti) · mati netral
 * (tak mungkin, mis. gulung pinjaman macet). Yang mati tetap bisa diketuk
 * untuk membaca alasannya. `sinyal` (opsional) = keterangan keadaan di bawah
 * label, berwarna sesuai keadaan.
 */
function TombolTonal(props: {
  label: string;
  ikon: NamaIkon;
  sorot: boolean;
  mati: "merah" | "abu" | null;
  alasan: string | null;
  sinyal: string | null;
  onPress: () => void;
}) {
  const warna =
    props.mati === "merah"
      ? WARNA.bahayaTeks
      : props.mati === "abu"
        ? WARNA.redup
        : props.sorot
          ? WARNA.sukses
          : WARNA.teksTombol;
  const latar =
    props.mati === "merah"
      ? WARNA.bahayaLembut
      : props.sorot
        ? WARNA.suksesLembut
        : WARNA.isiNetral;
  return (
    <Tekan
      accessibilityRole="button"
      accessibilityState={{ disabled: props.mati !== null }}
      accessibilityLabel={
        props.mati
          ? `${props.label}, tidak tersedia. ${props.alasan ?? ""}`
          : `${props.label}${props.sinyal ? `, ${props.sinyal}` : ""}`
      }
      onPress={props.onPress}
      style={({ pressed }) => [
        gaya.tonal,
        { backgroundColor: latar },
        pressed ? gaya.ditekan : null,
      ]}
    >
      <View style={gaya.tonalBaris}>
        <Ikon nama={props.ikon} ukuran={15} warna={warna} />
        <Text style={[gaya.tonalTeks, { color: warna }]} numberOfLines={1}>
          {props.label}
        </Text>
      </View>
      {props.sinyal ? (
        <Text
          style={[gaya.sinyal, { color: warna }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {props.sinyal}
        </Text>
      ) : null}
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  ditekan: { opacity: 0.8 },
  kaki: { gap: RUANG[1.5] },
  barisTonal: { flexDirection: "row", gap: RUANG[1.5] },
  tonal: {
    flex: 1,
    height: SENTUH.kecil,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: RUANG[2],
    borderRadius: SUDUT.sedang,
  },
  tonalBaris: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  tonalTeks: { ...HURUF.xs, fontWeight: TEBAL.tebal, letterSpacing: 0.5 },
  sinyal: { ...HURUF["2xs"], fontWeight: TEBAL.sedang },
  bayar: {
    height: SENTUH.sedang,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: RUANG[3],
    borderRadius: SUDUT.sedang,
  },
  // Sebaris dengan LIBUR (kartu macet): dua kali lebar Libur, setinggi tombol tonal.
  bayarSebaris: { flex: 2, height: SENTUH.kecil, paddingHorizontal: RUANG[2.5] },
  bayarKiri: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  bayarLabel: { ...HURUF.sm, fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
  bayarNominal: { ...HURUF.sm, fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
});
