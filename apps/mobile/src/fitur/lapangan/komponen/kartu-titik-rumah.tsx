import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { Kartu } from "@/komponen/ui/kartu";
import { Lencana } from "@/komponen/ui/lencana";
import { useGaya, useWarna } from "@/komponen/ui/tampilan";
import { Keterangan } from "@/komponen/ui/teks";
import { HURUF, RUANG, TEBAL, type Warna } from "@/komponen/ui/tema";
import { Tombol } from "@/komponen/ui/tombol";
import type { HasilAlamat } from "../alamat-titik";
import { tingkatAkurasi } from "../inti/titik-rumah";

/**
 * KARTU TITIK RUMAH di Detail Nasabah:
 *   📍 Titik Rumah                     [Akurat · ±12 m]
 *   Jl. Mawar No. 5
 *   Pule, Kedungwaru
 *   Tulungagung, Jawa Timur 66229
 * Alamat bertingkat dari geokode terbalik HP (baris jalan hilang bila tak diketahui — umum
 * di desa); lencana = seberapa dapat dipercaya titiknya (akurasi GPS saat direkam). Kartu
 * diketuk = buka Google Maps. Belum ada titik: penjelasan + tombol rekam (titik yang sudah
 * ada tak bisa diganti, jadi tombol itu hanya di sini).
 */
export function KartuTitikRumah(props: {
  /** Titik yang tersimpan; null = belum direkam. */
  lokasi: { akurasiMeter: number } | null;
  alamat: HasilAlamat;
  merekam: boolean;
  onBuka: () => void;
  onRekam: () => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);

  if (!props.lokasi) {
    return (
      <Kartu>
        <View style={gaya.judul}>
          <Ikon nama="map-pin" ukuran={16} warna={WARNA.teksKedua} />
          <Text style={gaya.judulTeks}>Titik Rumah</Text>
        </View>
        <Keterangan>
          Belum direkam. Biasanya terekam otomatis saat akad; rekam sekarang bila Anda sedang di
          depan rumahnya.
        </Keterangan>
        <Tombol
          judul="Rekam titik rumah di sini"
          ikon="map-pin"
          memuat={props.merekam}
          onPress={props.onRekam}
        />
      </Kartu>
    );
  }

  const akurasi = tingkatAkurasi(props.lokasi.akurasiMeter);
  const baris = props.alamat.alamat?.baris ?? [];
  return (
    <Pressable
      onPress={props.onBuka}
      accessibilityRole="button"
      accessibilityLabel={`Titik rumah${baris.length > 0 ? `: ${baris.join(", ")}` : ""}`}
      accessibilityHint="Buka di Google Maps"
      style={({ pressed }) => (pressed ? gaya.ditekan : null)}
    >
      <Kartu>
        <View style={gaya.judul}>
          <Ikon nama="map-pin" ukuran={16} warna={WARNA.teksKedua} />
          <Text style={gaya.judulTeks}>Titik Rumah</Text>
          <View style={gaya.lencana}>
            <Lencana
              teks={`${akurasi.teks} · ±${props.lokasi.akurasiMeter} m`}
              warna={akurasi.warna}
            />
          </View>
        </View>
        {props.alamat.memuat ? (
          <Text style={gaya.redup}>Mencari alamat…</Text>
        ) : baris.length > 0 ? (
          <View style={gaya.alamat}>
            {baris.map((b, i) => (
              <Text key={b} style={i === 0 ? gaya.baris0 : gaya.barisLain}>
                {b}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={gaya.redup}>Alamat tidak bisa dicari (butuh internet).</Text>
        )}
      </Kartu>
    </Pressable>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    ditekan: { opacity: 0.75 },
    judul: { flexDirection: "row", alignItems: "center", gap: RUANG[1.5] },
    judulTeks: { ...HURUF.base, fontWeight: TEBAL.semi, color: WARNA.teks },
    lencana: { flex: 1, alignItems: "flex-end" },
    alamat: { gap: RUANG[0.5] },
    baris0: { ...HURUF.base, fontWeight: TEBAL.semi, color: WARNA.teks },
    barisLain: { ...HURUF.sm, color: WARNA.teksKedua },
    redup: { ...HURUF.sm, color: WARNA.redup },
  });
