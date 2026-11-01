import type { KartuTagih } from "@opennael/contracts";
import { tolakLibur } from "@opennael/domain";
import { router } from "expo-router";
import { useState } from "react";
import { Isian, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { tulis, useTulis } from "../data";

/**
 * Libur dari rincian pinjaman (harian & mingguan). Boleh-tidaknya memakai aturan
 * yang sama dengan tombol Libur di kartu dan server (G2–G3, `tolakLibur`).
 */
export function PanelLibur({ p, tanggal }: { p: KartuTagih; tanggal: string }) {
  const [alasan, setAlasan] = useState("");
  const libur = useTulis(tulis.libur);
  const tolak = tolakLibur(p, tanggal);

  return (
    <Kartu>
      {tolak ? (
        <Keterangan>
          BELUM BISA LIBUR, {tolak.pesan.charAt(0).toLowerCase()}
          {tolak.pesan.slice(1)}.
        </Keterangan>
      ) : (
        <Isian
          label="Alasan (boleh kosong)"
          value={alasan}
          onChangeText={setAlasan}
          placeholder="Sakit, tidak di rumah, …"
          maxLength={100}
        />
      )}
      <PesanGalat pesan={libur.error?.message} />
      <Tombol
        judul="Catat libur hari ini"
        ikon="moon"
        memuat={libur.isPending}
        nonaktif={tolak !== null}
        onPress={() =>
          libur.mutate(
            { pinjamanId: p.id, ...(alasan.trim() ? { alasan: alasan.trim() } : {}) },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Kartu>
  );
}
