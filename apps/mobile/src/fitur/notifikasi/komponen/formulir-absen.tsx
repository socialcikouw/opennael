import { kasPagiSah } from "@opennael/domain";
import { useState } from "react";
import { Text, View } from "react-native";
import { tulis, useTulis } from "@/fitur/lapangan";
import { g } from "@/komponen/ui/gaya-bersama";
import { Ikon } from "@/komponen/ui/ikon";
import { Isian, IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Pilihan } from "@/komponen/ui/pilihan";
import { Tombol } from "@/komponen/ui/tombol";
import { WARNA } from "@/tema";

const ATURAN = "Minimal Rp 5.000, kelipatan Rp 5.000";
/** Sama, untuk kalimat petunjuk (huruf kecil di awal; "Rp" tetap). */
const ATURAN_KALIMAT = "minimal Rp 5.000, kelipatan Rp 5.000";

/** Kosong belum dianggap salah (baru mulai mengisi); selain itu harus sah (aturan-usaha I0). */
const galatKas = (n: number) => (n === 0 || kasPagiSah(n) ? null : ATURAN);

/**
 * Absen pagi. Masuk kerja: kas lapangan & uang jalan wajib, masing-masing
 * minimal Rp 5.000 dan kelipatan Rp 5.000 (aturan-usaha I0 — server juga
 * menolaknya). Tidak kerja: alasan wajib.
 */
export function FormulirAbsen() {
  const [absensi, setAbsensi] = useState<"masuk_kerja" | "tidak_kerja">("masuk_kerja");
  const [kasLapangan, setKasLapangan] = useState(0);
  const [uangJalan, setUangJalan] = useState(0);
  const [alasan, setAlasan] = useState("");
  const absen = useTulis(tulis.absen);

  const masuk = absensi === "masuk_kerja";
  const sah = masuk ? kasPagiSah(kasLapangan) && kasPagiSah(uangJalan) : alasan.trim() !== "";

  const simpan = () =>
    absen.mutate(masuk ? { absensi, kasLapangan, uangJalan } : { absensi, alasan: alasan.trim() });

  return (
    <Kartu>
      <View style={g.baris2}>
        <Ikon nama="clock" ukuran={18} warna={WARNA.teksKedua} />
        <Text style={g.subjudul}>Absen Pagi</Text>
      </View>
      <Pilihan
        segmen
        pilihan={[
          { nilai: "masuk_kerja", teks: "Masuk Kerja" },
          { nilai: "tidak_kerja", teks: "Tidak Kerja" },
        ]}
        nilai={absensi}
        onPilih={setAbsensi}
      />
      {masuk ? (
        <>
          <IsianUang
            label="Kas Lapangan (modal dari bos)"
            nilai={kasLapangan}
            onUbah={setKasLapangan}
            galat={galatKas(kasLapangan)}
          />
          <IsianUang
            label="Uang Jalan"
            nilai={uangJalan}
            onUbah={setUangJalan}
            galat={galatKas(uangJalan)}
          />
          <Text style={g.teksMini}>Keduanya wajib diisi · {ATURAN_KALIMAT}.</Text>
        </>
      ) : (
        <Isian
          label="Alasan"
          value={alasan}
          onChangeText={setAlasan}
          placeholder="Sakit, urusan keluarga, …"
          maxLength={100}
        />
      )}
      <PesanGalat pesan={absen.error?.message} />
      <Tombol
        judul="Simpan absen"
        ikon="circle-check"
        memuat={absen.isPending}
        nonaktif={!sah}
        onPress={simpan}
      />
    </Kartu>
  );
}
