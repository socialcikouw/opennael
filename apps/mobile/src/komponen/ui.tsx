import Ionicons from "@expo/vector-icons/Ionicons";
import { type ComponentProps, type ReactNode, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { bacaUang, tulisUang } from "../lib/format";
import { BAYANGAN, HURUF, RUANG, SENTUH, SUDUT, TEBAL, WARNA } from "./tema";

export { WARNA };

/** Header Stack baku layar-layar peran (kolektor, kasir, pengawas). */
export const OPSI_STACK = {
  headerTintColor: WARNA.utama,
  headerTitleStyle: { color: WARNA.teks, fontWeight: TEBAL.tebal },
  headerStyle: { backgroundColor: WARNA.latar },
  headerShadowVisible: false,
  headerBackButtonDisplayMode: "minimal",
  contentStyle: { backgroundColor: WARNA.latar },
} as const;

/**
 * KOMPONEN DASAR HP — satu gaya untuk semua layar: latar abu muda, kartu
 * putih, hijau Nael untuk aksi utama. Sentuhan minimal 44 pt (pedoman iOS),
 * isian menyala hijau saat aktif, keyboard tidak menutupi isian.
 */

export type NamaIkon = ComponentProps<typeof Ionicons>["name"];

export function Ikon(props: { nama: NamaIkon; ukuran?: number; warna?: string }) {
  return <Ionicons name={props.nama} size={props.ukuran ?? 20} color={props.warna ?? WARNA.teks} />;
}

/** Kerangka layar tanpa header: aman dari poni & bilah navigasi. */
export function Layar({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView style={g.layar}>
      <View style={g.layarIsi}>{children}</View>
    </SafeAreaView>
  );
}

/** Isi layar bergulir (layar ber-header Stack); keyboard tidak menutupi isian. */
export function Gulir({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={g.layar}
      contentContainerStyle={g.gulirIsi}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets
    >
      {children}
    </ScrollView>
  );
}

/** Pemuat penuh layar. */
export function Memuat({ teks }: { teks?: string }) {
  return (
    <View style={g.memuat}>
      <ActivityIndicator color={WARNA.utama} />
      {teks ? <Text style={g.teksRedup}>{teks}</Text> : null}
    </View>
  );
}

/** Tanda merek: kotak hijau ber-"N" + nama aplikasi. */
export function Merek({ besar }: { besar?: boolean }) {
  return (
    <View style={g.baris3}>
      <View style={[g.merekKotak, besar ? g.merekKotakBesar : null]}>
        <Text style={[g.merekHuruf, besar ? HURUF["2xl"] : HURUF.lg]}>N</Text>
      </View>
      <View>
        <Text style={[g.merekNama, besar ? HURUF.xl : HURUF.base]}>OpenNael</Text>
        <Text style={g.teksMini}>Simpan pinjam harian</Text>
      </View>
    </View>
  );
}

export function Judul({ children }: { children: ReactNode }) {
  return <Text style={g.judul}>{children}</Text>;
}

export function Keterangan({ children }: { children: ReactNode }) {
  return <Text style={g.keterangan}>{children}</Text>;
}

const GAYA_TOMBOL = {
  utama: { kotak: { backgroundColor: WARNA.utama }, teks: WARNA.putih },
  kedua: {
    kotak: { backgroundColor: WARNA.permukaan, borderWidth: 1, borderColor: WARNA.garisTegas },
    teks: WARNA.teksTombol,
  },
  bahaya: {
    kotak: { backgroundColor: WARNA.bahayaLembut, borderWidth: 1, borderColor: WARNA.bahayaGaris },
    teks: WARNA.bahaya,
  },
} as const;

export function Tombol(props: {
  judul: string;
  onPress: () => void;
  memuat?: boolean;
  jenis?: keyof typeof GAYA_TOMBOL;
  nonaktif?: boolean;
  ikon?: NamaIkon;
}) {
  const gaya = GAYA_TOMBOL[props.jenis ?? "utama"];
  const mati = props.nonaktif || props.memuat;
  return (
    <Pressable
      onPress={props.onPress}
      disabled={mati}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!mati, busy: !!props.memuat }}
      style={({ pressed }) => [
        g.tombol,
        gaya.kotak,
        pressed ? g.ditekan : null,
        mati ? g.mati : null,
      ]}
    >
      {props.memuat ? (
        <ActivityIndicator color={gaya.teks} />
      ) : (
        <>
          {props.ikon ? <Ikon nama={props.ikon} warna={gaya.teks} /> : null}
          <Text style={[g.tombolTeks, { color: gaya.teks }]}>{props.judul}</Text>
        </>
      )}
    </Pressable>
  );
}

