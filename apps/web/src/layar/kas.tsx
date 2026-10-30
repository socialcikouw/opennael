import { geserTanggal } from "@opennael/domain";
import { tanggal as formatTanggal, rupiah } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Pencil, Plus, Scale, Undo2 } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KartuAngka, KepalaHalaman, Memuat } from "@/komponen/halaman";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { cn } from "@/lib/utils";

const rute = getRouteApi("/bos/kas");

type Akun = "tunai" | "bank";
type JenisMutasi =
  | "setor_modal"
  | "tarik_modal"
  | "biaya_kantor"
  | "pindah_akun"
  | "lain_masuk"
  | "lain_keluar";

const LABEL_MUTASI: Record<JenisMutasi, string> = {
  setor_modal: "Setor modal",
  tarik_modal: "Tarik modal",
  biaya_kantor: "Biaya kantor",
  pindah_akun: "Pindah akun",
  lain_masuk: "Pemasukan lain",
  lain_keluar: "Pengeluaran lain",
};

/** Arah akun per jenis mutasi: masuk → `keAkun`, keluar → `dariAkun`, pindah → keduanya. */
const ARAH: Record<JenisMutasi, "masuk" | "keluar" | "pindah"> = {
  setor_modal: "masuk",
  lain_masuk: "masuk",
  tarik_modal: "keluar",
  biaya_kantor: "keluar",
  lain_keluar: "keluar",
  pindah_akun: "pindah",
};

const LABEL_SUMBER = {
  mutasi: "Mutasi",
  serah_terima: "Setoran sore",
  transfer_setoran: "Transfer setoran",
  transfer_lama: "Transfer (sistem lama)",
  penarikan_tabungan: "Penarikan tabungan",
  pembayaran_gaji: "Gaji kolektor",
} as const;

const KUNCI_KAS = [["kas"]];

function useSegarkanKas() {
  const klien = useQueryClient();
  return () => {
    for (const k of [["kas"], ["aktivitas"]]) void klien.invalidateQueries({ queryKey: k });
  };
}

function Baris({
  label,
  children,
  tebal,
}: {
  label: string;
  children: ReactNode;
  tebal?: boolean;
}) {
  return (
    <div className={cn("flex justify-between gap-4 py-1.5 text-sm", tebal && "font-semibold")}>
      <span className={tebal ? undefined : "text-muted-foreground"}>{label}</span>
      <span className="tabular-nums">{children}</span>
    </div>
  );
}

const rp = (n: number | null) => (n === null ? "—" : rupiah(n));

// ---- buka buku kas ------------------------------------------------------------------

