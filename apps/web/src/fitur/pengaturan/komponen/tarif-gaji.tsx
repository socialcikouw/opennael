import { tanggal as formatTanggal, persen } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Medan, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { Bagian } from "./bagian";
import { Pesan } from "./pesan";

// ---- tarif gaji ---------------------------------------------------------------------

export function TarifGaji() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const q = useQuery({
    queryKey: ["tarif-gaji"],
    queryFn: () => ambil(() => api.penggajian["tarif-gaji"].$get()),
  });
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const [isi, setIsi] = useState({ kolektorId: "", persen: "", mulai: hariIni });
  const persenAngka = Number(isi.persen.replace(",", "."));
  const sah =
    (isi.persen.trim() === "" && isi.kolektorId !== "") ||
    (isi.persen.trim() !== "" &&
      Number.isFinite(persenAngka) &&
      persenAngka >= 0 &&
      persenAngka <= 100);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.penggajian["tarif-gaji"].$put({
          json: {
            ...(isi.kolektorId ? { kolektorId: isi.kolektorId } : {}),
            tarifBp: isi.persen.trim() === "" ? null : Math.round(persenAngka * 100),
            berlakuMulai: isi.mulai,
          },
        }),
      ),
    onSuccess: () => {
      setIsi({ kolektorId: "", persen: "", mulai: hariIni });
      void klien.invalidateQueries({ queryKey: ["tarif-gaji"] });
      void klien.invalidateQueries({ queryKey: ["gaji"] });
    },
  });
  return (
    <Bagian
      judul="Tarif gaji"
      keterangan="Persen dari storting harian. Tarif khusus kolektor menimpa tarif kantor; kosongkan persen untuk kembali ikut tarif kantor."
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Medan label="Untuk">
          <PilihanAsli
            className="w-48"
            value={isi.kolektorId}
            onChange={(e) => setIsi({ ...isi, kolektorId: e.target.value })}
          >
            <option value="">Seluruh kantor</option>
            {(kolektorQ.data ?? []).map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama}
              </option>
            ))}
          </PilihanAsli>
        </Medan>
        <Medan label="Tarif (%)">
          <Input
            inputMode="decimal"
            className="w-28"
            placeholder={isi.kolektorId ? "ikut kantor" : "3"}
            value={isi.persen}
            onChange={(e) => setIsi({ ...isi, persen: e.target.value })}
          />
        </Medan>
        <Medan label="Berlaku mulai">
          <Input
            type="date"
            className="w-40"
            min={hariIni}
            value={isi.mulai}
            onChange={(e) => setIsi({ ...isi, mulai: e.target.value || hariIni })}
          />
        </Medan>
        <Button type="submit" disabled={m.isPending || !sah}>
          Simpan tarif
        </Button>
      </form>
      <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} />
      ) : (
        <ul className="divide-y text-sm">
          {q.data.map((t) => (
            <li key={t.id} className="flex flex-wrap justify-between gap-2 py-1.5">
              <span>
                {t.kolektor?.nama ?? "Seluruh kantor"}{" "}
                <span className="text-muted-foreground">
                  · mulai {formatTanggal(t.berlakuMulai, "tanpa")}
                </span>
              </span>
              <span className="font-medium tabular-nums">
                {t.tarifBp === null ? "ikut kantor" : persen(t.tarifBp / 100)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Bagian>
  );
}
