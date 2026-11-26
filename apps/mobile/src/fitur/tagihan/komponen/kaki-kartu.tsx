import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaAksen } from "@/tema";
import type { KartuVM } from "../inti/kartu";
import type { AksiKartu } from "./kartu-nasabah";

/**
 * Kaki kartu — dua baris (sinyal gulung kini di DALAM tombol Gulung, bukan baris sendiri):
 *   [ LIBUR ]   [ GULUNG            ]
 *               [ Bisa Digulung     ]   ← hijau bisa · merah belum · abu macet
 *   [ BAYAR                  Rp 15.000 ]
 * Libur & Gulung tonal; mati beserta alasannya bila belum boleh (tetap bisa
 * diketuk untuk membacanya). Bayar — satu-satunya bidang berwarna pekat,
 * selebar kartu — mencetak nominalnya. Tempoan hanya Libur & Lunasi (keputusan pemilik
 * 26 Nov 2026): Lunasi seharga saldo, Libur hanya sejak jatuh tempo, beralasan (G1), dan
 * tanpa Gulung (E5). Lunasi nasabah lain: tahan lama kartunya.
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
  // Tempoan tak bisa digulung (E5); sebelum jatuh tempo tak ada Libur juga — baris tonal hilang.
  const gulung = !vm.sekaliBayar;
  return (
    <View style={gaya.kaki}>
      {vm.tampilkanLibur || gulung ? (
        <View style={gaya.barisTonal}>
          {vm.tampilkanLibur ? (
            <TombolTonal
              label="LIBUR"
              ikon="circle-pause"
              sorot={false}
              mati={vm.alasanLibur ? "merah" : null}
              alasan={vm.alasanLibur}
              sinyal={null}
              onPress={() => aksi.libur(vm)}
            />
          ) : null}
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
      <Tekan
        accessibilityRole="button"
        accessibilityLabel={
          vm.sekaliBayar ? `Lunasi ${vm.bayarTeks}` : `Bayar angsuran ${vm.bayarTeks}`
        }
        onPress={() => (vm.sekaliBayar ? aksi.lunas(vm) : aksi.bayar(vm))}
        style={({ pressed }) => [
          gaya.bayar,
          { backgroundColor: aksen.isi },
          pressed ? gaya.ditekan : null,
        ]}
      >
        <View style={gaya.bayarKiri}>
          <Ikon
            nama={vm.sekaliBayar ? "circle-check" : "hand-coins"}
            ukuran={20}
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
  kaki: { gap: RUANG[2] },
  barisTonal: { flexDirection: "row", gap: RUANG[2] },
  tonal: {
    flex: 1,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: RUANG[2],
    borderRadius: SUDUT.sedang,
  },
  tonalBaris: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  tonalTeks: { ...HURUF.sm, fontWeight: TEBAL.semi, letterSpacing: 0.5 },
  sinyal: { ...HURUF["2xs"], fontWeight: TEBAL.sedang },
  bayar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: RUANG[4],
    borderRadius: SUDUT.sedang,
  },
  bayarKiri: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  bayarLabel: { ...HURUF.base, fontWeight: TEBAL.ekstra, letterSpacing: 0.5 },
  bayarNominal: { ...HURUF.base, fontWeight: TEBAL.tebal, fontVariant: ["tabular-nums"] },
});
