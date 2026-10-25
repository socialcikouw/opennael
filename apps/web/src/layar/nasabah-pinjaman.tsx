import type { KartuPinjaman, Peristiwa, RincianPinjaman } from "@opennael/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, ListOrdered, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { BarisNilai, GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { ambil, api } from "@/lib/api";
import {
  tanggal as formatTanggal,
  LABEL_JENIS,
  LABEL_PERISTIWA,
  LABEL_STATUS,
  namaTenor,
  rupiah,
  waktu,
} from "@/lib/format";
import { useHariIni, useKantor } from "@/lib/kantor";
import { DialogRiwayat } from "./aktivitas";

/**
 * BUKU NASABAH di rincian nasabah — semua pinjaman (kartu dengan posisi tagih
 * & kunci gulung) dan semua peristiwa berlaku. Satu kueri `GET /nasabah/:id/buku`
 * dipakai kedua tab.
 */

const kunciBuku = (id: string) => ["nasabah", "buku", id];

function useBuku(nasabahId: string) {
  return useQuery({
    queryKey: kunciBuku(nasabahId),
    queryFn: () => ambil(() => api.nasabah[":id"].buku.$get({ param: { id: nasabahId } })),
  });
}

const judulPinjaman = (p: { pinjamanKe: number; jenis: KartuPinjaman["jenis"]; tenor: number }) =>
  `Pinjaman ke-${p.pinjamanKe} · ${LABEL_JENIS[p.jenis]} ${namaTenor(p.jenis, p.tenor)}`;

function LencanaStatus({ status }: { status: KartuPinjaman["status"] }) {
  const s = LABEL_STATUS[status];
  return <Badge variant={s.nada}>{s.label}</Badge>;
}

/** Tertinggal & tunggakan (aturan-usaha B5) dan rem gulung yang berlaku. */
function LencanaTagih({ p }: { p: KartuPinjaman }) {
  return (
    <>
      {p.tagih && p.tagih.tertinggal > 0 ? (
        <Badge variant="warning">
          Tertinggal {p.jenis === "tempoan" ? "jatuh tempo" : `${p.tagih.tertinggal}×`} ·{" "}
          {rupiah(p.tagih.tunggakan)}
        </Badge>
      ) : null}
      {p.kunciGulung?.gulung ? (
        <Badge variant="outline">Gulung dikunci</Badge>
      ) : p.kunciGulung?.naik ? (
        <Badge variant="outline">Naik dikunci</Badge>
      ) : null}
    </>
  );
}

// ---- tab pinjaman -------------------------------------------------------------------

