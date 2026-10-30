import { geserTanggal } from "@opennael/domain";
import { tanggal as formatTanggal } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Undo2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { Medan } from "@/komponen/formulir";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { Bagian } from "./bagian";
import { Pesan } from "./pesan";

// ---- libur kantor -------------------------------------------------------------------

export function LiburKantor() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const sampai = geserTanggal(hariIni, 365);
  const q = useQuery({
    queryKey: ["libur-kantor", hariIni],
    queryFn: () =>
      ambil(() =>
        api.kantor["libur-kantor"].$get({
          query: { tanggalMulai: hariIni, tanggalSelesai: sampai },
        }),
      ),
  });
  const [isi, setIsi] = useState({ mulai: hariIni, selesai: "", alasan: "" });
  const [batal, setBatal] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor["libur-kantor"].$post({
          json: {
            tanggalMulai: isi.mulai,
            ...(isi.selesai ? { tanggalSelesai: isi.selesai } : {}),
            alasan: isi.alasan.trim(),
          },
        }),
      ),
    onSuccess: () => {
      setIsi({ mulai: hariIni, selesai: "", alasan: "" });
      void klien.invalidateQueries({ queryKey: ["libur-kantor"] });
    },
  });
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };
  return (
    <Bagian
      judul="Libur kantor"
      keterangan="Hari tanpa penagihan (mis. Lebaran). Hari ini atau ke depan; rentang dipecah per tanggal."
    >
      <form className="flex flex-wrap items-end gap-3" onSubmit={kirim}>
        <Medan label="Dari">
          <Input
            type="date"
            className="w-40"
            min={hariIni}
            value={isi.mulai}
            onChange={(e) => setIsi({ ...isi, mulai: e.target.value || hariIni })}
          />
        </Medan>
        <Medan label="Sampai (opsional)">
          <Input
            type="date"
            className="w-40"
            min={isi.mulai}
            value={isi.selesai}
            onChange={(e) => setIsi({ ...isi, selesai: e.target.value })}
          />
        </Medan>
        <Medan label="Alasan" className="min-w-48 flex-1">
          <Input
            value={isi.alasan}
            maxLength={100}
            onChange={(e) => setIsi({ ...isi, alasan: e.target.value })}
          />
        </Medan>
        <Button type="submit" disabled={m.isPending || isi.alasan.trim() === ""}>
          <Plus />
          Tetapkan libur
        </Button>
      </form>
      <Pesan
        ok={
          m.data
            ? `Ditambah ${m.data.ditambah.length} hari${m.data.dilewati.length ? `, ${m.data.dilewati.length} sudah ada` : ""}`
            : null
        }
        galat={m.error?.message}
      />
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} />
      ) : q.data.length === 0 ? (
        <Kosong>Tidak ada libur kantor setahun ke depan</Kosong>
      ) : (
        <ul className="divide-y text-sm">
          {q.data.map((l) => (
            <li key={l.tanggal} className="flex items-center justify-between gap-2 py-1.5">
              <span>
                {formatTanggal(l.tanggal)}{" "}
                <span className="text-muted-foreground">· {l.alasan}</span>
              </span>
              {l.tanggal > hariIni ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Batalkan libur"
                  aria-label={`Batalkan libur ${formatTanggal(l.tanggal)}`}
                  className="text-red-700"
                  onClick={() => setBatal(l.tanggal)}
                >
                  <Undo2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {batal ? (
        <DialogBatal
          judul={`Batalkan libur ${formatTanggal(batal)}?`}
          keterangan="Hari itu kembali menjadi hari tagih."
          segarkan={[["libur-kantor"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kantor["libur-kantor"][":tanggal"].batal.$post({
                param: { tanggal: batal },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </Bagian>
  );
}
