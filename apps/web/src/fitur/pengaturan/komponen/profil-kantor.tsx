import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { sesi } from "@/lib/sesi";
import { ambilKantor } from "../data";
import { Bagian } from "./bagian";
import { Pesan } from "./pesan";

export function ProfilKantor() {
  const klien = useQueryClient();
  const q = useQuery({ queryKey: ["kantor"], queryFn: ambilKantor });
  const [isi, setIsi] = useState<{
    nama: string;
    zonaWaktu: "WIB" | "WITA" | "WIT";
    jamBuka: string;
    jamTutup: string;
  } | null>(null);
  useEffect(() => {
    if (q.data && !isi) {
      setIsi({
        nama: q.data.nama,
        zonaWaktu: q.data.zonaWaktu,
        jamBuka: q.data.jamBuka.slice(0, 5),
        jamTutup: q.data.jamTutup.slice(0, 5),
      });
    }
  }, [q.data, isi]);
  const m = useMutation({
    mutationFn: async () => {
      if (!isi || !q.data) throw new Error("Data kantor belum dimuat");
      const ubah = {
        ...(isi.nama.trim() !== q.data.nama ? { nama: isi.nama.trim() } : {}),
        ...(isi.zonaWaktu !== q.data.zonaWaktu ? { zonaWaktu: isi.zonaWaktu } : {}),
        ...(isi.jamBuka !== q.data.jamBuka.slice(0, 5) ? { jamBuka: isi.jamBuka } : {}),
        ...(isi.jamTutup !== q.data.jamTutup.slice(0, 5) ? { jamTutup: isi.jamTutup } : {}),
      };
      const hasil = await ambil(() => api.kantor.kantor.$patch({ json: ubah }));
      // Nama & zona kantor juga tersimpan di sesi (menu & jam tampilan).
      const s = sesi.ambil();
      if (s) {
        sesi.simpan({
          ...s,
          pengguna: {
            ...s.pengguna,
            kantor: { ...s.pengguna.kantor, nama: hasil.nama, zonaWaktu: hasil.zonaWaktu },
          },
        });
      }
      return hasil;
    },
    onSuccess: () => void klien.invalidateQueries({ queryKey: ["kantor"] }),
  });
  if (q.isPending || !isi) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <Bagian
      judul="Profil kantor"
      keterangan="Jam kerja membatasi kapan kolektor bisa mencatat di lapangan. Zona waktu menentukan tanggal pembukuan."
    >
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Isian
          label="Nama kantor"
          value={isi.nama}
          maxLength={100}
          onChange={(e) => setIsi({ ...isi, nama: e.target.value })}
        />
        <Medan label="Zona waktu">
          <PilihanAsli
            value={isi.zonaWaktu}
            onChange={(e) => setIsi({ ...isi, zonaWaktu: e.target.value as typeof isi.zonaWaktu })}
          >
            <option value="WIB">WIB (UTC+7)</option>
            <option value="WITA">WITA (UTC+8)</option>
            <option value="WIT">WIT (UTC+9)</option>
          </PilihanAsli>
        </Medan>
        <div className="grid grid-cols-2 gap-3">
          <Isian
            label="Jam buka"
            placeholder="07:00"
            pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
            value={isi.jamBuka}
            onChange={(e) => setIsi({ ...isi, jamBuka: e.target.value })}
          />
          <Isian
            label="Jam tutup"
            placeholder="24:00"
            pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$"
            petunjuk="24:00 = tengah malam"
            value={isi.jamTutup}
            onChange={(e) => setIsi({ ...isi, jamTutup: e.target.value })}
          />
        </div>
        <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
        <Button type="submit" className="w-fit" disabled={m.isPending}>
          {m.isPending ? "Menyimpan…" : "Simpan profil"}
        </Button>
      </form>
    </Bagian>
  );
}
