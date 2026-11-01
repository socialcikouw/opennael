import { kasPagiSah } from "@opennael/domain";
import { useState } from "react";
import { Text } from "react-native";
import { tulis, useTulis } from "@/fitur/lapangan";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Isian, IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Pilihan } from "@/komponen/ui/pilihan";
import { Tombol } from "@/komponen/ui/tombol";

const ATURAN = "Minimal Rp 5.000, kelipatan Rp 5.000";

/** Kosong belum dianggap salah (baru mulai mengisi); selain itu harus sah (aturan-usaha I0). */
const galatKas = (n: number) => (n === 0 || kasPagiSah(n) ? null : ATURAN);

/**
 * Absen pagi. Masuk kerja: kas lapangan & uang jalan wajib, masing-masing
 * minimal Rp 5.000 dan kelipatan Rp 5.000 (aturan-usaha I0 — server juga
 * menolaknya). Tidak kerja: alasan wajib.
 */
export function FormulirAbsen() {
  const g = useG();
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
      <Text style={g.subjudul}>Absen pagi</Text>
      <Pilihan
        segmen
        pilihan={[
          { nilai: "masuk_kerja", teks: "Masuk kerja" },
          { nilai: "tidak_kerja", teks: "Tidak kerja" },
        ]}
        nilai={absensi}
        onPilih={setAbsensi}
      />
      {masuk ? (
        <>
          <IsianUang
            label="Kas lapangan (modal dari bos)"
            nilai={kasLapangan}
            onUbah={setKasLapangan}
            galat={galatKas(kasLapangan)}
          />
          <IsianUang
            label="Uang jalan"
            nilai={uangJalan}
            onUbah={setUangJalan}
            galat={galatKas(uangJalan)}
          />
          <Text style={g.teksMini}>Keduanya wajib diisi · {ATURAN.toLowerCase()}.</Text>
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
