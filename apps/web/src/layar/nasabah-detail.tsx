import type { NasabahJawaban } from "@opennael/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft,
  Ban,
  Eraser,
  History,
  LockOpen,
  MapPin,
  Pencil,
  PencilLine,
  PiggyBank,
  ShieldAlert,
  Undo2,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { BarisNilai, GalatMuat, Kosong, Memuat } from "@/komponen/halaman";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/komponen/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { tanggal as formatTanggal, rupiah } from "@/lib/format";
import { useHariIni } from "@/lib/kantor";
import { cn } from "@/lib/utils";
import { DialogRiwayat } from "./aktivitas";
import { TabPeristiwa, TabPinjaman } from "./nasabah-pinjaman";

type Nasabah = NasabahJawaban;
type Kolektor = { id: string; nama: string };

/** Sesudah aksi tulis: segarkan daftar & rincian nasabah. */
function useSegarkanNasabah() {
  const klien = useQueryClient();
  return () => {
    void klien.invalidateQueries({ queryKey: ["nasabah"] });
    void klien.invalidateQueries({ queryKey: ["kebijakan"] });
  };
}

const ALASAN_PUTIH = [
  { nilai: "macet_lama", label: "Macet lama" },
  { nilai: "meninggal", label: "Meninggal" },
  { nilai: "lainnya", label: "Lainnya" },
] as const;

// ---- dialog aksi --------------------------------------------------------------------

