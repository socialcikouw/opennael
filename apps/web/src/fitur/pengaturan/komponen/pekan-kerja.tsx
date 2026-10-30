import { tanggal as formatTanggal } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Medan } from "@/komponen/formulir";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { ambilKantor } from "../data";
import { Bagian } from "./bagian";
import { Pesan } from "./pesan";

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** Urutan tampil Senin dulu. */
const URUT_HARI = [1, 2, 3, 4, 5, 6, 0];

const daftarHari = (h: number[]) =>
  URUT_HARI.filter((x) => h.includes(x))
    .map((x) => NAMA_HARI[x]?.slice(0, 3))
    .join(", ");

export function PekanKerja() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const kantor = useQuery({ queryKey: ["kantor"], queryFn: ambilKantor });
  const riwayat = useQuery({
    queryKey: ["kantor", "pekan-kerja"],
    queryFn: () => ambil(() => api.kantor.kantor["pekan-kerja"].$get()),
  });
  const [hari, setHari] = useState<number[] | null>(null);
  const [mulai, setMulai] = useState(hariIni);
  const pilihan = hari ?? kantor.data?.hariKerja ?? [];
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor.kantor["pekan-kerja"].$put({
          json: { hariKerja: pilihan, berlakuMulai: mulai },
        }),
      ),
    onSuccess: () => {
      setHari(null);
      void klien.invalidateQueries({ queryKey: ["kantor"] });
    },
  });
  return (
    <Bagian
      judul="Pekan kerja"
      keterangan="Hari kantor menagih. Perubahan berlaku mulai tanggal yang dipilih — tidak boleh mundur."
    >
      <div className="flex flex-wrap gap-2">
        {URUT_HARI.map((h) => {
          const aktif = pilihan.includes(h);
          return (
            <Button
              key={h}
              size="sm"
              variant={aktif ? "default" : "outline"}
              aria-pressed={aktif}
              onClick={() =>
                setHari(aktif ? pilihan.filter((x) => x !== h) : [...pilihan, h].sort())
              }
            >
              {NAMA_HARI[h]}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Medan label="Berlaku mulai">
          <Input
            type="date"
            className="w-44"
            min={hariIni}
            value={mulai}
            onChange={(e) => setMulai(e.target.value || hariIni)}
          />
        </Medan>
        <Button
          disabled={m.isPending || hari === null || pilihan.length === 0}
          onClick={() => m.mutate()}
        >
          {m.isPending ? "Menyimpan…" : "Simpan pekan kerja"}
        </Button>
      </div>
      <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
      {riwayat.data && riwayat.data.length > 0 ? (
        <ul className="divide-y text-sm">
          {riwayat.data.map((p) => (
            <li key={p.berlakuMulai} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                Mulai {formatTanggal(p.berlakuMulai)}
                {p.berlakuMulai > hariIni ? (
                  <Badge variant="warning" className="ml-2">
                    Akan datang
                  </Badge>
                ) : null}
              </span>
              <span className="text-muted-foreground">
                {daftarHari(p.hariKerja)} · {p.dibuatOleh.nama}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Bagian>
  );
}
