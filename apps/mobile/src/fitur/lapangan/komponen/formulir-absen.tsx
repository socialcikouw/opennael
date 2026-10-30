import { useState } from "react";
import { Text } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Isian, IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Pilihan } from "@/komponen/ui/pilihan";
import { Tombol } from "@/komponen/ui/tombol";
import { tulis, useTulis } from "../data";

export function FormulirAbsen() {
  const g = useG();
  const [absensi, setAbsensi] = useState<"masuk_kerja" | "tidak_kerja">("masuk_kerja");
  const [kasLapangan, setKasLapangan] = useState(0);
  const [uangJalan, setUangJalan] = useState(0);
  const [alasan, setAlasan] = useState("");
  const absen = useTulis(tulis.absen);

  const simpan = () =>
    absen.mutate(
      absensi === "masuk_kerja"
        ? { absensi, kasLapangan, uangJalan }
        : { absensi, alasan: alasan.trim() },
    );

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
      {absensi === "masuk_kerja" ? (
        <>
          <IsianUang
            label="Kas lapangan (modal dari bos)"
            nilai={kasLapangan}
            onUbah={setKasLapangan}
          />
          <IsianUang label="Uang jalan" nilai={uangJalan} onUbah={setUangJalan} />
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
        nonaktif={absensi === "tidak_kerja" && !alasan.trim()}
        onPress={simpan}
      />
    </Kartu>
  );
}
