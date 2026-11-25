import type { NasabahLama } from "@opennael/contracts";
import { type JenisPinjaman, syaratAkad } from "@opennael/domain";
import { jam, LABEL_JENIS, rupiah, tampilKampung, tampilNama } from "@opennael/format";
import { Image, StyleSheet, Text, View } from "react-native";
import { Ikon } from "@/komponen/ui/ikon";
import { PesanGalat } from "@/komponen/ui/isian";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tekan } from "@/komponen/ui/tekan";
import { Tombol } from "@/komponen/ui/tombol";
import { useZonaKantor } from "@/lib/kantor";
import { HURUF, RUANG, SUDUT, TEBAL, WARNA } from "@/tema";
import type { KampungAkad } from "../../inti/isi-akad";
import type { LangkahAkad, SiapaNasabah } from "../../inti/langkah-akad";
import type { TitikLatar } from "../../titik-rumah-latar";
import { type FotoSerahTerima, fotoMasihBerlaku } from "../kamera-serah-terima";
import { StatusTitikRumah } from "../status-titik-rumah";
import { KakiTombol, type Kerangka, KerangkaLangkah } from "./kerangka-langkah";

/**
 * Langkah PERIKSA — ringkasan sebelum uang keluar; menggantikan pertanyaan "Simpan akad?".
 * Tiap baris yang bisa diubah bertautan "Ubah" ke langkahnya (tombol di sana kembali ke
 * sini). Pencairan = angka terbesar; tombol akhir menyebut uangnya ("Cairkan Rp 900.000").
 * Foto lewat 1 jam (A7): tombolnya berganti "Potret ulang".
 */
export function LangkahPeriksa(props: {
  k: Kerangka;
  jenis: JenisPinjaman;
  foto: FotoSerahTerima;
  siapa: SiapaNasabah;
  nama: string;
  kampung: KampungAkad | null;
  nik: string;
  nomorHp: string;
  lama: NasabahLama | null;
  pokok: number;
  tenor: number;
  /** Tanggal jatuh tempo (tempoan), sudah diformat; null bila bukan tempoan / belum dimuat. */
  jatuhTempo: string | null;
  titik: TitikLatar;
  memuat: boolean;
  galat: string | null | undefined;
  onUbah: (langkah: LangkahAkad) => void;
  onCairkan: () => void;
}) {
  const zona = useZonaKantor();
  const h = syaratAkad(props.jenis, props.pokok, props.tenor);
  const fotoSah = fotoMasihBerlaku(props.foto);
  const tempo = props.jenis === "tempoan";
  const satuan =
    props.jenis === "harian" ? " per hari" : props.jenis === "mingguan" ? " per minggu" : "";
  const tenorTeks =
    props.jenis === "harian"
      ? "24 kali · tiap hari tagih"
      : tempo
        ? `${props.tenor} hari${props.jatuhTempo ? ` · jatuh tempo ${props.jatuhTempo}` : ""}`
        : `${props.tenor} kali · seminggu sekali`;

  return (
    <KerangkaLangkah
      k={props.k}
      tanya="Periksa sebelum mencairkan"
      kaki={
        <KakiTombol>
          <PesanGalat pesan={props.galat} />
          {fotoSah ? (
            <Tombol
              judul={`Cairkan ${rupiah(h.pencairan)}`}
              ikon="banknote"
              memuat={props.memuat}
              onPress={props.onCairkan}
            />
          ) : (
            <Tombol judul="Potret ulang" ikon="camera" onPress={() => props.onUbah("foto")} />
          )}
        </KakiTombol>
      }
    >
      {fotoSah ? null : (
        <Spanduk
          warna="merah"
          judul="Foto sudah lebih dari 1 jam"
          isi="Potret ulang serah terima sebelum mencairkan."
        />
      )}

      <View style={[gaya.blok, gaya.foto]}>
        <Image source={{ uri: props.foto.uri }} style={gaya.mini} />
        <View style={gaya.isi}>
          <Text style={gaya.nilai}>Foto Serah Terima</Text>
          <Text style={gaya.ket}>
            Diambil {jam(new Date(props.foto.diambilAt).toISOString(), zona)}
            {fotoSah ? " · berlaku 1 jam" : " · kedaluwarsa"}
          </Text>
        </View>
        <TautanUbah judul="Potret ulang" onPress={() => props.onUbah("foto")} />
      </View>

      <View style={gaya.blok}>
        {props.siapa === "pernah-melunasi" && props.lama ? (
          <BarisPeriksa
            label="Nasabah · Pernah Melunasi"
            nilai={tampilNama(props.lama.nama)}
            ket={`${tampilKampung(props.lama.kampung)}${props.lama.terakhir ? ` · Pinjaman Ke-${props.lama.terakhir.pinjamanKe + 1}` : ""}`}
            onUbah={() => props.onUbah("pernah-melunasi")}
          />
        ) : (
          <>
            <BarisPeriksa
              label="Nasabah Baru"
              nilai={tampilNama(props.nama.trim())}
              onUbah={() => props.onUbah("nama")}
            />
            <BarisPeriksa
              garis
              label="Kampung"
              nilai={props.kampung ? tampilKampung(props.kampung.nama) : "—"}
              onUbah={() => props.onUbah("kampung")}
            />
            <BarisPeriksa
              garis
              label="NIK · Nomor HP"
              nilai={`${props.nik || "—"} · ${props.nomorHp || "—"}`}
              onUbah={() => props.onUbah("kontak")}
            />
          </>
        )}
      </View>

      <View style={gaya.blok}>
        <BarisPeriksa
          label="Jenis Pinjaman"
          nilai={LABEL_JENIS[props.jenis]}
          onUbah={() => props.onUbah("jenis")}
        />
        <BarisPeriksa
          garis
          label="Pokok Pinjaman"
          nilai={rupiah(props.pokok)}
          onUbah={() => props.onUbah("pokok")}
        />
        <BarisPeriksa
          garis
          label="Tenor"
          nilai={tenorTeks}
          onUbah={props.jenis === "harian" ? undefined : () => props.onUbah("tenor")}
        />
        <BarisPeriksa
          garis
          label={tempo ? "Dibayar Sekali" : "Angsuran"}
          nilai={`${rupiah(h.angsuran)}${satuan}`}
          ket={`Total kembali ${rupiah(h.totalKembali)}`}
        />
        {tempo ? null : (
          <BarisPeriksa
            garis
            label="Potongan"
            nilai={`Admin ${rupiah(h.potonganAdmin)} · Tabungan ${rupiah(h.tabunganMasuk)}`}
          />
        )}
        <View style={[gaya.baris, gaya.garis]}>
          <StatusTitikRumah titik={props.titik} lama={props.siapa === "pernah-melunasi"} />
        </View>
      </View>

      <View style={gaya.cair}>
        <Text style={gaya.cairLabel}>DICAIRKAN KE NASABAH</Text>
        <Text style={gaya.cairAngka} adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.7}>
          {rupiah(h.pencairan)}
        </Text>
        <Text style={gaya.ket}>Uang tunai dari kas lapangan hari ini</Text>
      </View>
    </KerangkaLangkah>
  );
}

