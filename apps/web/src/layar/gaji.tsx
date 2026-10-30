import { geserTanggal } from "@opennael/domain";
import { tanggal as formatTanggal, persen, rupiah } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Banknote, Undo2 } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KartuAngka, KepalaHalaman, Kosong, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { cn } from "@/lib/utils";

const rute = getRouteApi("/bos/gaji");

const HALANGAN = {
  PERIODE_BELUM_BERAKHIR: "Periode belum berakhir — gaji dibayar sesudah hari terakhirnya lewat.",
  PERIODE_SUDAH_DIBAYAR: "Sebagian periode ini sudah dibayar.",
  TEKOR_MELEBIHI_GAJI: "Tekor melebihi gaji kotor — gaji bersih minus.",
  GAJI_KOTOR_MINUS: "Gaji kotor minus.",
} as const;

const ambilPratinjau = (kolektorId: string, mulai: string, selesai: string) =>
  ambil(() => api.penggajian.kas.gaji.pratinjau.$get({ query: { kolektorId, mulai, selesai } }));
type Pratinjau = Awaited<ReturnType<typeof ambilPratinjau>>;
type HariGaji = Pratinjau["hari"][number];

const ambilSlip = (kolektorId?: string) =>
  ambil(() => api.penggajian.kas.gaji.$get({ query: kolektorId ? { kolektorId } : {} }));
type Slip = Awaited<ReturnType<typeof ambilSlip>>[number];

const kh = pembantuKolom<HariGaji>();
const KOLOM_HARI = [
  kh.accessor("tanggal", {
    header: "Tanggal",
    cell: (c) => formatTanggal(c.getValue()),
    footer: () => "Jumlah",
  }),
  kh.accessor("storting", {
    header: "Storting",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
    footer: (c) => rupiah(c.table.getRowModel().rows.reduce((s, r) => s + r.original.storting, 0)),
  }),
  kh.accessor("tarifBp", {
    header: "Tarif",
    meta: { kanan: true },
    cell: (c) => persen(c.getValue() / 100),
  }),
  kh.accessor((h) => Math.round((h.storting * h.tarifBp) / 10_000), {
    id: "gaji",
    header: "Gaji hari itu",
    meta: { kanan: true },
    cell: (c) => rupiah(c.getValue()),
  }),
  kh.accessor("tekor", {
    header: "Tekor",
    meta: { kanan: true },
    cell: (c) =>
      c.getValue() ? <span className="text-red-700">{rupiah(c.getValue())}</span> : "—",
    footer: (c) => rupiah(c.table.getRowModel().rows.reduce((s, r) => s + r.original.tekor, 0)),
  }),
] as Kolom<HariGaji>[];

function DialogBayar({ p, tutup }: { p: Pratinjau; tutup: () => void }) {
  const klien = useQueryClient();
  const [dariAkun, setDariAkun] = useState<"tunai" | "bank">("tunai");
  const [keterangan, setKeterangan] = useState("");
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.penggajian.kas.gaji.$post({
          json: {
            kolektorId: p.kolektor.id,
            periodeMulai: p.periodeMulai,
            periodeSelesai: p.periodeSelesai,
            dariAkun,
            ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
          },
        }),
      ),
    onSuccess: () => {
      for (const k of [["gaji"], ["kas"], ["aktivitas"]]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Bayar gaji ${p.kolektor.nama}`}
      keterangan={`${formatTanggal(p.periodeMulai, "tanpa")} – ${formatTanggal(p.periodeSelesai, "tanpa")} · gaji bersih ${rupiah(p.gajiBersih)}. Angka dihitung ulang & dibekukan server.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim={`Bayar ${rupiah(p.gajiBersih)}`}
    >
      <Medan label="Dari akun">
        <PilihanAsli
          value={dariAkun}
          onChange={(e) => setDariAkun(e.target.value as "tunai" | "bank")}
        >
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <Isian
        label="Keterangan (opsional)"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}

function PratinjauGaji({
  kolektorId,
  mulai,
  selesai,
}: {
  kolektorId: string;
  mulai: string;
  selesai: string;
}) {
  const [bayar, setBayar] = useState(false);
  const q = useQuery({
    queryKey: ["gaji", "pratinjau", kolektorId, mulai, selesai],
    queryFn: () => ambilPratinjau(kolektorId, mulai, selesai),
  });
  if (q.isPending) return <Memuat teks="Menghitung gaji…" />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const p = q.data;
  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        <KartuAngka label="Gaji kotor" nilai={rupiah(p.gajiKotor)} />
        <KartuAngka
          label="Potongan tekor"
          nilai={rupiah(p.potonganTekor)}
          nada={p.potonganTekor > 0 ? "buruk" : undefined}
        />
        <KartuAngka label="Gaji bersih" nilai={rupiah(p.gajiBersih)} />
      </section>
      <TabelData
        kolom={KOLOM_HARI}
        data={p.hari}
        idBaris={(h) => h.tanggal}
        kosong="Tidak ada storting atau tekor pada periode ini"
      />
      {p.halangan ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {HALANGAN[p.halangan]}
        </p>
      ) : (
        <Button onClick={() => setBayar(true)}>
          <Banknote />
          Bayar gaji {rupiah(p.gajiBersih)}
        </Button>
      )}
      {bayar ? <DialogBayar p={p} tutup={() => setBayar(false)} /> : null}
    </div>
  );
}

