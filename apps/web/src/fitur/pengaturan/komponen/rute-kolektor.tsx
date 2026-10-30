import { waktu } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useKantor } from "@/lib/kantor";
import { Bagian } from "./bagian";
import { Pesan } from "./pesan";

// ---- rute kolektor ------------------------------------------------------------------

export function RuteKolektor() {
  const kantor = useKantor();
  const klien = useQueryClient();
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const [kolektorId, setKolektorId] = useState("");
  const pilih = kolektorId || kolektorQ.data?.[0]?.id || "";
  const q = useQuery({
    queryKey: ["rute-kolektor", pilih],
    queryFn: () =>
      ambil(() => api.hariKolektor["rute-kolektor"].$get({ query: { kolektorId: pilih } })),
    enabled: pilih !== "",
  });
  const [urutan, setUrutan] = useState<string[] | null>(null);
  const [baru, setBaru] = useState("");
  const daftar = urutan ?? q.data?.urutan.map((u) => u.nama) ?? [];
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.hariKolektor["rute-kolektor"].$put({
          json: {
            kolektorId: pilih,
            urutan: daftar.map((nama) => ({ nama })),
            versi: q.data?.versi ?? 0,
          },
        }),
      ),
    onSuccess: () => {
      setUrutan(null);
      void klien.invalidateQueries({ queryKey: ["rute-kolektor", pilih] });
    },
  });
  const geser = (i: number, arah: -1 | 1) => {
    const d = [...daftar];
    const j = i + arah;
    const a = d[i];
    const b = d[j];
    if (a === undefined || b === undefined) return;
    d[i] = b;
    d[j] = a;
    setUrutan(d);
  };
  const tambah = (e: FormEvent) => {
    e.preventDefault();
    const nama = baru.trim();
    if (!nama || daftar.some((x) => x.toLowerCase() === nama.toLowerCase())) return;
    setUrutan([...daftar, nama]);
    setBaru("");
  };

  return (
    <Bagian
      judul="Rute kolektor"
      keterangan="Urutan kampung yang didatangi; kartu tagihan di HP kolektor mengikutinya. Kolektor juga bisa mengaturnya sendiri."
    >
      <PilihanAsli
        className="w-56"
        value={pilih}
        onChange={(e) => {
          setKolektorId(e.target.value);
          setUrutan(null);
          m.reset();
        }}
      >
        {(kolektorQ.data ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.nama}
          </option>
        ))}
      </PilihanAsli>
      {!pilih ? (
        <Kosong>Belum ada kolektor</Kosong>
      ) : q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} />
      ) : (
        <div className="max-w-md space-y-3">
          {daftar.length === 0 ? <Kosong>Rute belum diatur</Kosong> : null}
          <ol className="space-y-1">
            {daftar.map((nama, i) => (
              <li
                key={nama}
                className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm"
              >
                <span className="w-6 text-muted-foreground tabular-nums">{i + 1}.</span>
                <span className="flex-1">{nama}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Naikkan ${nama}`}
                  disabled={i === 0}
                  onClick={() => geser(i, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Turunkan ${nama}`}
                  disabled={i === daftar.length - 1}
                  onClick={() => geser(i, 1)}
                >
                  <ArrowDown />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Hapus ${nama}`}
                  className="text-red-700"
                  onClick={() => setUrutan(daftar.filter((x) => x !== nama))}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ol>
          <form className="flex gap-2" onSubmit={tambah}>
            <Input
              placeholder="Tambah kampung…"
              value={baru}
              maxLength={50}
              onChange={(e) => setBaru(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={baru.trim() === ""}>
              <Plus />
              Tambah
            </Button>
          </form>
          <Pesan ok={m.isSuccess ? "Rute tersimpan" : null} galat={m.error?.message} />
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={m.isPending || urutan === null} onClick={() => m.mutate()}>
              {m.isPending ? "Menyimpan…" : "Simpan rute"}
            </Button>
            {urutan !== null ? (
              <Button variant="ghost" onClick={() => setUrutan(null)}>
                Urungkan
              </Button>
            ) : null}
            {q.data.diubahOleh && q.data.diubahAt ? (
              <span className="text-xs text-muted-foreground">
                Terakhir diubah {q.data.diubahOleh.nama} ·{" "}
                {waktu(q.data.diubahAt, kantor.zonaWaktu)}
              </span>
            ) : null}
          </div>
        </div>
      )}
    </Bagian>
  );
}
