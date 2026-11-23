import type { JenisGulung, JenisPinjaman } from "@opennael/domain";
import { namaTenor, rupiah } from "@opennael/format";
import { StyleSheet, Text, View } from "react-native";
import type { NamaIkon } from "@/komponen/ui/daftar-ikon";
import { Ikon } from "@/komponen/ui/ikon";
import { Tekan } from "@/komponen/ui/tekan";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA, type WarnaMode } from "@/tema";
import { KetNominal, NominalBesar } from "./nominal-besar";

/** Lencana jenis gulung di bawah nominal — ikon sama dengan lencana kartu Droping. */
const LENCANA_GULUNG = {
  naik: { teks: "NAIK", ikon: "trending-up" },
  tetap: { teks: "TETAP", ikon: "repeat" },
  turun: { teks: "TURUN", ikon: "trending-down" },
} as const satisfies Record<string, { teks: string; ikon: NamaIkon }>;

/** Naik = hijau (sukses), tetap = netral, turun = merah (pokok berkurang). */
const RUPA_GULUNG = {
  naik: { teks: WARNA.sukses, latar: WARNA.suksesLembut },
  tetap: { teks: WARNA.teksKedua, latar: WARNA.isiNetral },
  turun: { teks: WARNA.bahayaTeks, latar: WARNA.bahayaLembut },
} as const;

/**
 * Bagian tengah layar Gulung = `NominalBesar` (sama dengan layar Bayar): patokan POKOK
 * lama, nominal pokok baru, garis + keterangan (galat / jenis gulung / petunjuk), dan
 * pilihan tenor di bawahnya.
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
  return (
    <NominalBesar
      patokanLabel="POKOK"
      patokanNilai={rupiah(pokokLama)}
      nominal={pokok}
      labelAksesibilitas={`Pokok baru ${rupiah(pokok)}`}
      garis={galat ? "galat" : pokok > 0 ? "terisi" : "kosong"}
      aksen={aksen}
      ket={
        galat ? (
          <KetNominal ikon="circle-alert" warna={WARNA.bahayaTeks} teks={galat} />
        ) : jenisGulung ? (
          <>
            <KetNominal teks="Gulung" />
            <View style={[gaya.lencana, { backgroundColor: RUPA_GULUNG[jenisGulung].latar }]}>
              <Ikon
                nama={LENCANA_GULUNG[jenisGulung].ikon}
                ukuran={12}
                warna={RUPA_GULUNG[jenisGulung].teks}
              />
              <Text style={[gaya.lencanaTeks, { color: RUPA_GULUNG[jenisGulung].teks }]}>
                {LENCANA_GULUNG[jenisGulung].teks}
              </Text>
            </View>
          </>
        ) : (
          <KetNominal teks="Ketuk nominal pokok baru — setiap ketukan menambah" />
        )
      }
      anak={
        pilihanTenor.length > 1 ? (
          <View style={gaya.tenor}>
            {pilihanTenor.map((t) => {
              const aktif = t === tenor;
              return (
                <Tekan
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
                </Tekan>
              );
            })}
          </View>
        ) : null
      }
    />
  );
}

const gaya = StyleSheet.create({
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