export function TabPinjaman({ nasabahId }: { nasabahId: string }) {
  const q = useBuku(nasabahId);
  const [pilih, setPilih] = useState<string | null>(null);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  // Terbaru di atas.
  const daftar = [...q.data.pinjaman].reverse();
  if (daftar.length === 0) return <Kosong>Belum pernah meminjam</Kosong>;
  return (
    <>
      <ul className="space-y-2">
        {daftar.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className="w-full space-y-1 rounded-lg border px-3 py-2.5 text-left text-sm hover:bg-muted/50"
              onClick={() => setPilih(p.id)}
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{judulPinjaman(p)}</span>
                <LencanaStatus status={p.status} />
                <LencanaTagih p={p} />
              </span>
              <span className="block text-xs text-muted-foreground tabular-nums">
                Akad {formatTanggal(p.tanggalAkad, false)} · pokok {rupiah(p.pokok)} · saldo{" "}
                {rupiah(p.saldo)}
                {p.jenis === "tempoan"
                  ? p.jatuhTempo
                    ? ` · jatuh tempo ${formatTanggal(p.jatuhTempo, false)}`
                    : ""
                  : ` · angsuran ${rupiah(p.angsuran)} · ke-${p.angsuranKe}/${p.tenor}`}
                {p.tanggalSelesai ? ` · selesai ${formatTanggal(p.tanggalSelesai, false)}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {pilih ? (
        <DialogPinjaman id={pilih} nasabahId={nasabahId} tutup={() => setPilih(null)} />
      ) : null}
    </>
  );
}

// ---- tab peristiwa ------------------------------------------------------------------

export function TabPeristiwa({ nasabahId }: { nasabahId: string }) {
  const q = useBuku(nasabahId);
  const hariIni = useHariIni();
  const [hapus, setHapus] = useState<Peristiwa | null>(null);
  const keKe = useMemo(
    () => new Map((q.data?.pinjaman ?? []).map((p) => [p.id, p.pinjamanKe])),
    [q.data],
  );
  const kolom = useMemo(() => {
    const k = pembantuKolom<Peristiwa>();
    return [
      k.accessor("tanggal", { header: "Tanggal", cell: (c) => formatTanggal(c.getValue()) }),
      k.accessor((p) => keKe.get(p.pinjamanId) ?? 0, {
        id: "ke",
        header: "Pinjaman",
        cell: (c) => `ke-${c.getValue()}`,
      }),
      k.accessor("kategori", {
        header: "Peristiwa",
        cell: (c) => {
          const p = c.row.original;
          return p.kategori === "libur" ? (
            <span className="text-muted-foreground">
              Libur{p.alasanLibur ? ` · ${p.alasanLibur}` : ""}
            </span>
          ) : (
            LABEL_PERISTIWA[p.kategori]
          );
        },
      }),
      k.accessor("storting", {
        header: "Storting",
        meta: { kanan: true },
        cell: (c) => (c.row.original.kategori === "libur" ? "—" : rupiah(c.getValue())),
      }),
      k.accessor("saldoSesudah", {
        header: "Saldo sesudah",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return n === null ? "—" : rupiah(n);
        },
      }),
      k.accessor((p) => p.pencatat.nama, { id: "pencatat", header: "Dicatat" }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const p = c.row.original;
          if (p.kategori !== "libur" || p.tanggal !== hariIni) return null;
          return (
            <div className="flex justify-end">
              <Button
                size="icon"
                variant="ghost"
                title="Hapus tanda libur"
                aria-label="Hapus tanda libur"
                className="text-red-700 hover:text-red-800"
                onClick={() => setHapus(p)}
              >
                <Trash2 />
              </Button>
            </div>
          );
        },
      }),
    ] as Kolom<Peristiwa>[];
  }, [keKe, hariIni]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData
        kolom={kolom}
        data={[...q.data.peristiwa].reverse()}
        idBaris={(p) => p.id}
        kosong="Belum ada setoran atau libur"
      />
      {hapus ? <DialogHapusLibur libur={hapus} tutup={() => setHapus(null)} /> : null}
    </>
  );
}

/** Hapus tanda libur salah (bos, hari yang sama) — kolektor bisa mencatat setoran lagi. */
export function DialogHapusLibur({ libur, tutup }: { libur: Peristiwa; tutup: () => void }) {
  return (
    <DialogBatal
      judul={`Hapus tanda libur ${libur.nasabah.nama}?`}
      keterangan="Tanda libur hari ini dihapus dan tercatat di riwayat. Sesudahnya kolektor bisa mencatat setoran pinjaman ini lagi."
      segarkan={[["nasabah"], ["harian"]]}
      tutup={tutup}
      kirim={(alasan) =>
        ambil(() =>
          api.transaksi.libur[":id"].hapus.$post({ param: { id: libur.id }, json: { alasan } }),
        )
      }
    />
  );
}

// ---- dialog rincian pinjaman --------------------------------------------------------

/** Aturan macet (aturan-usaha F) dengan jendela 30 hari yang berakhir hari ini. */
function AturanMacet({ p }: { p: RincianPinjaman }) {
  const m = p.aturanMacet;
  if (!m) return null;
  return (
    <div className="space-y-1 rounded-lg bg-muted/50 px-3 py-2 text-sm">
      <p className="font-medium">Aturan macet</p>
      {p.jenis === "tempoan" ? (
        <p>
          Macet bila belum lunas sesudah {m.batasTempoan ? formatTanggal(m.batasTempoan) : "—"}.
        </p>
      ) : (
        <p>
          Setoran {formatTanggal(m.jendelaAwal, false)} – {formatTanggal(m.jendelaAkhir, false)}:{" "}
          <span className="font-medium tabular-nums">{rupiah(m.setoranJendela)}</span> dari minimal{" "}
          <span className="tabular-nums">{rupiah(m.ambang ?? 0)}</span>.
          {!m.dievaluasi && m.hariTagih !== null
            ? ` Belum dinilai — baru ${m.hariTagih} hari tagih (perlu 15).`
            : ""}
        </p>
      )}
      <p className="text-muted-foreground">
        Bila tak ada setoran lagi hari ini, sapuan malam ini memberi status{" "}
        <span className="font-medium text-foreground">
          {LABEL_STATUS[m.statusMalamIni].label.toLowerCase()}
        </span>
        .
      </p>
    </div>
  );
}

function GarisStatus({ id }: { id: string }) {
  const kantor = useKantor();
  const q = useQuery({
    queryKey: ["pinjaman", "riwayat-status", id],
    queryFn: () => ambil(() => api.pinjaman[":id"]["riwayat-status"].$get({ param: { id } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} />;
  return (
    <ol className="space-y-1 text-sm">
      {q.data.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2">
          <span className="w-28 shrink-0 text-muted-foreground">
            {formatTanggal(r.tanggal, false)}
          </span>
          {r.statusSebelum ? (
            <>
              <LencanaStatus status={r.statusSebelum} />
              <span aria-hidden>→</span>
            </>
          ) : null}
          <LencanaStatus status={r.statusSesudah} />
          <span className="text-xs text-muted-foreground">
            {waktu(r.dibuatAt, kantor.zonaWaktu)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function DialogUbahNomor({
  p,
  nasabahId,
  tutup,
}: {
  p: RincianPinjaman;
  nasabahId: string;
  tutup: () => void;
}) {
  const klien = useQueryClient();
  const [ke, setKe] = useState(String(p.pinjamanKe));
  const nomor = Number(ke);
  const m = useMutation({
    mutationFn: () =>
      ambil(() => api.pinjaman[":id"].$patch({ param: { id: p.id }, json: { pinjamanKe: nomor } })),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: kunciBuku(nasabahId) });
      // Rincian ini dan daftar di layar Pinjaman.
      void klien.invalidateQueries({ queryKey: ["pinjaman"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Ubah nomor pinjaman"
      keterangan="Samakan dengan buku lama bila salah urut. Nomor yang sudah dipakai pinjaman lain nasabah ini ditolak."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={Number.isInteger(nomor) && nomor >= 1 && nomor !== p.pinjamanKe}
    >
      <Isian
        label="Pinjaman ke-"
        type="number"
        min={1}
        value={ke}
        autoFocus
        onChange={(e) => setKe(e.target.value)}
      />
    </DialogFormulir>
  );
}

const LABEL_ASAL = { baru: "Akad baru", gulung: "Gulung", migrasi: "Salinan buku lama" } as const;

export function DialogPinjaman({
  id,
  nasabahId,
  tutup,
}: {
  id: string;
  nasabahId: string;
  tutup: () => void;
}) {
  const kantor = useKantor();
  const [aksi, setAksi] = useState<"nomor" | "riwayat" | null>(null);
  const q = useQuery({
    queryKey: ["pinjaman", id],
    queryFn: () => ambil(() => api.pinjaman[":id"].$get({ param: { id } })),
  });
  const p = q.data;
  return (
    <>
      <Dialog open onOpenChange={(b) => !b && tutup()}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {p ? judulPinjaman(p) : "Pinjaman"}
              {p ? <LencanaStatus status={p.status} /> : null}
              {p ? <LencanaTagih p={p} /> : null}
            </DialogTitle>
            <DialogDescription>
              {p
                ? `${LABEL_ASAL[p.asal]} · dicairkan ${p.pencair.nama} · dipegang ${p.kolektor.nama}`
                : "Memuat rincian…"}
            </DialogDescription>
          </DialogHeader>
          {q.isPending ? (
            <Memuat />
          ) : q.isError || !p ? (
            <GalatMuat galat={q.error ?? new Error("Pinjaman tidak ditemukan")} />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {p.status !== "batal" ? (
                  <Button size="sm" variant="outline" onClick={() => setAksi("nomor")}>
                    <ListOrdered />
                    Ubah nomor
                  </Button>
                ) : null}
                <Button size="sm" variant="ghost" onClick={() => setAksi("riwayat")}>
                  <History />
                  Riwayat suntingan
                </Button>
              </div>
              <AturanMacet p={p} />
              <div className="grid gap-x-8 sm:grid-cols-2">
                <div className="divide-y">
                  <BarisNilai label="Tanggal akad">{formatTanggal(p.tanggalAkad)}</BarisNilai>
                  {p.tanggalDisalin ? (
                    <BarisNilai label="Disalin">{formatTanggal(p.tanggalDisalin)}</BarisNilai>
                  ) : null}
                  {p.jatuhTempo ? (
                    <BarisNilai label="Jatuh tempo">{formatTanggal(p.jatuhTempo)}</BarisNilai>
                  ) : null}
                  <BarisNilai label="Pokok">{rupiah(p.pokok)}</BarisNilai>
                  <BarisNilai label="Potongan admin">{rupiah(p.potonganAdmin)}</BarisNilai>
                  <BarisNilai label="Masuk tabungan">{rupiah(p.tabunganMasuk)}</BarisNilai>
                  {p.saldoLama > 0 ? (
                    <BarisNilai label="Saldo lama ditutup">{rupiah(p.saldoLama)}</BarisNilai>
                  ) : null}
                  <BarisNilai label="Tunai ke nasabah">{rupiah(p.pencairan)}</BarisNilai>
                </div>
                <div className="divide-y">
                  <BarisNilai label="Total kembali">{rupiah(p.totalKembali)}</BarisNilai>
                  <BarisNilai label={p.jenis === "tempoan" ? "Dibayar sekali" : "Angsuran"}>
                    {rupiah(p.angsuran)}
                  </BarisNilai>
                  <BarisNilai label="Saldo">{rupiah(p.saldo)}</BarisNilai>
                  {p.jenis !== "tempoan" ? (
                    <BarisNilai label="Angsuran lunas">
                      {p.angsuranKe} dari {p.tenor}
                    </BarisNilai>
                  ) : null}
                  {p.tanggalMacet ? (
                    <BarisNilai label="Macet sejak">{formatTanggal(p.tanggalMacet)}</BarisNilai>
                  ) : null}
                  {p.tanggalSelesai ? (
                    <BarisNilai label="Selesai">{formatTanggal(p.tanggalSelesai)}</BarisNilai>
                  ) : null}
                  {p.pemutihan ? (
                    <BarisNilai label="Diputihkan">
                      {waktu(p.pemutihan.at, kantor.zonaWaktu)}
                      {p.pemutihan.keterangan ? ` · ${p.pemutihan.keterangan}` : ""}
                    </BarisNilai>
                  ) : null}
                  {p.batal ? (
                    <BarisNilai label="Dibatalkan">
                      {waktu(p.batal.at, kantor.zonaWaktu)} · {p.batal.alasan}
                    </BarisNilai>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Perjalanan status</p>
                <GarisStatus id={p.id} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {aksi === "nomor" && p ? (
        <DialogUbahNomor p={p} nasabahId={nasabahId} tutup={() => setAksi(null)} />
      ) : null}
      {aksi === "riwayat" && p ? (
        <DialogRiwayat
          tabel="pinjaman"
          barisId={p.id}
          judul={`Riwayat suntingan ${judulPinjaman(p).toLowerCase()}`}
          tutup={() => setAksi(null)}
        />
      ) : null}
    </>
  );
}
