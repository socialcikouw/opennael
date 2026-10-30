import { StyleSheet } from "react-native";
import { useGaya } from "@/komponen/ui/tampilan";
import { BAYANGAN, HURUF, RUANG, SENTUH, SUDUT, TEBAL, type Warna } from "@/komponen/ui/tema";

/**
 * Gaya bersama: dipakai komponen di atas, dan oleh layar untuk tata letak
 * berulang (deret, tumpukan, teks baku) — layar tidak menulis ulang angka.
 */
export const buatG = (WARNA: Warna) =>
  StyleSheet.create({
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
      backgroundColor: WARNA.utamaIsi,
    },
    merekKotakBesar: { width: 56, height: 56 },
    merekHuruf: { fontWeight: TEBAL.ekstra, color: WARNA.teksAtasUtama },
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
    galat: { ...HURUF.xs, color: WARNA.bahayaTeks },

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
    chipAktif: { borderColor: WARNA.utamaIsi, backgroundColor: WARNA.utamaIsi },
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

/** Gaya bersama `g` untuk mode tampilan yang sedang berlaku. */
export function useG() {
  return useGaya(buatG);
}