function DialogSunting({
  n,
  kampung,
  tutup,
}: {
  n: Nasabah;
  kampung: string[];
  tutup: () => void;
}) {
  const segarkan = useSegarkanNasabah();
  const [isi, setIsi] = useState({
    nama: n.nama,
    kampung: n.kampung.nama,
    nomorHp: n.nomorHp ?? "",
    nik: n.nik ?? "",
  });
  const ubah: {
    nama?: string;
    kampung?: { nama: string };
    nomorHp?: string | null;
    nik?: string | null;
  } = {};
  if (isi.nama.trim() !== n.nama) ubah.nama = isi.nama.trim();
  if (isi.kampung.trim() !== n.kampung.nama) ubah.kampung = { nama: isi.kampung.trim() };
  if ((isi.nomorHp.trim() || null) !== n.nomorHp) ubah.nomorHp = isi.nomorHp.trim() || null;
  if ((isi.nik.trim() || null) !== n.nik) ubah.nik = isi.nik.trim() || null;
  const simpan = useMutation({
    mutationFn: () => ambil(() => api.nasabah[":id"].$patch({ param: { id: n.id }, json: ubah })),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Sunting ${n.nama}`}
      keterangan="Kosongkan nomor HP atau NIK untuk menghapusnya."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => simpan.mutate()}
      memuat={simpan.isPending}
      galat={simpan.error?.message}
      bisaKirim={
        Object.keys(ubah).length > 0 && isi.nama.trim() !== "" && isi.kampung.trim() !== ""
      }
    >
      <Isian
        label="Nama"
        value={isi.nama}
        maxLength={50}
        onChange={(e) => setIsi({ ...isi, nama: e.target.value })}
      />
      <Isian
        label="Kampung"
        list="daftar-kampung"
        value={isi.kampung}
        maxLength={50}
        petunjuk="Pilih yang sudah ada atau ketik kampung baru."
        onChange={(e) => setIsi({ ...isi, kampung: e.target.value })}
      />
      <datalist id="daftar-kampung">
        {kampung.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <Isian
        label="Nomor HP"
        type="tel"
        value={isi.nomorHp}
        onChange={(e) => setIsi({ ...isi, nomorHp: e.target.value })}
      />
      <Isian
        label="NIK"
        inputMode="numeric"
        maxLength={16}
        pattern="[0-9]{16}"
        title="NIK 16 digit"
        value={isi.nik}
        onChange={(e) => setIsi({ ...isi, nik: e.target.value.replace(/\D/g, "") })}
      />
    </DialogFormulir>
  );
}

function DialogPindah({
  n,
  kolektor,
  tutup,
}: {
  n: Nasabah;
  kolektor: Kolektor[];
  tutup: () => void;
}) {
  const segarkan = useSegarkanNasabah();
  const pilihan = kolektor.filter((k) => k.id !== n.kolektor?.id);
  const [ke, setKe] = useState(pilihan[0]?.id ?? "");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.nasabah[":id"].pindah.$post({ param: { id: n.id }, json: { kolektorId: ke } }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Pindah pemegang ${n.nama}`}
      keterangan={`Sekarang dipegang ${n.kolektor?.nama ?? "—"}. Pinjaman aktifnya ikut pindah.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Pindahkan"
      bisaKirim={ke !== ""}
    >
      <Medan label="Kolektor baru">
        <PilihanAsli value={ke} onChange={(e) => setKe(e.target.value)}>
          {pilihan.length === 0 ? <option value="">Tidak ada kolektor lain</option> : null}
          {pilihan.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
    </DialogFormulir>
  );
}

function DialogTarikTabungan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const saldo = n.saldoTabungan ?? 0;
  const [nominal, setNominal] = useState<number | null>(null);
  const [dariAkun, setDariAkun] = useState<"tunai" | "bank">("tunai");
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.nasabah[":id"]["penarikan-tabungan"].$post({
          param: { id: n.id },
          json: { nominal: nominal ?? 0, dariAkun, saldoSebelum: saldo, alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Tarik tabungan ${n.nama}`}
      keterangan={`Tabungan sekarang ${rupiah(saldo)}. Uang keluar dari kas kantor.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Catat penarikan"
      bisaKirim={!!nominal && nominal <= saldo && alasan.trim() !== ""}
    >
      <IsianRupiah
        label="Nominal"
        nilai={nominal}
        ubah={setNominal}
        petunjuk={nominal && nominal > saldo ? "Melebihi tabungan" : undefined}
      />
      <Medan label="Dari akun">
        <PilihanAsli
          value={dariAkun}
          onChange={(e) => setDariAkun(e.target.value as "tunai" | "bank")}
        >
          <option value="tunai">Tunai</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={200} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}

function DialogKoreksiTabungan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const saldo = n.saldoTabungan ?? 0;
  const [saldoBaru, setSaldoBaru] = useState<number | null>(saldo);
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.nasabah[":id"]["koreksi-tabungan"].$post({
          param: { id: n.id },
          json: { saldoBaru: saldoBaru ?? 0, saldoSebelum: saldo, alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  const selisih = (saldoBaru ?? 0) - saldo;
  return (
    <DialogFormulir
      judul={`Koreksi tabungan ${n.nama}`}
      keterangan="Membetulkan angka tabungan yang salah catat — tanpa uang keluar/masuk."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Simpan koreksi"
      bisaKirim={saldoBaru !== null && selisih !== 0 && alasan.trim() !== ""}
    >
      <IsianRupiah
        label="Tabungan yang benar"
        nilai={saldoBaru}
        ubah={setSaldoBaru}
        petunjuk={`Sekarang ${rupiah(saldo)} · selisih ${selisih > 0 ? "+" : ""}${rupiah(selisih)}`}
      />
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={200} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}

function DialogPutihkan({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const [alasan, setAlasan] = useState<(typeof ALASAN_PUTIH)[number]["nilai"]>("macet_lama");
  const [keterangan, setKeterangan] = useState("");
  const p = n.pinjamanAktif;
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pinjaman[":id"].putihkan.$post({
          param: { id: p?.id ?? "" },
          json: { alasan, keterangan: keterangan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Putihkan pinjaman ${n.nama}?`}
      keterangan={`Piutang ${rupiah(p?.saldo ?? 0)} dihapus tanpa uang masuk; tabungan tidak disentuh dan nasabah diblokir.`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Putihkan"
      bahaya
      bisaKirim={!!p && keterangan.trim() !== ""}
    >
      <Medan label="Alasan">
        <PilihanAsli value={alasan} onChange={(e) => setAlasan(e.target.value as typeof alasan)}>
          {ALASAN_PUTIH.map((a) => (
            <option key={a.nilai} value={a.nilai}>
              {a.label}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <Medan label="Keterangan">
        <Textarea
          value={keterangan}
          maxLength={200}
          onChange={(e) => setKeterangan(e.target.value)}
        />
      </Medan>
    </DialogFormulir>
  );
}

function DialogBukaBlokir({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.nasabah[":id"]["buka-blokir"].$post({
          param: { id: n.id },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Buka blokir ${n.nama}?`}
      keterangan="Nasabah boleh meminjam lagi."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Buka blokir"
      bisaKirim={alasan.trim() !== ""}
    >
      <Medan label="Alasan">
        <Textarea value={alasan} maxLength={100} onChange={(e) => setAlasan(e.target.value)} />
      </Medan>
    </DialogFormulir>
  );
}

function DialogRem({ n, tutup }: { n: Nasabah; tutup: () => void }) {
  const segarkan = useSegarkanNasabah();
  const aktif = useQuery({
    queryKey: ["kebijakan", "aktif"],
    queryFn: () => ambil(() => api.kebijakan.aktif.$get()),
  });
  const lama = aktif.data?.find((r) => r.lapis === "nasabah" && r.sasaran?.id === n.id);
  const [isi, setIsi] = useState<{ naik: boolean; gulung: boolean; alasan: string } | null>(null);
  const nilai = isi ?? {
    naik: lama?.naikPinjamanDikunci ?? false,
    gulung: lama?.gulungPinjamanDikunci ?? false,
    alasan: lama?.alasanKunci ?? "",
  };
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kebijakan.nasabah[":nasabahId"].$put({
          param: { nasabahId: n.id },
          json: {
            naikPinjamanDikunci: nilai.naik,
            gulungPinjamanDikunci: nilai.gulung,
            alasanKunci: nilai.alasan.trim() || null,
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
      judul={`Rem pinjaman ${n.nama}`}
      keterangan="Rem lapis nasabah. Melarang pinjaman baru sama sekali = blokir (lewat pemutihan)."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message ?? aktif.error?.message}
      bisaKirim={!aktif.isPending}
    >
      {(
        [
          ["naik", "Kunci naik pinjaman (gulung dengan pokok lebih besar)"],
          ["gulung", "Kunci gulung"],
        ] as const
      ).map(([kunci, label]) => (
        <label key={kunci} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={nilai[kunci]}
            onChange={(e) => setIsi({ ...nilai, [kunci]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <Isian
        label="Alasan (opsional)"
        value={nilai.alasan}
        maxLength={100}
        onChange={(e) => setIsi({ ...nilai, alasan: e.target.value })}
      />
    </DialogFormulir>
  );
}

// ---- tab rincian ------------------------------------------------------------------

function Neraca({ id }: { id: string }) {
  const q = useQuery({
    queryKey: ["nasabah", "neraca", id],
    queryFn: () => ambil(() => api.nasabah[":id"].neraca.$get({ param: { id } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const r = q.data;
  return (
    <div className="grid gap-x-8 sm:grid-cols-2">
      <div className="divide-y">
        <BarisNilai label="Jumlah pinjaman">{r.jumlahPinjaman}</BarisNilai>
        <BarisNilai label="Uang diterima nasabah">{rupiah(r.totalPencairan)}</BarisNilai>
        <BarisNilai label="Tabungan dikembalikan">{rupiah(r.tabunganDikembalikan)}</BarisNilai>
        <BarisNilai label="Total setoran">{rupiah(r.totalSetoran)}</BarisNilai>
        <BarisNilai label="Arus kas kantor">
          <span className={r.arusKas < 0 ? "text-red-700" : "text-emerald-700"}>
            {rupiah(r.arusKas)}
          </span>
        </BarisNilai>
      </div>
      <div className="divide-y">
        <BarisNilai label="Tabungan">{rupiah(r.tabungan)}</BarisNilai>
        <BarisNilai label="Piutang aktif">{rupiah(r.piutangAktif)}</BarisNilai>
        <BarisNilai label="Piutang diputihkan">{rupiah(r.piutangDiputihkan)}</BarisNilai>
        <BarisNilai label="Neraca (tabungan − piutang)">
          <span className={r.neraca < 0 ? "text-red-700" : undefined}>{rupiah(r.neraca)}</span>
        </BarisNilai>
      </div>
    </div>
  );
}

function RiwayatTabungan({ id }: { id: string }) {
  const hariIni = useHariIni();
  const segarkan = useSegarkanNasabah();
  const [batal, setBatal] = useState<{ id: string; nominal: number } | null>(null);
  const [alasan, setAlasan] = useState("");
  const tarik = useQuery({
    queryKey: ["nasabah", "penarikan", id],
    queryFn: () => ambil(() => api.nasabah[":id"]["penarikan-tabungan"].$get({ param: { id } })),
  });
  const koreksi = useQuery({
    queryKey: ["nasabah", "koreksi", id],
    queryFn: () => ambil(() => api.nasabah[":id"]["koreksi-tabungan"].$get({ param: { id } })),
  });
  const kirimBatal = useMutation({
    mutationFn: (penarikanId: string) =>
      ambil(() =>
        api["penarikan-tabungan"][":id"].batal.$post({
          param: { id: penarikanId },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      segarkan();
      setBatal(null);
      setAlasan("");
    },
  });
  if (tarik.isPending || koreksi.isPending) return <Memuat />;
  if (tarik.isError) return <GalatMuat galat={tarik.error} />;
  if (koreksi.isError) return <GalatMuat galat={koreksi.error} />;

  const baris = [
    ...tarik.data.map((t) => ({
      kunci: `t-${t.id}`,
      tanggal: t.tanggal,
      judul: `Penarikan (${t.dariAkun})`,
      nominal: -t.nominal,
      alasan: t.dibatalkanAt ? `Dibatalkan: ${t.alasanBatal}` : t.alasan,
      oleh: t.dibuatOleh.nama,
      batal: !!t.dibatalkanAt,
      bisaBatal: !t.dibatalkanAt && t.tanggal === hariIni ? t : null,
    })),
    ...koreksi.data.map((k) => ({
      kunci: `k-${k.id}`,
      tanggal: k.tanggal,
      judul: `Koreksi ${rupiah(k.saldoSebelum)} → ${rupiah(k.saldoSesudah)}`,
      nominal: k.selisih,
      alasan: k.alasan,
      oleh: k.dibuatOleh.nama,
      batal: false,
      bisaBatal: null,
    })),
  ].sort((a, b) => b.tanggal.localeCompare(a.tanggal));

  if (baris.length === 0) return <Kosong>Belum ada penarikan atau koreksi</Kosong>;
  return (
    <>
      <ul className="divide-y text-sm">
        {baris.map((b) => (
          <li key={b.kunci} className="flex items-start gap-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className={cn("block font-medium", b.batal && "line-through")}>{b.judul}</span>
              <span className="block text-xs text-muted-foreground">
                {formatTanggal(b.tanggal)} · {b.oleh} · {b.alasan}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 tabular-nums",
                b.batal && "text-muted-foreground line-through",
              )}
            >
              {b.nominal > 0 ? "+" : ""}
              {rupiah(b.nominal)}
            </span>
            {b.bisaBatal ? (
              <Button
                size="icon"
                variant="ghost"
                title="Batalkan penarikan"
                aria-label="Batalkan penarikan"
                onClick={() => {
                  const t = b.bisaBatal;
                  if (t) setBatal({ id: t.id, nominal: t.nominal });
                }}
              >
                <Undo2 />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <DialogFormulir
        judul="Batalkan penarikan?"
        keterangan={`${rupiah(batal?.nominal ?? 0)} kembali ke tabungan nasabah. Hanya di hari yang sama.`}
        buka={batal !== null}
        ubahBuka={(b) => !b && setBatal(null)}
        kirim={() => batal && kirimBatal.mutate(batal.id)}
        memuat={kirimBatal.isPending}
        galat={kirimBatal.error?.message}
        labelKirim="Batalkan"
        bahaya
        bisaKirim={alasan.trim() !== ""}
      >
        <Medan label="Alasan">
          <Textarea value={alasan} maxLength={100} onChange={(e) => setAlasan(e.target.value)} />
        </Medan>
      </DialogFormulir>
    </>
  );
}

// ---- dialog rincian ---------------------------------------------------------------

type Aksi = "sunting" | "pindah" | "tarik" | "koreksi" | "putihkan" | "buka-blokir" | "rem";

/** Rincian satu nasabah: identitas, neraca, tabungan, dan semua aksi bos. */
export function DialogNasabah({
  n,
  kolektor,
  kampung,
  tutup,
}: {
  n: Nasabah;
  kolektor: Kolektor[];
  kampung: string[];
  tutup: () => void;
}) {
  const [aksi, setAksi] = useState<Aksi | null>(null);
  const [riwayat, setRiwayat] = useState(false);
  const selesai = () => setAksi(null);
  const p = n.pinjamanAktif;

  const tombol: { aksi: Aksi; label: string; ikon: ReactNode; tampil: boolean }[] = [
    { aksi: "sunting", label: "Sunting", ikon: <Pencil />, tampil: true },
    { aksi: "pindah", label: "Pindah pemegang", ikon: <ArrowRightLeft />, tampil: true },
    { aksi: "tarik", label: "Tarik tabungan", ikon: <PiggyBank />, tampil: !!n.saldoTabungan },
    { aksi: "koreksi", label: "Koreksi tabungan", ikon: <PencilLine />, tampil: true },
    { aksi: "rem", label: "Rem", ikon: <ShieldAlert />, tampil: true },
    { aksi: "putihkan", label: "Putihkan", ikon: <Eraser />, tampil: !!p },
    { aksi: "buka-blokir", label: "Buka blokir", ikon: <LockOpen />, tampil: !!n.diblokir },
  ];

  return (
    <>
      <Dialog open onOpenChange={(b) => !b && tutup()}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              {n.nama}
              {n.diblokir ? (
                <Badge variant="destructive">
                  <Ban />
                  Diblokir
                </Badge>
              ) : null}
              {p ? (
                <Badge variant={p.status === "macet" ? "warning" : "success"}>
                  {p.status === "macet" ? "Macet" : "Berjalan"} · {rupiah(p.saldo)}
                </Badge>
              ) : (
                <Badge variant="secondary">Tanpa pinjaman aktif</Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {n.kampung.nama} · dipegang {n.kolektor?.nama ?? "—"}
              {n.nomorHp ? ` · ${n.nomorHp}` : ""}
              {n.nik ? ` · NIK ${n.nik}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {tombol
              .filter((t) => t.tampil)
              .map((t) => (
                <Button
                  key={t.aksi}
                  size="sm"
                  variant={t.aksi === "putihkan" ? "destructive" : "outline"}
                  onClick={() => setAksi(t.aksi)}
                >
                  {t.ikon}
                  {t.label}
                </Button>
              ))}
            <Button size="sm" variant="ghost" onClick={() => setRiwayat(true)}>
              <History />
              Riwayat suntingan
            </Button>
            {n.lokasi ? (
              <Button size="sm" variant="ghost" asChild>
                <a
                  href={`https://www.google.com/maps?q=${n.lokasi.latitude},${n.lokasi.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin />
                  Titik rumah
                </a>
              </Button>
            ) : null}
          </div>

          <Tabs defaultValue="pinjaman">
            <TabsList>
              <TabsTrigger value="pinjaman">Pinjaman</TabsTrigger>
              <TabsTrigger value="peristiwa">Setoran & libur</TabsTrigger>
              <TabsTrigger value="neraca">Neraca</TabsTrigger>
              <TabsTrigger value="tabungan">Tabungan · {rupiah(n.saldoTabungan ?? 0)}</TabsTrigger>
            </TabsList>
            <TabsContent value="pinjaman">
              <TabPinjaman nasabahId={n.id} />
            </TabsContent>
            <TabsContent value="peristiwa">
              <TabPeristiwa nasabahId={n.id} />
            </TabsContent>
            <TabsContent value="neraca">
              <Neraca id={n.id} />
            </TabsContent>
            <TabsContent value="tabungan">
              <RiwayatTabungan id={n.id} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {aksi === "sunting" ? <DialogSunting n={n} kampung={kampung} tutup={selesai} /> : null}
      {aksi === "pindah" ? <DialogPindah n={n} kolektor={kolektor} tutup={selesai} /> : null}
      {aksi === "tarik" ? <DialogTarikTabungan n={n} tutup={selesai} /> : null}
      {aksi === "koreksi" ? <DialogKoreksiTabungan n={n} tutup={selesai} /> : null}
      {aksi === "putihkan" ? <DialogPutihkan n={n} tutup={selesai} /> : null}
      {aksi === "buka-blokir" ? <DialogBukaBlokir n={n} tutup={selesai} /> : null}
      {aksi === "rem" ? <DialogRem n={n} tutup={selesai} /> : null}
      {riwayat ? (
        <DialogRiwayat
          tabel="nasabah"
          barisId={n.id}
          judul={`Riwayat suntingan ${n.nama}`}
          tutup={() => setRiwayat(false)}
        />
      ) : null}
    </>
  );
}