/** Tautan teks kecil (mis. "Ganti nasabah"). */
export function TombolTeks(props: { judul: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={props.onPress}
      hitSlop={10}
      style={({ pressed }) => [g.tautanTombol, pressed ? g.ditekanKuat : null]}
    >
      <Text style={g.tautan}>{props.judul}</Text>
    </Pressable>
  );
}

function Label({ teks }: { teks?: string | undefined }) {
  return teks ? <Text style={g.label}>{teks}</Text> : null;
}

/** Bingkai isian: menyala hijau saat aktif, merah saat galat. */
function bingkai(fokus: boolean, galat: unknown) {
  return { borderColor: galat ? WARNA.bahayaBingkai : fokus ? WARNA.utamaFokus : WARNA.garisTegas };
}

export function Isian(
  props: TextInputProps & { label?: string; galat?: string | undefined; ikon?: NamaIkon },
) {
  const { label, galat, ikon, onFocus, onBlur, ...input } = props;
  const [fokus, setFokus] = useState(false);
  return (
    <View style={g.tumpuk1}>
      <Label teks={label} />
      <View style={[g.bingkaiIsian, bingkai(fokus, galat)]}>
        {ikon ? <Ikon nama={ikon} warna={WARNA.redup} /> : null}
        <TextInput
          style={g.isian}
          placeholderTextColor={WARNA.samar}
          onFocus={(e) => {
            setFokus(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFokus(false);
            onBlur?.(e);
          }}
          {...input}
        />
      </View>
      {galat ? <Text style={g.galat}>{galat}</Text> : null}
    </View>
  );
}

/** Isian rupiah: papan angka, pemisah ribuan saat diketik. */
export function IsianUang(props: {
  label: string;
  nilai: number;
  onUbah: (n: number) => void;
  galat?: string | null | undefined;
  autoFocus?: boolean;
}) {
  const [fokus, setFokus] = useState(false);
  return (
    <View style={g.tumpuk1}>
      <Label teks={props.label} />
      <View style={[g.bingkaiIsian, g.bingkaiUang, bingkai(fokus, props.galat)]}>
        <Text style={g.awalanRp}>Rp</Text>
        <TextInput
          style={g.isianUang}
          keyboardType="number-pad"
          placeholder="0"
          placeholderTextColor={WARNA.samar}
          value={tulisUang(props.nilai)}
          onChangeText={(t) => props.onUbah(bacaUang(t))}
          onFocus={() => setFokus(true)}
          onBlur={() => setFokus(false)}
          autoFocus={props.autoFocus ?? false}
        />
      </View>
      {props.galat ? <Text style={g.galat}>{props.galat}</Text> : null}
    </View>
  );
}

export function PesanGalat({ pesan }: { pesan: string | null | undefined }) {
  if (!pesan) return null;
  return (
    <View style={[g.kotakPesan, g.kotakGalat]}>
      <Ikon nama="alert-circle" ukuran={18} warna={WARNA.bahaya} />
      <Text style={g.pesanGalat}>{pesan}</Text>
    </View>
  );
}

export function Kartu({ children }: { children: ReactNode }) {
  return <View style={g.kartu}>{children}</View>;
}

/** Satu baris label — nilai (angka rata kanan). `warna` = warna teks nilai. */
export function Baris(props: { label: string; nilai: string; tebal?: boolean; warna?: string }) {
  return (
    <View style={g.barisNilai}>
      <Text style={g.barisLabel}>{props.label}</Text>
      <Text
        style={[
          g.barisAngka,
          props.tebal ? g.barisAngkaTebal : null,
          { color: props.warna ?? WARNA.teks },
        ]}
      >
        {props.nilai}
      </Text>
    </View>
  );
}

/** Angka ringkas berlabel — deret ringkasan di atas layar. */
export function KotakAngka(props: { label: string; nilai: string; ikon?: NamaIkon }) {
  return (
    <View style={g.kotakAngka}>
      <View style={g.baris1}>
        {props.ikon ? <Ikon nama={props.ikon} ukuran={14} warna={WARNA.redup} /> : null}
        <Text style={g.kotakAngkaLabel}>{props.label}</Text>
      </View>
      <Text style={g.kotakAngkaNilai}>{props.nilai}</Text>
    </View>
  );
}

const WARNA_LENCANA = {
  hijau: { backgroundColor: WARNA.utamaMuda, color: WARNA.utamaTua },
  kuning: { backgroundColor: WARNA.waspadaMuda, color: WARNA.waspadaTua },
  merah: { backgroundColor: WARNA.bahayaMuda, color: WARNA.bahayaTua },
  abu: { backgroundColor: WARNA.abu, color: WARNA.teksLabel },
} as const;

export function Lencana(props: { teks: string; warna?: keyof typeof WARNA_LENCANA }) {
  return <Text style={[g.lencana, WARNA_LENCANA[props.warna ?? "abu"]]}>{props.teks}</Text>;
}

const GAYA_SPANDUK: Record<
  "kuning" | "merah" | "hijau",
  { kotak: { backgroundColor: string; borderColor: string }; ikon: NamaIkon; warna: string }
> = {
  kuning: {
    kotak: { backgroundColor: WARNA.waspadaLembut, borderColor: WARNA.waspadaGaris },
    ikon: "warning",
    warna: WARNA.waspada,
  },
  merah: {
    kotak: { backgroundColor: WARNA.bahayaLembut, borderColor: WARNA.bahayaGaris },
    ikon: "alert-circle",
    warna: WARNA.bahaya,
  },
  hijau: {
    kotak: { backgroundColor: WARNA.utamaLembut, borderColor: WARNA.utamaGaris },
    ikon: "checkmark-circle",
    warna: WARNA.utama,
  },
};

/** Pengumuman di atas layar (gerbang tertutup, peringatan uang). */
export function Spanduk(props: {
  judul: string;
  isi?: string | undefined;
  warna?: keyof typeof GAYA_SPANDUK;
}) {
  const gaya = GAYA_SPANDUK[props.warna ?? "kuning"];
  return (
    <View style={[g.kotakPesan, g.spanduk, gaya.kotak]}>
      <Ikon nama={gaya.ikon} warna={gaya.warna} />
      <View style={g.spandukIsi}>
        <Text style={g.spandukJudul}>{props.judul}</Text>
        {props.isi ? <Text style={g.spandukTeks}>{props.isi}</Text> : null}
      </View>
    </View>
  );
}

/**
 * Pilihan tunggal. `segmen` = kontrol bersegmen selebar layar (mis. aksi
 * Setor/Lunas/Libur); bawaan = deretan tombol kecil yang boleh membungkus.
 */
export function Pilihan<T extends string | number>(props: {
  label?: string;
  pilihan: readonly { nilai: T; teks: string }[];
  nilai: T | null;
  onPilih: (nilai: T) => void;
  segmen?: boolean;
}) {
  if (props.segmen) {
    return (
      <View style={g.tumpuk1}>
        <Label teks={props.label} />
        <View style={g.segmen}>
          {props.pilihan.map((p) => {
            const aktif = p.nilai === props.nilai;
            return (
              <Pressable
                key={String(p.nilai)}
                onPress={() => props.onPilih(p.nilai)}
                accessibilityRole="button"
                accessibilityState={{ selected: aktif }}
                style={[g.segmenButir, aktif ? g.segmenAktif : null]}
              >
                <Text style={[g.pilihanTeks, { color: aktif ? WARNA.utamaTua : WARNA.teksKedua }]}>
                  {p.teks}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }
  return (
    <View style={g.tumpuk1}>
      <Label teks={props.label} />
      <View style={g.bungkus}>
        {props.pilihan.map((p) => {
          const aktif = p.nilai === props.nilai;
          return (
            <Pressable
              key={String(p.nilai)}
              onPress={() => props.onPilih(p.nilai)}
              accessibilityRole="button"
              accessibilityState={{ selected: aktif }}
              style={({ pressed }) => [
                g.chip,
                aktif ? g.chipAktif : null,
                pressed ? g.ditekan : null,
              ]}
            >
              <Text style={[g.pilihanTeks, { color: aktif ? WARNA.putih : WARNA.teksTombol }]}>
                {p.teks}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/**
 * Gaya bersama: dipakai komponen di atas, dan oleh layar untuk tata letak
 * berulang (deret, tumpukan, teks baku) — layar tidak menulis ulang angka.
 */
export const g = StyleSheet.create({
  layar: { flex: 1, backgroundColor: WARNA.latar },
  layarIsi: {
    flex: 1,
    gap: RUANG[5],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[4],
    paddingBottom: RUANG[6],
  },
  gulirIsi: {
    gap: RUANG[4],
    paddingHorizontal: RUANG[5],
    paddingTop: RUANG[4],
    paddingBottom: RUANG[12],
  },
  memuat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[3],
    backgroundColor: WARNA.latar,
  },
  isi: { flex: 1 },

  /** Deret mendatar, tengah tegak, celah 6 / 8 / 12 pt. */
  baris1: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
  baris2: { flexDirection: "row", alignItems: "center", gap: RUANG[2] },
  baris3: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
  /** Deret yang boleh membungkus ke baris berikut. */
  bungkus: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: RUANG[2] },
  /** Tumpukan tegak, celah 2 / 6 / 8 / 12 pt. */
  tumpuk05: { gap: RUANG[0.5] },
  tumpuk1: { gap: RUANG[1.5] },
  tumpuk2: { gap: RUANG[2] },
  tumpuk3: { gap: RUANG[3] },

  judul: { ...HURUF["2xl"], fontWeight: TEBAL.tebal, letterSpacing: -0.4, color: WARNA.teks },
  keterangan: { ...HURUF.base, color: WARNA.teksKedua },
  /** Judul kartu. */
  subjudul: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.teks },
  /** Nama orang / butir utama di daftar. */
  teksTebal: { ...HURUF.base, fontWeight: TEBAL.semi, color: WARNA.teks },
  teksKecil: { ...HURUF.sm, color: WARNA.teksKedua },
  teksRedup: { ...HURUF.sm, color: WARNA.redup },
  teksMini: { ...HURUF.xs, color: WARNA.redup },
  tautan: { ...HURUF.sm, fontWeight: TEBAL.semi, color: WARNA.utama },
  tautanTombol: { alignSelf: "flex-start", paddingVertical: RUANG[1] },

  /** Lingkaran inisial (avatar). */
  avatar: {
    width: 48,
    height: 48,
    borderRadius: SUDUT.bulat,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utamaMuda,
  },
  avatarHuruf: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.utamaTua },

  merekKotak: {
    width: 40,
    height: 40,
    borderRadius: SUDUT.besar,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: WARNA.utama,
  },
  merekKotakBesar: { width: 56, height: 56 },
  merekHuruf: { fontWeight: TEBAL.ekstra, color: WARNA.putih },
  merekNama: { fontWeight: TEBAL.tebal, color: WARNA.teks },

  tombol: {
    minHeight: SENTUH.besar,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    paddingHorizontal: RUANG[4],
  },
  tombolTeks: { ...HURUF.base, fontWeight: TEBAL.semi },
  ditekan: { opacity: 0.8 },
  ditekanKuat: { opacity: 0.6 },
  mati: { opacity: 0.5 },

  label: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksLabel },
  bingkaiIsian: {
    minHeight: SENTUH.besar,
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[2],
    borderRadius: SUDUT.besar,
    borderWidth: 2,
    backgroundColor: WARNA.permukaan,
    paddingHorizontal: RUANG[4],
  },
  bingkaiUang: { minHeight: SENTUH.isianUang, gap: 0 },
  isian: { flex: 1, paddingVertical: RUANG[3], fontSize: HURUF.base.fontSize, color: WARNA.teks },
  awalanRp: { ...HURUF.lg, fontWeight: TEBAL.semi, color: WARNA.samar },
  isianUang: {
    flex: 1,
    paddingVertical: RUANG[3],
    paddingLeft: RUANG[2],
    fontSize: HURUF.xl.fontSize,
    fontWeight: TEBAL.tebal,
    color: WARNA.teks,
  },
  galat: { ...HURUF.sm, color: WARNA.bahayaTeks },

  kotakPesan: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[3],
  },
  kotakGalat: {
    gap: RUANG[2],
    borderColor: WARNA.bahayaGaris,
    backgroundColor: WARNA.bahayaLembut,
  },
  pesanGalat: { ...HURUF.sm, flex: 1, color: WARNA.bahaya },
  spanduk: { gap: RUANG[3] },
  spandukIsi: { flex: 1, gap: RUANG[0.5] },
  spandukJudul: { ...HURUF.base, fontWeight: TEBAL.semi, color: WARNA.teks },
  spandukTeks: { ...HURUF.sm, color: WARNA.teksLabel },

  kartu: {
    gap: RUANG[3],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    padding: RUANG[4],
    boxShadow: BAYANGAN.kecil,
  },

  barisNilai: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: RUANG[3],
  },
  barisLabel: { ...HURUF.sm, flexShrink: 1, color: WARNA.teksKedua },
  barisAngka: { ...HURUF.base, textAlign: "right", fontWeight: TEBAL.sedang },
  barisAngkaTebal: { ...HURUF.lg, fontWeight: TEBAL.tebal },

  kotakAngka: {
    flex: 1,
    gap: RUANG[1],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    padding: RUANG[4],
  },
  kotakAngkaLabel: { ...HURUF.xs, fontWeight: TEBAL.sedang, color: WARNA.redup },
  kotakAngkaNilai: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.teks },

  lencana: {
    ...HURUF.xs,
    alignSelf: "flex-start",
    overflow: "hidden",
    borderRadius: SUDUT.bulat,
    paddingHorizontal: RUANG[2.5],
    paddingVertical: RUANG[1],
    fontWeight: TEBAL.semi,
  },

  segmen: {
    flexDirection: "row",
    borderRadius: SUDUT.besar,
    backgroundColor: WARNA.abuTua,
    padding: RUANG[1],
  },
  segmenButir: {
    minHeight: SENTUH.sedang,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: SUDUT.sedang,
  },
  segmenAktif: { backgroundColor: WARNA.permukaan, boxShadow: BAYANGAN.sedang },
  pilihanTeks: { ...HURUF.sm, fontWeight: TEBAL.semi },
  /** Butir pilihan bulat — juga dipakai layar (mis. saran kampung). */
  chip: {
    minHeight: SENTUH.sedang,
    justifyContent: "center",
    borderRadius: SUDUT.bulat,
    borderWidth: 1,
    borderColor: WARNA.garisTegas,
    backgroundColor: WARNA.permukaan,
    paddingHorizontal: RUANG[4],
  },
  chipAktif: { borderColor: WARNA.utama, backgroundColor: WARNA.utama },
  /** Butir daftar yang bisa diketuk (kartu pinjaman, nasabah lama). */
  butirDaftar: {
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[3],
  },
  butirDitekan: { backgroundColor: WARNA.abu },
});
