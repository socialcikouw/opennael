import type { KartuPinjaman } from "@opennael/contracts";
import { LABEL_JENIS, namaTenor, rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { useMemo } from "react";
import { PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KartuAngka, KepalaHalaman, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { ambil, api } from "@/lib/api";
import { LABEL_STATUS } from "@/lib/status-pinjaman";
import { DialogPinjaman } from "./nasabah-pinjaman";

const rute = getRouteApi("/bos/pinjaman");

/** Server membatasi 500 kartu per permintaan. */
const BATAS_SERVER = 500;

const k = pembantuKolom<KartuPinjaman>();
const KOLOM = [
  k.accessor((p) => p.nasabah.nama, {
    id: "nasabah",
    header: "Nasabah",
    cell: (c) => (
      <span>
        <span className="block font-medium">{c.getValue()}</span>
        <span className="block text-xs text-muted-foreground">
          {c.row.original.nasabah.kampung}
        </span>
      </span>
    ),
  }),
  k.accessor((p) => p.kolektor.nama, { id: "pemegang", header: "Pemegang" }),
  k.accessor("pinjamanKe", {
    header: "Pinjaman",
    cell: (c) => {
      const p = c.row.original;
      return `ke-${p.pinjamanKe} · ${LABEL_JENIS[p.jenis]} ${namaTenor(p.jenis, p.tenor)}`;
    },
  }),
  k.accessor("status", {
    header: "Status",
    cell: (c) => {
      const s = LABEL_STATUS[c.getValue()];
      return <Badge variant={s.nada}>{s.label}</Badge>;
    },
  }),
  k.accessor("saldo", {
    header: "Saldo",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
  }),
  k.accessor((p) => p.tagih?.tunggakan ?? 0, {
    id: "tunggakan",
    header: "Tunggakan (B5)",
    meta: { kanan: true },
    cell: (c) => {
      const t = c.row.original.tagih;
      if (!t || t.tertinggal === 0) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="text-amber-800">
          {c.row.original.jenis === "tempoan" ? "lewat tempo" : `${t.tertinggal}×`} ·{" "}
          {rupiah(t.tunggakan)}
        </span>
      );
    },
  }),
  k.accessor((p) => (p.kunciGulung?.gulung ? 2 : p.kunciGulung?.naik ? 1 : 0), {
    id: "kunci",
    header: "Rem",
    cell: (c) =>
      c.getValue() === 2 ? (
        <Badge variant="outline">Gulung dikunci</Badge>
      ) : c.getValue() === 1 ? (
        <Badge variant="outline">Naik dikunci</Badge>
      ) : null,
  }),
] as Kolom<KartuPinjaman>[];

/** Portofolio pinjaman: siapa tertinggal berapa, rem yang berlaku, rincian per pinjaman. */
export function LayarPinjaman() {
  const { kolektor, status, tunggak, pilih } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const saring = status ?? "aktif";
  const q = useQuery({
    queryKey: ["pinjaman", "daftar", saring, kolektor ?? null],
    queryFn: () =>
      ambil(() =>
        api.pinjaman.$get({
          query: { status: saring, ...(kolektor ? { kolektorId: kolektor } : {}) },
        }),
      ),
    placeholderData: (lama) => lama,
  });
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const data = useMemo(
    () => (q.data ?? []).filter((p) => tunggak !== "ya" || (p.tagih?.tertinggal ?? 0) > 0),
    [q.data, tunggak],
  );
  const menunggak = (q.data ?? []).filter((p) => (p.tagih?.tertinggal ?? 0) > 0);
  const dipilih = q.data?.find((p) => p.id === pilih);
  const ubah = (s: {
    kolektor?: string;
    status?: "selesai" | "semua";
    tunggak?: "ya";
    pilih?: string;
  }) => void navigasi({ search: (x) => ({ ...x, ...s }) });

  return (
    <>
      <KepalaHalaman
        judul="Pinjaman"
        keterangan="Tunggakan dihitung dari angsuran yang sudah terbayar dibanding jadwal tagih sampai kemarin. Ketuk baris untuk rincian dan aturan macet."
      />
      {saring === "aktif" && q.data ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <KartuAngka label="Pinjaman aktif" nilai={q.data.length} />
          <KartuAngka label="Total saldo" nilai={rupiah(q.data.reduce((s, p) => s + p.saldo, 0))} />
          <KartuAngka
            label="Total tunggakan"
            nilai={rupiah(menunggak.reduce((s, p) => s + (p.tagih?.tunggakan ?? 0), 0))}
            catatan={`${menunggak.length} pinjaman menunggak`}
            nada={menunggak.length > 0 ? "buruk" : undefined}
          />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <PilihanAsli
          className="w-52"
          aria-label="Saring pemegang"
          value={kolektor ?? ""}
          onChange={(e) => ubah({ kolektor: e.target.value || undefined })}
        >
          <option value="">Semua kolektor</option>
          {(kolektorQ.data ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.nama}
            </option>
          ))}
        </PilihanAsli>
        <PilihanAsli
          className="w-44"
          aria-label="Saring status"
          value={saring}
          onChange={(e) =>
            ubah({
              status:
                e.target.value === "aktif" ? undefined : (e.target.value as "selesai" | "semua"),
            })
          }
        >
          <option value="aktif">Aktif</option>
          <option value="selesai">Selesai</option>
          <option value="semua">Semua</option>
        </PilihanAsli>
        {saring === "aktif" ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={tunggak === "ya"}
              onChange={(e) => ubah({ tunggak: e.target.checked ? "ya" : undefined })}
            />
            Hanya yang menunggak
          </label>
        ) : null}
      </div>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <>
          <TabelData
            kolom={KOLOM}
            data={data}
            idBaris={(p) => p.id}
            pilihBaris={(p) => ubah({ pilih: p.id })}
            kosong={tunggak === "ya" ? "Tidak ada yang menunggak" : "Belum ada pinjaman"}
          />
          {q.data.length >= BATAS_SERVER ? (
            <p className="text-xs text-muted-foreground">
              Hanya {BATAS_SERVER} pinjaman pertama yang tampil — saring per kolektor.
            </p>
          ) : null}
        </>
      )}
      {dipilih ? (
        <DialogPinjaman
          id={dipilih.id}
          nasabahId={dipilih.nasabah.id}
          tutup={() => ubah({ pilih: undefined })}
        />
      ) : null}
    </>
  );
}
