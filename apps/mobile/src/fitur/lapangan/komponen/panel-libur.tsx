import type { KartuTagih } from "@opennael/contracts";
import { router } from "expo-router";
import { useState } from "react";
import { Isian, PesanGalat } from "@/komponen/ui/isian";
import { Kartu } from "@/komponen/ui/kartu";
import { Keterangan } from "@/komponen/ui/teks";
import { Tombol } from "@/komponen/ui/tombol";
import { tulis, useTulis } from "../data";

export function PanelLibur({ p }: { p: KartuTagih }) {
  const [alasan, setAlasan] = useState("");
  const libur = useTulis(tulis.libur);
  // G3: angsuran terbayar baru 0 atau 1 belum boleh libur (server juga menolak).
  const belumBoleh = p.angsuranKe < 2;

  return (
    <Kartu>
      {belumBoleh ? (
        <Keterangan>Belum boleh libur: angsuran terbayar baru {p.angsuranKe}.</Keterangan>
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
        nonaktif={belumBoleh}
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
