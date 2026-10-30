import { waktu } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Unplug } from "lucide-react";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { ambilPerangkat, type Karyawan, type Perangkat } from "../data";

const LABEL_PLATFORM = { android: "Android", ios: "iPhone", web: "Browser" } as const;

const LABEL_PUTUS: Record<NonNullable<Perangkat["diputus"]>["alasan"], string> = {
  keluar: "keluar sendiri",
  diputus: "diputus",
  ganti_sandi: "sandi diganti",
  tautan_baru: "HP baru ditautkan",
  dinonaktifkan: "akun dinonaktifkan",
  pakai_ulang: "token dipakai ulang",
  kedaluwarsa: "kedaluwarsa",
};

/** HP / browser satu karyawan: yang tertaut, riwayatnya, dan memutus. */
export function DialogPerangkat({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const kantor = useKantor();
  const klien = useQueryClient();
  const [riwayat, setRiwayat] = useState(false);
  const [putus, setPutus] = useState<Perangkat | null>(null);
  const q = useQuery({ queryKey: ["perangkat", riwayat], queryFn: () => ambilPerangkat(riwayat) });
  const m = useMutation({
    mutationFn: (id: string) =>
      ambil(() => api.identitas.auth.perangkat[":id"].$delete({ param: { id } })),
    onSuccess: () => {
      for (const k of [["perangkat"], ["pengguna"]]) void klien.invalidateQueries({ queryKey: k });
      setPutus(null);
    },
  });
  const milik = (q.data ?? []).filter((p) => p.pengguna.id === orang.id);
  return (
    <>
      <DialogFormulir
        judul={`Perangkat ${orang.nama}`}
        keterangan="HP atau browser yang sedang masuk dengan akun ini."
        buka
        ubahBuka={(b) => !b && tutup()}
        kirim={tutup}
        memuat={false}
        labelKirim="Tutup"
        lebar
      >
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={riwayat}
            onChange={(e) => setRiwayat(e.target.checked)}
          />
          Tampilkan yang sudah diputus
        </label>
        {q.isPending ? (
          <Memuat />
        ) : q.isError ? (
          <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
        ) : milik.length === 0 ? (
          <Kosong>{riwayat ? "Belum pernah masuk" : "Tidak ada perangkat yang tertaut"}</Kosong>
        ) : (
          <ul className="divide-y text-sm">
            {milik.map((p) => (
              <li key={p.id} className="flex items-start gap-3 py-2.5">
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-2 font-medium">
                    {p.nama ?? (p.platform ? LABEL_PLATFORM[p.platform] : "Perangkat")}
                    {p.platform ? (
                      <Badge variant="secondary">{LABEL_PLATFORM[p.platform]}</Badge>
                    ) : null}
                    {p.sedangDipakai ? <Badge variant="success">Perangkat ini</Badge> : null}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {p.diputus
                      ? `Diputus ${waktu(p.diputus.at, kantor.zonaWaktu)} · ${LABEL_PUTUS[p.diputus.alasan]}${p.diputus.oleh ? ` oleh ${p.diputus.oleh.nama}` : ""}`
                      : `Terakhir aktif ${waktu(p.terakhirAktifAt, kantor.zonaWaktu)} · tertaut sejak ${waktu(p.dibuatAt, kantor.zonaWaktu)}`}
                  </span>
                </span>
                {!p.diputus && !p.sedangDipakai ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-700 hover:text-red-800"
                    onClick={() => setPutus(p)}
                  >
                    <Unplug />
                    Putus
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DialogFormulir>
      {putus ? (
        <DialogFormulir
          judul="Putus perangkat ini?"
          keterangan={
            orang.peran === "bos"
              ? "Browser itu harus masuk lagi dengan nomor HP dan kata sandi."
              : "HP itu harus ditautkan ulang lewat QR. Yang sedang terbuka tetap tersambung paling lama 15 menit."
          }
          buka
          ubahBuka={(b) => !b && setPutus(null)}
          kirim={() => m.mutate(putus.id)}
          memuat={m.isPending}
          galat={m.error?.message}
          labelKirim="Putus"
          bahaya
        />
      ) : null}
    </>
  );
}