function BarisPeriksa(props: {
  label: string;
  nilai: string;
  ket?: string;
  garis?: boolean;
  onUbah?: (() => void) | undefined;
}) {
  return (
    <View style={[gaya.baris, props.garis ? gaya.garis : null]}>
      <View style={gaya.isi}>
        <Text style={gaya.label}>{props.label}</Text>
        <Text style={gaya.nilai}>{props.nilai}</Text>
        {props.ket ? <Text style={gaya.ket}>{props.ket}</Text> : null}
      </View>
      {props.onUbah ? <TautanUbah judul="Ubah" onPress={props.onUbah} /> : null}
    </View>
  );
}

function TautanUbah(props: { judul: string; onPress: () => void }) {
  return (
    <Tekan
      onPress={props.onPress}
      hitSlop={10}
      accessibilityRole="button"
      style={({ pressed }) => [gaya.ubah, pressed ? gaya.ditekan : null]}
    >
      <Ikon nama="chevron-right" ukuran={14} warna={WARNA.utama} />
      <Text style={gaya.ubahTeks}>{props.judul}</Text>
    </Tekan>
  );
}

const gaya = StyleSheet.create({
  blok: {
    overflow: "hidden",
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.garis,
    backgroundColor: WARNA.permukaan,
  },
  foto: { flexDirection: "row", alignItems: "center", gap: RUANG[3], padding: RUANG[2.5] },
  mini: { width: 64, height: 64, borderRadius: SUDUT.sedang, backgroundColor: WARNA.isiNetral },
  baris: {
    flexDirection: "row",
    alignItems: "center",
    gap: RUANG[3],
    paddingHorizontal: RUANG[4],
    paddingVertical: RUANG[3],
  },
  garis: { borderTopWidth: 1, borderTopColor: WARNA.garis },
  isi: { flex: 1, gap: RUANG[0.5] },
  label: { ...HURUF.xs, fontWeight: TEBAL.semi, color: WARNA.redup },
  nilai: { ...HURUF.base, fontWeight: TEBAL.tebal, color: WARNA.teks },
  ket: { ...HURUF.sm, color: WARNA.redup },
  ubah: { flexDirection: "row-reverse", alignItems: "center", gap: RUANG[0.5] },
  ubahTeks: { ...HURUF.sm, fontWeight: TEBAL.tebal, color: WARNA.utama },
  ditekan: { opacity: 0.6 },
  cair: {
    alignItems: "center",
    gap: RUANG[0.5],
    padding: RUANG[4],
    borderRadius: SUDUT.besar,
    borderWidth: 1,
    borderColor: WARNA.utamaGaris,
    backgroundColor: WARNA.utamaLembut,
  },
  cairLabel: { ...HURUF.xs, fontWeight: TEBAL.ekstra, letterSpacing: 0.6, color: WARNA.utama },
  cairAngka: {
    ...HURUF["3xl"],
    fontWeight: TEBAL.ekstra,
    letterSpacing: -0.5,
    color: WARNA.teks,
    fontVariant: ["tabular-nums"],
  },
});