function RiwayatSlip({ kolektorId, hariIni }: { kolektorId?: string; hariIni: string }) {
  const [batal, setBatal] = useState<Slip | null>(null);
  const q = useQuery({
    queryKey: ["gaji", "slip", kolektorId ?? null],
    queryFn: () => ambilSlip(kolektorId),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Slip>();
    return [
      k.accessor((s) => s.kolektor.nama, {
        id: "kolektor",
        header: "Kolektor",
        cell: (c) => (
          <span className={cn("font-medium", c.row.original.dibatalkanAt && "line-through")}>
            {c.getValue()}
          </span>
        ),
      }),
      k.accessor("periodeMulai", {
        header: "Periode",
        cell: (c) =>
          `${formatTanggal(c.getValue(), "tanpa")} – ${formatTanggal(c.row.original.periodeSelesai, "tanpa")}`,
      }),
      k.accessor("gajiKotor", {
        header: "Kotor",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("potonganTekor", {
        header: "Tekor",
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : "—"),
      }),
      k.accessor("gajiBersih", {
        header: "Bersih",
        meta: { kanan: true },
        cell: (c) => <span className="font-medium">{rupiah(c.getValue())}</span>,
      }),
      k.accessor("tanggalBayar", {
        header: "Dibayar",
        cell: (c) => `${formatTanggal(c.getValue(), "tanpa")} · ${c.row.original.dariAkun}`,
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const s = c.row.original;
          if (s.dibatalkanAt) return <Badge variant="destructive">Batal: {s.alasanBatal}</Badge>;
          if (s.tanggalBayar !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan pembayaran"
              aria-label="Batalkan pembayaran"
              className="text-red-700"
              onClick={() => setBatal(s)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Slip>[];
  }, [hariIni]);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData kolom={kolom} data={q.data} idBaris={(s) => s.id} kosong="Belum ada slip gaji" />
      {batal ? (
        <DialogBatal
          judul={`Batalkan gaji ${batal.kolektor.nama}?`}
          keterangan={`${rupiah(batal.gajiBersih)} kembali ke kas ${batal.dariAkun}. Hanya di hari yang sama.`}
          segarkan={[["gaji"], ["kas"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.penggajian.kas.gaji[":id"].batal.$post({
                param: { id: batal.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}

/** Gaji kolektor: pratinjau per periode, bayar, riwayat slip. */
export function LayarGaji() {
  const hariIni = useHariIni();
  const kemarin = geserTanggal(hariIni, -1);
  const { kolektor: kolektorId, mulai: m0, selesai: s0 } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const selesai = s0 ?? kemarin;
  const mulai = m0 ?? geserTanggal(selesai, -6);
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const pilihKolektor = kolektorId ?? kolektorQ.data?.[0]?.id;

  return (
    <>
      <KepalaHalaman
        judul="Gaji kolektor"
        keterangan="Storting × tarif dikurangi tekor (aturan-usaha J). Pilih kolektor dan periode."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pratinjau & bayar</CardTitle>
          <CardDescription>Periode harus sudah lewat dan belum pernah dibayar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Medan label="Kolektor" className="w-56">
              <PilihanAsli
                value={pilihKolektor ?? ""}
                onChange={(e) =>
                  void navigasi({ search: (s) => ({ ...s, kolektor: e.target.value }) })
                }
              >
                {(kolektorQ.data ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.nama}
                  </option>
                ))}
              </PilihanAsli>
            </Medan>
            <Medan label="Mulai">
              <Input
                type="date"
                className="w-40"
                value={mulai}
                max={selesai}
                onChange={(e) =>
                  e.target.value &&
                  void navigasi({ search: (s) => ({ ...s, mulai: e.target.value }) })
                }
              />
            </Medan>
            <Medan label="Selesai">
              <Input
                type="date"
                className="w-40"
                value={selesai}
                min={mulai}
                onChange={(e) =>
                  e.target.value &&
                  void navigasi({ search: (s) => ({ ...s, selesai: e.target.value }) })
                }
              />
            </Medan>
          </div>
          {pilihKolektor ? (
            <PratinjauGaji kolektorId={pilihKolektor} mulai={mulai} selesai={selesai} />
          ) : kolektorQ.isPending ? (
            <Memuat />
          ) : (
            <Kosong>Belum ada kolektor</Kosong>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Riwayat slip</CardTitle>
          <CardDescription>
            {pilihKolektor ? "Kolektor yang dipilih di atas." : "Semua kolektor."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RiwayatSlip kolektorId={pilihKolektor} hariIni={hariIni} />
        </CardContent>
      </Card>
    </>
  );
}
