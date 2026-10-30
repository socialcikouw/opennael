import type { NasabahJawaban } from "@opennael/contracts";
import { rupiah } from "@opennael/format";
import { useQuery } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { BookCopy, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KepalaHalaman, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { DialogNasabah } from "./nasabah-detail";

const rute = getRouteApi("/bos/nasabah");

/** Server membatasi 200 baris per permintaan — pakai pencarian untuk sisanya. */
const BATAS_SERVER = 200;

const k = pembantuKolom<NasabahJawaban>();
const KOLOM = [
  k.accessor("nama", {
    header: "Nama",
    cell: (c) => <span className="font-medium">{c.getValue()}</span>,
  }),
  k.accessor((n) => n.kampung.nama, { id: "kampung", header: "Kampung" }),
  k.accessor((n) => n.kolektor?.nama ?? "—", { id: "pemegang", header: "Pemegang" }),
  k.accessor((n) => n.pinjamanAktif?.saldo ?? 0, {
    id: "pinjaman",
    header: "Pinjaman aktif",
    meta: { kanan: true },
    cell: (c) => {
      const p = c.row.original.pinjamanAktif;
      if (!p) return <span className="text-muted-foreground">—</span>;
      return (
        <span className="inline-flex items-center gap-2">
          {p.status === "macet" ? <Badge variant="warning">Macet</Badge> : null}
          {rupiah(p.saldo)}
        </span>
      );
    },
  }),
  k.accessor((n) => n.saldoTabungan ?? 0, {
    id: "tabungan",
    header: "Tabungan",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
  }),
  k.accessor((n) => n.diblokir ?? false, {
    id: "status",
    header: "Status",
    cell: (c) => (c.getValue() ? <Badge variant="destructive">Diblokir</Badge> : null),
  }),
] as Kolom<NasabahJawaban>[];

/** Teks yang berhenti diketik 300 ms — pencarian ke server. */
function useTenang(nilai: string, ms = 300) {
  const [tenang, setTenang] = useState(nilai);
  useEffect(() => {
    const t = setTimeout(() => setTenang(nilai), ms);
    return () => clearTimeout(t);
  }, [nilai, ms]);
  return tenang;
}

/** Daftar & cari nasabah; ketuk baris untuk rincian dan aksi bos. */
export function LayarNasabah() {
  const { cari, kolektor, pilih } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const [ketikan, setKetikan] = useState(cari ?? "");
  const cariTenang = useTenang(ketikan.trim());

  useEffect(() => {
    if ((cari ?? "") !== cariTenang) {
      void navigasi({ search: (s) => ({ ...s, cari: cariTenang || undefined }), replace: true });
    }
  }, [cariTenang, cari, navigasi]);

  const daftar = useQuery({
    queryKey: ["nasabah", "daftar", cari ?? null, kolektor ?? null],
    queryFn: () =>
      ambil(() =>
        api.nasabah.$get({
          query: { ...(cari ? { cari } : {}), ...(kolektor ? { kolektorId: kolektor } : {}) },
        }),
      ),
    placeholderData: (lama) => lama,
  });
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const semuaKolektor = useMemo(
    () => (kolektorQ.data ?? []).map((o) => ({ id: o.id, nama: o.nama })),
    [kolektorQ.data],
  );
  const kampungQ = useQuery({
    queryKey: ["wilayah"],
    queryFn: () => ambil(() => api.wilayah.$get({ query: {} })),
  });
  const kampung = useMemo(() => (kampungQ.data ?? []).map((w) => w.nama), [kampungQ.data]);
  const dipilih = daftar.data?.find((n) => n.id === pilih);
  const ubahPilih = (id: string | undefined) =>
    void navigasi({ search: (s) => ({ ...s, pilih: id }) });

  return (
    <>
      <KepalaHalaman
        judul="Nasabah"
        keterangan="Cari nama, lalu ketuk baris untuk rincian, tabungan, pemutihan, dan aksi lain."
        aksi={
          <Button asChild>
            <Link to="/nasabah/salin">
              <BookCopy />
              Salin dari buku
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Cari nama nasabah…"
            className="pl-9"
            value={ketikan}
            maxLength={50}
            onChange={(e) => setKetikan(e.target.value)}
          />
        </div>
        <PilihanAsli
          className="w-52"
          aria-label="Saring pemegang"
          value={kolektor ?? ""}
          onChange={(e) =>
            void navigasi({ search: (s) => ({ ...s, kolektor: e.target.value || undefined }) })
          }
        >
          <option value="">Semua kolektor</option>
          {semuaKolektor.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nama}
            </option>
          ))}
        </PilihanAsli>
      </div>
      {daftar.isPending ? (
        <Memuat />
      ) : daftar.isError ? (
        <GalatMuat galat={daftar.error} ulangi={() => void daftar.refetch()} />
      ) : (
        <>
          <TabelData
            kolom={KOLOM}
            data={daftar.data}
            idBaris={(n) => n.id}
            pilihBaris={(n) => ubahPilih(n.id)}
            kosong={cari ? `Tidak ada nasabah bernama "${cari}"` : "Belum ada nasabah"}
          />
          <p className="text-xs text-muted-foreground">
            {daftar.data.length} nasabah
            {daftar.data.length >= BATAS_SERVER
              ? ` — hanya ${BATAS_SERVER} pertama yang tampil; persempit dengan pencarian.`
              : ""}
          </p>
        </>
      )}
      {dipilih ? (
        <DialogNasabah
          n={dipilih}
          kolektor={semuaKolektor}
          kampung={kampung}
          tutup={() => ubahPilih(undefined)}
        />
      ) : null}
    </>
  );
}
