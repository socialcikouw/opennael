import type { Peran } from "@opennael/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi, Link } from "@tanstack/react-router";
import { Pencil, Power, PowerOff, QrCode, Smartphone, Unplug } from "lucide-react";
import { useMemo, useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan } from "@/komponen/formulir";
import { GalatMuat, KepalaHalaman, Kosong, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { Textarea } from "@/komponen/ui/textarea";
import { ambil, api } from "@/lib/api";
import { tanggal, waktu } from "@/lib/format";
import { useKantor } from "@/lib/kantor";
import { useSesi } from "@/lib/sesi";
import { LABEL_PERAN } from "./aktivitas";

const rute = getRouteApi("/bos/karyawan");

const ambilPengguna = () => ambil(() => api.pengguna.$get({ query: { termasukNonaktif: "ya" } }));
type Karyawan = Awaited<ReturnType<typeof ambilPengguna>>[number];

type Aksi = {
  jenis: "sunting" | "nonaktifkan" | "aktifkan" | "perangkat";
  orang: Karyawan;
} | null;

// ---- perangkat ----------------------------------------------------------------------

const ambilPerangkat = (riwayat: boolean) =>
  ambil(() => api.auth.perangkat.$get({ query: riwayat ? { termasukDiputus: "true" } : {} }));
type Perangkat = Awaited<ReturnType<typeof ambilPerangkat>>[number];

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
function DialogPerangkat({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const kantor = useKantor();
  const klien = useQueryClient();
  const [riwayat, setRiwayat] = useState(false);
  const [putus, setPutus] = useState<Perangkat | null>(null);
  const q = useQuery({ queryKey: ["perangkat", riwayat], queryFn: () => ambilPerangkat(riwayat) });
  const m = useMutation({
    mutationFn: (id: string) => ambil(() => api.auth.perangkat[":id"].$delete({ param: { id } })),
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

/** Kolom yang benar-benar berubah; teks kosong = hapus (`null`). */
function perubahan(lama: Karyawan, isi: { nama: string; nomorHp: string; resort: string }) {
  const ubah: { nama?: string; nomorHp?: string | null; resort?: string | null } = {};
  if (isi.nama.trim() !== lama.nama) ubah.nama = isi.nama.trim();
  const hp = isi.nomorHp.trim() || null;
  if (hp !== lama.nomorHp) ubah.nomorHp = hp;
  if (lama.peran === "kolektor") {
    const resort = isi.resort.trim() || null;
    if (resort !== lama.resort) ubah.resort = resort;
  }
  return ubah;
}

function DialogSunting({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const [isi, setIsi] = useState({
    nama: orang.nama,
    nomorHp: orang.nomorHp ?? "",
    resort: orang.resort ?? "",
  });
  const ubah = perubahan(orang, isi);
  const simpan = useMutation({
    mutationFn: () =>
      ambil(() => api.pengguna[":id"].$patch({ param: { id: orang.id }, json: ubah })),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["pengguna"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Sunting ${orang.nama}`}
      keterangan={`${LABEL_PERAN[orang.peran]} · kosongkan nomor HP untuk menghapusnya`}
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => simpan.mutate()}
      memuat={simpan.isPending}
      galat={simpan.error?.message}
      bisaKirim={Object.keys(ubah).length > 0 && isi.nama.trim() !== ""}
    >
      <Isian
        label="Nama"
        value={isi.nama}
        maxLength={50}
        required
        onChange={(e) => setIsi({ ...isi, nama: e.target.value })}
      />
      <Isian
        label="Nomor HP"
        type="tel"
        placeholder="0812…"
        value={isi.nomorHp}
        onChange={(e) => setIsi({ ...isi, nomorHp: e.target.value })}
      />
      {orang.peran === "kolektor" ? (
        <Isian
          label="Resort"
          value={isi.resort}
          maxLength={50}
          onChange={(e) => setIsi({ ...isi, resort: e.target.value })}
        />
      ) : null}
    </DialogFormulir>
  );
}

function DialogNonaktifkan({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const [alasan, setAlasan] = useState("");
  const kirim = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.pengguna[":id"].nonaktifkan.$post({
          param: { id: orang.id },
          json: { alasan: alasan.trim() },
        }),
      ),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["pengguna"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Nonaktifkan ${orang.nama}?`}
      keterangan={
        orang.perangkatAktif > 0
          ? `${orang.perangkatAktif} HP yang tertaut langsung terputus. Kolektor yang masih memegang nasabah berpinjaman harus dipindahkan dulu.`
          : "Akun tidak bisa dipakai sampai diaktifkan lagi."
      }
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Nonaktifkan"
      bahaya
      bisaKirim={alasan.trim() !== ""}
    >
      <Medan label="Alasan">
        <Textarea
          value={alasan}
          maxLength={200}
          required
          onChange={(e) => setAlasan(e.target.value)}
        />
      </Medan>
    </DialogFormulir>
  );
}

function DialogAktifkan({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const kirim = useMutation({
    mutationFn: () => ambil(() => api.pengguna[":id"].aktifkan.$post({ param: { id: orang.id } })),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["pengguna"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Aktifkan ${orang.nama}?`}
      keterangan="Sesudah aktif, HP-nya perlu ditautkan ulang lewat menu Tautkan HP (pilih akun lama)."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => kirim.mutate()}
      memuat={kirim.isPending}
      galat={kirim.error?.message}
      labelKirim="Aktifkan"
    />
  );
}

const SARINGAN: { nilai: Peran | "semua"; label: string }[] = [
  { nilai: "semua", label: "Semua" },
  { nilai: "kolektor", label: "Kolektor" },
  { nilai: "kasir", label: "Kasir" },
  { nilai: "pengawas", label: "Pengawas" },
];

/** Daftar karyawan: sunting, nonaktifkan / aktifkan, tautkan HP. */
export function LayarKaryawan() {
  const s = useSesi();
  const { peran, nonaktif } = rute.useSearch();
  const navigasi = rute.useNavigate();
  const [aksi, setAksi] = useState<Aksi>(null);
  const q = useQuery({ queryKey: ["pengguna", "semua"], queryFn: ambilPengguna });

  const data = useMemo(
    () =>
      (q.data ?? []).filter((o) => (!peran || o.peran === peran) && (nonaktif === "ya" || o.aktif)),
    [q.data, peran, nonaktif],
  );

  const kolom = useMemo(() => {
    const k = pembantuKolom<Karyawan>();
    return [
      k.accessor("nama", {
        header: "Nama",
        cell: (c) => (
          <span className="font-medium">
            {c.getValue()}
            {c.row.original.id === s?.pengguna.id ? (
              <span className="text-muted-foreground"> (Anda)</span>
            ) : null}
          </span>
        ),
      }),
      k.accessor("peran", {
        header: "Peran",
        cell: (c) => <Badge variant="secondary">{LABEL_PERAN[c.getValue()]}</Badge>,
      }),
      k.accessor("nomorHp", { header: "Nomor HP", cell: (c) => c.getValue() ?? "—" }),
      k.accessor("resort", { header: "Resort", cell: (c) => c.getValue() ?? "—" }),
      k.accessor("perangkatAktif", {
        header: "HP tertaut",
        meta: { kanan: true },
        cell: (c) => (
          <Button
            size="sm"
            variant="ghost"
            className="tabular-nums"
            title="Lihat perangkat"
            onClick={() => setAksi({ jenis: "perangkat", orang: c.row.original })}
          >
            <Smartphone />
            {c.getValue()}
          </Button>
        ),
      }),
      k.accessor("aktif", {
        header: "Status",
        cell: (c) => {
          const o = c.row.original;
          return o.aktif ? (
            <Badge variant="success">Aktif</Badge>
          ) : (
            <span className="space-y-0.5">
              <Badge variant="destructive">Nonaktif</Badge>
              <span className="block max-w-56 truncate text-xs text-muted-foreground">
                {o.dinonaktifkanAt ? tanggal(o.dinonaktifkanAt.slice(0, 10), false) : ""}
                {o.alasanNonaktif ? ` · ${o.alasanNonaktif}` : ""}
              </span>
            </span>
          );
        },
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const o = c.row.original;
          const diri = o.id === s?.pengguna.id;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Sunting"
                aria-label={`Sunting ${o.nama}`}
                onClick={() => setAksi({ jenis: "sunting", orang: o })}
              >
                <Pencil />
              </Button>
              {diri ? null : o.aktif ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Nonaktifkan"
                  aria-label={`Nonaktifkan ${o.nama}`}
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setAksi({ jenis: "nonaktifkan", orang: o })}
                >
                  <PowerOff />
                </Button>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Aktifkan"
                  aria-label={`Aktifkan ${o.nama}`}
                  onClick={() => setAksi({ jenis: "aktifkan", orang: o })}
                >
                  <Power />
                </Button>
              )}
            </div>
          );
        },
      }),
    ] as Kolom<Karyawan>[];
  }, [s?.pengguna.id]);

  const tutup = () => setAksi(null);

  return (
    <>
      <KepalaHalaman
        judul="Karyawan"
        keterangan="Akun kasir, pengawas, dan kolektor. Akun baru dibuat saat menautkan HP."
        aksi={
          <Button asChild>
            <Link to="/tautkan">
              <QrCode />
              Tautkan HP
            </Link>
          </Button>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={peran ?? "semua"}
          onValueChange={(v) =>
            void navigasi({
              search: (x) => ({ ...x, peran: v === "semua" ? undefined : (v as Peran) }),
            })
          }
        >
          <TabsList>
            {SARINGAN.map((p) => (
              <TabsTrigger key={p.nilai} value={p.nilai}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={nonaktif === "ya"}
            onChange={(e) =>
              void navigasi({
                search: (x) => ({ ...x, nonaktif: e.target.checked ? "ya" : undefined }),
              })
            }
          />
          Tampilkan yang nonaktif
        </label>
      </div>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <TabelData kolom={kolom} data={data} idBaris={(o) => o.id} kosong="Belum ada karyawan" />
      )}
      {aksi?.jenis === "sunting" ? <DialogSunting orang={aksi.orang} tutup={tutup} /> : null}
      {aksi?.jenis === "nonaktifkan" ? (
        <DialogNonaktifkan orang={aksi.orang} tutup={tutup} />
      ) : null}
      {aksi?.jenis === "aktifkan" ? <DialogAktifkan orang={aksi.orang} tutup={tutup} /> : null}
      {aksi?.jenis === "perangkat" ? <DialogPerangkat orang={aksi.orang} tutup={tutup} /> : null}
    </>
  );
}