function BukaBukuKas() {
  const segarkan = useSegarkanKas();
  const [tunai, setTunai] = useState<number | null>(null);
  const [bank, setBank] = useState<number | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() => api.kas.kas.buka.$post({ json: { tunai: tunai ?? 0, bank: bank ?? 0 } })),
    onSuccess: segarkan,
  });
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Buka buku kas</CardTitle>
        <CardDescription>
          Sekali saja, hari ini. Isi uang yang ada sekarang di brankas dan di rekening kantor. Salah
          ketik masih bisa dibetulkan sampai akhir hari ini.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            m.mutate();
          }}
        >
          <IsianRupiah label="Kas awal tunai" nilai={tunai} ubah={setTunai} />
          <IsianRupiah label="Kas awal bank" nilai={bank} ubah={setBank} />
          {m.error ? <p className="text-sm text-red-700">{m.error.message}</p> : null}
          <Button type="submit" disabled={m.isPending || tunai === null}>
            {m.isPending ? "Memproses…" : "Buka buku kas"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function DialogKasAwal({
  awal,
  tutup,
}: {
  awal: { tunai: number; bank: number };
  tutup: () => void;
}) {
  const segarkan = useSegarkanKas();
  const [tunai, setTunai] = useState<number | null>(awal.tunai);
  const [bank, setBank] = useState<number | null>(awal.bank);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.buka.$patch({
          // Klien `hc` menggabungkan tipe POST & PATCH di jalur yang sama — kirim keduanya.
          json: { tunai: tunai ?? 0, bank: bank ?? 0 },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Betulkan kas awal"
      keterangan="Hanya di hari buku kas dibuka."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={tunai !== awal.tunai || bank !== awal.bank}
    >
      <IsianRupiah label="Kas awal tunai" nilai={tunai} ubah={setTunai} />
      <IsianRupiah label="Kas awal bank" nilai={bank} ubah={setBank} />
    </DialogFormulir>
  );
}

// ---- mutasi -------------------------------------------------------------------------

function DialogMutasi({ tutup }: { tutup: () => void }) {
  const segarkan = useSegarkanKas();
  const [jenis, setJenis] = useState<JenisMutasi>("setor_modal");
  const [akun, setAkun] = useState<Akun>("tunai");
  const [nominal, setNominal] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const arah = ARAH[jenis];
  const lain: Akun = akun === "tunai" ? "bank" : "tunai";
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.mutasi.$post({
          json: {
            jenis,
            dariAkun: arah === "masuk" ? null : akun,
            keAkun: arah === "keluar" ? null : arah === "pindah" ? lain : akun,
            nominal: nominal ?? 0,
            keterangan: keterangan.trim(),
          },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Catat mutasi kas"
      keterangan="Uang masuk/keluar kantor di luar pekerjaan kolektor — tercatat hari ini."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Catat"
      bisaKirim={!!nominal && keterangan.trim() !== ""}
    >
      <Medan label="Jenis">
        <PilihanAsli value={jenis} onChange={(e) => setJenis(e.target.value as JenisMutasi)}>
          {(Object.keys(LABEL_MUTASI) as JenisMutasi[]).map((j) => (
            <option key={j} value={j}>
              {LABEL_MUTASI[j]}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <Medan
        label={arah === "masuk" ? "Masuk ke" : arah === "keluar" ? "Keluar dari" : "Dari"}
        petunjuk={arah === "pindah" ? `Ke ${lain}` : undefined}
      >
        <PilihanAsli value={akun} onChange={(e) => setAkun(e.target.value as Akun)}>
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Nominal" nilai={nominal} ubah={setNominal} />
      <Isian
        label="Keterangan"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}

// ---- pencocokan ---------------------------------------------------------------------

/** Hitung buta: angka nyata dulu; saldo buku dijawab server sesudah tersimpan. */
function DialogCocokkan({ tutup }: { tutup: () => void }) {
  const segarkan = useSegarkanKas();
  const [akun, setAkun] = useState<Akun>("tunai");
  const [nyata, setNyata] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.pencocokan.$post({
          json: {
            akun,
            saldoNyata: nyata ?? 0,
            ...(keterangan.trim() ? { keterangan: keterangan.trim() } : {}),
          },
        }),
      ),
    onSuccess: segarkan,
  });
  if (m.data) {
    const h = m.data;
    return (
      <DialogFormulir
        judul={`Hasil pencocokan ${h.akun}`}
        buka
        ubahBuka={(b) => !b && tutup()}
        kirim={tutup}
        memuat={false}
        labelKirim="Selesai"
      >
        <div className="divide-y">
          <Baris label="Saldo nyata (dihitung)">{rupiah(h.saldoNyata)}</Baris>
          <Baris label="Saldo buku">{rupiah(h.saldoBuku)}</Baris>
          <Baris label={h.selisih < 0 ? "Kurang" : h.selisih > 0 ? "Lebih" : "Selisih"} tebal>
            <span
              className={cn(h.selisih < 0 && "text-red-700", h.selisih > 0 && "text-emerald-700")}
            >
              {rupiah(h.selisih)}
            </span>
          </Baris>
        </div>
      </DialogFormulir>
    );
  }
  return (
    <DialogFormulir
      judul="Cocokkan kas"
      keterangan="Hitung uangnya lebih dulu. Saldo buku baru ditampilkan sesudah angka nyata disimpan. Bila ada selisih, server meminta keterangan."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Simpan"
      bisaKirim={nyata !== null}
    >
      <Medan label="Akun">
        <PilihanAsli value={akun} onChange={(e) => setAkun(e.target.value as Akun)}>
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Saldo nyata" nilai={nyata} ubah={setNyata} />
      <Isian
        label="Keterangan (wajib bila ada selisih)"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}

const ambilPencocokan = (mulai: string, selesai: string) =>
  ambil(() => api.kas.kas.pencocokan.$get({ query: { mulai, selesai } }));
type Pencocokan = Awaited<ReturnType<typeof ambilPencocokan>>[number];

function DaftarPencocokan({
  mulai,
  selesai,
  hariIni,
}: {
  mulai: string;
  selesai: string;
  hariIni: string;
}) {
  const [batal, setBatal] = useState<Pencocokan | null>(null);
  const q = useQuery({
    queryKey: ["kas", "pencocokan", mulai, selesai],
    queryFn: () => ambilPencocokan(mulai, selesai),
  });
  const kolom = useMemo(() => {
    const k = pembantuKolom<Pencocokan>();
    return [
      k.accessor("tanggal", {
        header: "Tanggal",
        cell: (c) => (
          <span className={cn(c.row.original.dibatalkanAt && "line-through")}>
            {formatTanggal(c.getValue(), "tanpa")}
          </span>
        ),
      }),
      k.accessor("akun", { header: "Akun" }),
      k.accessor((p) => p.dicocokkanOleh.nama, { id: "oleh", header: "Oleh" }),
      k.accessor("saldoBuku", {
        header: "Buku",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("saldoNyata", {
        header: "Nyata",
        meta: { kanan: true },
        cell: (c) => rupiah(c.getValue()),
      }),
      k.accessor("selisih", {
        header: "Selisih",
        meta: { kanan: true },
        cell: (c) => {
          const n = c.getValue();
          return (
            <span className={cn(n < 0 && "text-red-700", n > 0 && "text-emerald-700")}>
              {n === 0 ? "—" : rupiah(n)}
            </span>
          );
        },
      }),
      k.accessor((p) => (p.dibatalkanAt ? `Batal: ${p.alasanBatal}` : (p.keterangan ?? "")), {
        id: "keterangan",
        header: "Keterangan",
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const p = c.row.original;
          if (p.dibatalkanAt || p.tanggal !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan pencocokan"
              aria-label="Batalkan pencocokan"
              className="text-red-700"
              onClick={() => setBatal(p)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Pencocokan>[];
  }, [hariIni]);
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <>
      <TabelData kolom={kolom} data={q.data} idBaris={(p) => p.id} kosong="Belum ada pencocokan" />
      {batal ? (
        <DialogBatal
          judul="Batalkan pencocokan?"
          keterangan="Untuk salah hitung — lalu cocokkan ulang."
          segarkan={KUNCI_KAS}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kas.kas.pencocokan[":id"].batal.$post({
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

// ---- layar --------------------------------------------------------------------------

const ambilLaporan = (mulai: string, selesai: string) =>
  ambil(() => api.kas.kas.laporan.$get({ query: { mulai, selesai } }));
type Gerakan = Awaited<ReturnType<typeof ambilLaporan>>["gerakan"][number];

/** Posisi modal pada akhir satu tanggal (aturan-usaha M). */
function PosisiModal({ tanggal }: { tanggal: string }) {
  const q = useQuery({
    queryKey: ["kas", "posisi-modal", tanggal],
    queryFn: () => ambil(() => api.kas.kas["posisi-modal"].$get({ query: { tanggal } })),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Posisi modal</CardTitle>
        <CardDescription>Akhir {formatTanggal(tanggal)}</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isPending ? (
          <Memuat />
        ) : q.isError ? (
          <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
        ) : (
          <div className="divide-y">
            <Baris label="Saldo tunai">{rp(q.data.saldoTunai)}</Baris>
            <Baris label="· dibawa kolektor">{rp(q.data.kasDiLapangan)}</Baris>
            <Baris label="· di brankas">{rp(q.data.diBrankas)}</Baris>
            <Baris label="Saldo bank">{rp(q.data.saldoBank)}</Baris>
            <Baris label="Piutang berjalan">{rp(q.data.piutangBerjalan)}</Baris>
            <Baris label="Piutang macet">{rp(q.data.piutangMacet)}</Baris>
            <Baris label="− Tabungan nasabah">{rupiah(q.data.tabunganNasabah)}</Baris>
            <Baris label="Posisi modal" tebal>
              {rp(q.data.posisiModal)}
            </Baris>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type Rentang = "hari" | "pekan" | "bulan";

/** Buku kas kantor: saldo per akun, gerakan, mutasi, pencocokan, posisi modal. */
export function LayarKas() {
  const hariIni = useHariIni();
  const { mulai: m0, selesai: s0, tab } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const selesai = s0 ?? hariIni;
  const mulai = m0 ?? selesai;
  const [dialog, setDialog] = useState<"mutasi" | "cocokkan" | "kas-awal" | null>(null);
  const [batal, setBatal] = useState<Gerakan | null>(null);

  const q = useQuery({
    queryKey: ["kas", "laporan", mulai, selesai],
    queryFn: () => ambilLaporan(mulai, selesai),
  });

  const pakaiRentang = (r: Rentang) => {
    const dari =
      r === "hari"
        ? hariIni
        : r === "pekan"
          ? geserTanggal(hariIni, -6)
          : `${hariIni.slice(0, 8)}01`;
    void navigasi({
      search: (s) => ({ ...s, mulai: dari === hariIni ? undefined : dari, selesai: undefined }),
    });
  };

  const kolom = useMemo(() => {
    const k = pembantuKolom<Gerakan>();
    return [
      k.accessor("tanggal", {
        header: "Tanggal",
        cell: (c) => formatTanggal(c.getValue(), "tanpa"),
      }),
      k.accessor("akun", { header: "Akun" }),
      k.accessor(
        (g) => (g.sumber === "mutasi" && g.jenis ? LABEL_MUTASI[g.jenis] : LABEL_SUMBER[g.sumber]),
        {
          id: "sumber",
          header: "Sumber",
        },
      ),
      k.accessor((g) => g.keterangan ?? "", {
        id: "keterangan",
        header: "Keterangan",
        cell: (c) => <span className="text-muted-foreground">{c.getValue()}</span>,
      }),
      k.accessor((g) => Math.max(g.nominal, 0), {
        id: "masuk",
        header: "Masuk",
        meta: { kanan: true },
        cell: (c) =>
          c.getValue() ? <span className="text-emerald-700">{rupiah(c.getValue())}</span> : "",
      }),
      k.accessor((g) => Math.max(-g.nominal, 0), {
        id: "keluar",
        header: "Keluar",
        meta: { kanan: true },
        cell: (c) => (c.getValue() ? rupiah(c.getValue()) : ""),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const g = c.row.original;
          if (g.sumber !== "mutasi" || g.tanggal !== hariIni) return null;
          return (
            <Button
              size="icon"
              variant="ghost"
              title="Batalkan mutasi"
              aria-label="Batalkan mutasi"
              className="text-red-700"
              onClick={() => setBatal(g)}
            >
              <Undo2 />
            </Button>
          );
        },
      }),
    ] as Kolom<Gerakan>[];
  }, [hariIni]);

  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const r = q.data;

  if (!r.bukuKas) {
    return (
      <>
        <KepalaHalaman judul="Kas" keterangan="Buku kas kantor belum dibuka." />
        <BukaBukuKas />
      </>
    );
  }
  const buku = r.bukuKas;

  return (
    <>
      <KepalaHalaman
        judul="Kas"
        keterangan={`${mulai === selesai ? formatTanggal(selesai) : `${formatTanggal(mulai, "tanpa")} – ${formatTanggal(selesai, "tanpa")}`} · buku dibuka ${formatTanggal(buku.tanggalBuka, "tanpa")}`}
        aksi={
          <>
            {buku.tanggalBuka === hariIni ? (
              <Button variant="outline" onClick={() => setDialog("kas-awal")}>
                <Pencil />
                Kas awal
              </Button>
            ) : null}
            <Button variant="outline" onClick={() => setDialog("cocokkan")}>
              <Scale />
              Cocokkan kas
            </Button>
            <Button onClick={() => setDialog("mutasi")}>
              <Plus />
              Catat mutasi
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["hari", "Hari ini"],
            ["pekan", "7 hari"],
            ["bulan", "Bulan ini"],
          ] as const
        ).map(([nilai, label]) => (
          <Button key={nilai} size="sm" variant="outline" onClick={() => pakaiRentang(nilai)}>
            {label}
          </Button>
        ))}
        <Input
          type="date"
          className="w-40"
          aria-label="Mulai"
          value={mulai}
          max={selesai}
          onChange={(e) =>
            e.target.value && void navigasi({ search: (s) => ({ ...s, mulai: e.target.value }) })
          }
        />
        <span className="text-muted-foreground">–</span>
        <Input
          type="date"
          className="w-40"
          aria-label="Selesai"
          value={selesai}
          min={mulai}
          max={hariIni}
          onChange={(e) =>
            e.target.value && void navigasi({ search: (s) => ({ ...s, selesai: e.target.value }) })
          }
        />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuAngka
          label="Saldo tunai akhir"
          nilai={rupiah(r.tunai.saldoAkhir)}
          catatan={`awal ${rupiah(r.tunai.saldoAwal)} · +${rupiah(r.tunai.masuk)} · −${rupiah(r.tunai.keluar)}`}
        />
        <KartuAngka
          label="Saldo bank akhir"
          nilai={rupiah(r.bank.saldoAkhir)}
          catatan={`awal ${rupiah(r.bank.saldoAwal)} · +${rupiah(r.bank.masuk)} · −${rupiah(r.bank.keluar)}`}
        />
        <KartuAngka
          label="Kas di lapangan (kini)"
          nilai={rupiah(r.kasDiLapangan)}
          catatan="dibawa kolektor, belum diserahkan"
        />
        <KartuAngka
          label="Brankas seharusnya (kini)"
          nilai={rupiah(r.brankasSeharusnya)}
          catatan="saldo tunai − kas di lapangan"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Tabs
          value={tab ?? "buku"}
          onValueChange={(v) =>
            void navigasi({ search: (s) => ({ ...s, tab: v === "buku" ? undefined : "cocok" }) })
          }
        >
          <TabsList>
            <TabsTrigger value="buku">Buku kas</TabsTrigger>
            <TabsTrigger value="cocok">Pencocokan</TabsTrigger>
          </TabsList>
          <TabsContent value="buku">
            <TabelData
              kolom={kolom}
              data={r.gerakan}
              kosong="Tidak ada gerakan kas pada rentang ini"
            />
          </TabsContent>
          <TabsContent value="cocok">
            <DaftarPencocokan mulai={mulai} selesai={selesai} hariIni={hariIni} />
          </TabsContent>
        </Tabs>
        <PosisiModal tanggal={selesai} />
      </div>

      {dialog === "mutasi" ? <DialogMutasi tutup={() => setDialog(null)} /> : null}
      {dialog === "cocokkan" ? <DialogCocokkan tutup={() => setDialog(null)} /> : null}
      {dialog === "kas-awal" ? (
        <DialogKasAwal
          awal={{ tunai: buku.kasAwalTunai, bank: buku.kasAwalBank }}
          tutup={() => setDialog(null)}
        />
      ) : null}
      {batal ? (
        <DialogBatal
          judul="Batalkan mutasi?"
          keterangan={`${batal.jenis ? LABEL_MUTASI[batal.jenis] : "Mutasi"} ${rupiah(Math.abs(batal.nominal))}${batal.keterangan ? ` — ${batal.keterangan}` : ""}`}
          segarkan={KUNCI_KAS}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kas.kas.mutasi[":id"].batal.$post({
                param: { id: batal.sumberId },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}
