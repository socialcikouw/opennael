import { geserTanggal, kunciWilayah, rapikanNamaWilayah } from "@opennael/domain";
import { tanggal as formatTanggal, persen, waktu } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, Undo2 } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PesanGalat, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KepalaHalaman, Kosong, Memuat } from "@/komponen/halaman";
import { type Kolom, pembantuKolom, TabelData } from "@/komponen/tabel-data";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api } from "@/lib/api";
import { useHariIni, useKantor } from "@/lib/kantor";
import { sesi } from "@/lib/sesi";

const rute = getRouteApi("/bos/pengaturan");

const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
/** Urutan tampil Senin dulu. */
const URUT_HARI = [1, 2, 3, 4, 5, 6, 0];

const daftarHari = (h: number[]) =>
  URUT_HARI.filter((x) => h.includes(x))
    .map((x) => NAMA_HARI[x]?.slice(0, 3))
    .join(", ");

function Bagian({
  judul,
  keterangan,
  children,
}: {
  judul: string;
  keterangan?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{judul}</CardTitle>
        {keterangan ? <CardDescription>{keterangan}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

function Pesan({ ok, galat }: { ok?: string | null; galat?: string | null | undefined }) {
  if (galat) return <PesanGalat pesan={galat} />;
  if (ok) return <p className="text-sm text-emerald-700">{ok}</p>;
  return null;
}

// ---- kantor -------------------------------------------------------------------------

const ambilKantor = () => ambil(() => api.kantor.kantor.$get());

function ProfilKantor() {
  const klien = useQueryClient();
  const q = useQuery({ queryKey: ["kantor"], queryFn: ambilKantor });
  const [isi, setIsi] = useState<{
    nama: string;
    zonaWaktu: "WIB" | "WITA" | "WIT";
    jamBuka: string;
    jamTutup: string;
  } | null>(null);
  useEffect(() => {
    if (q.data && !isi) {
      setIsi({
        nama: q.data.nama,
        zonaWaktu: q.data.zonaWaktu,
        jamBuka: q.data.jamBuka.slice(0, 5),
        jamTutup: q.data.jamTutup.slice(0, 5),
      });
    }
  }, [q.data, isi]);
  const m = useMutation({
    mutationFn: async () => {
      if (!isi || !q.data) throw new Error("Data kantor belum dimuat");
      const ubah = {
        ...(isi.nama.trim() !== q.data.nama ? { nama: isi.nama.trim() } : {}),
        ...(isi.zonaWaktu !== q.data.zonaWaktu ? { zonaWaktu: isi.zonaWaktu } : {}),
        ...(isi.jamBuka !== q.data.jamBuka.slice(0, 5) ? { jamBuka: isi.jamBuka } : {}),
        ...(isi.jamTutup !== q.data.jamTutup.slice(0, 5) ? { jamTutup: isi.jamTutup } : {}),
      };
      const hasil = await ambil(() => api.kantor.kantor.$patch({ json: ubah }));
      // Nama & zona kantor juga tersimpan di sesi (menu & jam tampilan).
      const s = sesi.ambil();
      if (s) {
        sesi.simpan({
          ...s,
          pengguna: {
            ...s.pengguna,
            kantor: { ...s.pengguna.kantor, nama: hasil.nama, zonaWaktu: hasil.zonaWaktu },
          },
        });
      }
      return hasil;
    },
    onSuccess: () => void klien.invalidateQueries({ queryKey: ["kantor"] }),
  });
  if (q.isPending || !isi) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  return (
    <Bagian
      judul="Profil kantor"
      keterangan="Jam kerja membatasi kapan kolektor bisa mencatat di lapangan. Zona waktu menentukan tanggal pembukuan."
    >
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <Isian
          label="Nama kantor"
          value={isi.nama}
          maxLength={100}
          onChange={(e) => setIsi({ ...isi, nama: e.target.value })}
        />
        <Medan label="Zona waktu">
          <PilihanAsli
            value={isi.zonaWaktu}
            onChange={(e) => setIsi({ ...isi, zonaWaktu: e.target.value as typeof isi.zonaWaktu })}
          >
            <option value="WIB">WIB (UTC+7)</option>
            <option value="WITA">WITA (UTC+8)</option>
            <option value="WIT">WIT (UTC+9)</option>
          </PilihanAsli>
        </Medan>
        <div className="grid grid-cols-2 gap-3">
          <Isian
            label="Jam buka"
            placeholder="07:00"
            pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$"
            value={isi.jamBuka}
            onChange={(e) => setIsi({ ...isi, jamBuka: e.target.value })}
          />
          <Isian
            label="Jam tutup"
            placeholder="24:00"
            pattern="^([01][0-9]|2[0-3]):[0-5][0-9]$|^24:00$"
            petunjuk="24:00 = tengah malam"
            value={isi.jamTutup}
            onChange={(e) => setIsi({ ...isi, jamTutup: e.target.value })}
          />
        </div>
        <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
        <Button type="submit" className="w-fit" disabled={m.isPending}>
          {m.isPending ? "Menyimpan…" : "Simpan profil"}
        </Button>
      </form>
    </Bagian>
  );
}

function PekanKerja() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const kantor = useQuery({ queryKey: ["kantor"], queryFn: ambilKantor });
  const riwayat = useQuery({
    queryKey: ["kantor", "pekan-kerja"],
    queryFn: () => ambil(() => api.kantor.kantor["pekan-kerja"].$get()),
  });
  const [hari, setHari] = useState<number[] | null>(null);
  const [mulai, setMulai] = useState(hariIni);
  const pilihan = hari ?? kantor.data?.hariKerja ?? [];
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor.kantor["pekan-kerja"].$put({
          json: { hariKerja: pilihan, berlakuMulai: mulai },
        }),
      ),
    onSuccess: () => {
      setHari(null);
      void klien.invalidateQueries({ queryKey: ["kantor"] });
    },
  });
  return (
    <Bagian
      judul="Pekan kerja"
      keterangan="Hari kantor menagih. Perubahan berlaku mulai tanggal yang dipilih — tidak boleh mundur."
    >
      <div className="flex flex-wrap gap-2">
        {URUT_HARI.map((h) => {
          const aktif = pilihan.includes(h);
          return (
            <Button
              key={h}
              size="sm"
              variant={aktif ? "default" : "outline"}
              aria-pressed={aktif}
              onClick={() =>
                setHari(aktif ? pilihan.filter((x) => x !== h) : [...pilihan, h].sort())
              }
            >
              {NAMA_HARI[h]}
            </Button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Medan label="Berlaku mulai">
          <Input
            type="date"
            className="w-44"
            min={hariIni}
            value={mulai}
            onChange={(e) => setMulai(e.target.value || hariIni)}
          />
        </Medan>
        <Button
          disabled={m.isPending || hari === null || pilihan.length === 0}
          onClick={() => m.mutate()}
        >
          {m.isPending ? "Menyimpan…" : "Simpan pekan kerja"}
        </Button>
      </div>
      <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
      {riwayat.data && riwayat.data.length > 0 ? (
        <ul className="divide-y text-sm">
          {riwayat.data.map((p) => (
            <li key={p.berlakuMulai} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                Mulai {formatTanggal(p.berlakuMulai)}
                {p.berlakuMulai > hariIni ? (
                  <Badge variant="warning" className="ml-2">
                    Akan datang
                  </Badge>
                ) : null}
              </span>
              <span className="text-muted-foreground">
                {daftarHari(p.hariKerja)} · {p.dibuatOleh.nama}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Bagian>
  );
}

// ---- rem ----------------------------------------------------------------------------

type IsiRem = { baru: boolean; naik: boolean; gulung: boolean; alasan: string };

function SaklarRem({ isi, ubah }: { isi: IsiRem; ubah: (r: IsiRem) => void }) {
  return (
    <div className="space-y-2">
      {(
        [
          ["baru", "Kunci pinjaman baru (orang baru & pinjam lagi)"],
          ["naik", "Kunci naik pinjaman"],
          ["gulung", "Kunci gulung"],
        ] as const
      ).map(([k, label]) => (
        <label key={k} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={isi[k]}
            onChange={(e) => ubah({ ...isi, [k]: e.target.checked })}
          />
          {label}
        </label>
      ))}
      <Isian
        label="Alasan (tampil di HP kolektor)"
        value={isi.alasan}
        maxLength={100}
        onChange={(e) => ubah({ ...isi, alasan: e.target.value })}
      />
    </div>
  );
}

const keInput = (r: IsiRem) => ({
  pinjamanBaruDikunci: r.baru,
  naikPinjamanDikunci: r.naik,
  gulungPinjamanDikunci: r.gulung,
  alasanKunci: r.alasan.trim() || null,
});

function DialogRemKolektor({
  kolektor,
  aktif,
  tutup,
}: {
  kolektor: { id: string; nama: string }[];
  aktif: { id: string; isi: IsiRem }[];
  tutup: () => void;
}) {
  const klien = useQueryClient();
  const [kolektorId, setKolektorId] = useState(kolektor[0]?.id ?? "");
  const kosong: IsiRem = { baru: false, naik: false, gulung: false, alasan: "" };
  const [isi, setIsi] = useState<IsiRem | null>(null);
  const nilai = isi ?? aktif.find((a) => a.id === kolektorId)?.isi ?? kosong;
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor.kebijakan.kolektor[":kolektorId"].$put({
          param: { kolektorId },
          json: keInput(nilai),
        }),
      ),
    onSuccess: () => {
      void klien.invalidateQueries({ queryKey: ["kebijakan"] });
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Rem kolektor"
      keterangan="Berlaku untuk satu kolektor, di atas rem kantor. Semua saklar mati = rem dilepas."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      bisaKirim={kolektorId !== ""}
    >
      <Medan label="Kolektor">
        <PilihanAsli
          value={kolektorId}
          onChange={(e) => {
            setKolektorId(e.target.value);
            setIsi(null);
          }}
        >
          {kolektor.map((k) => (
            <option key={k.id} value={k.id}>
              {k.nama}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <SaklarRem isi={nilai} ubah={setIsi} />
    </DialogFormulir>
  );
}

function Rem() {
  const klien = useQueryClient();
  const [dialogKolektor, setDialogKolektor] = useState(false);
  const aktif = useQuery({
    queryKey: ["kebijakan", "aktif"],
    queryFn: () => ambil(() => api.kantor.kebijakan.aktif.$get()),
  });
  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const remKantor = aktif.data?.find((r) => r.lapis === "kantor");
  const [isi, setIsi] = useState<IsiRem | null>(null);
  const nilai: IsiRem = isi ?? {
    baru: remKantor?.pinjamanBaruDikunci ?? false,
    naik: remKantor?.naikPinjamanDikunci ?? false,
    gulung: remKantor?.gulungPinjamanDikunci ?? false,
    alasan: remKantor?.alasanKunci ?? "",
  };
  const m = useMutation({
    mutationFn: () => ambil(() => api.kantor.kebijakan.kantor.$put({ json: keInput(nilai) })),
    onSuccess: () => {
      setIsi(null);
      void klien.invalidateQueries({ queryKey: ["kebijakan"] });
    },
  });
  const remKolektor = (aktif.data ?? [])
    .filter((r) => r.lapis === "kolektor" && r.sasaran)
    .map((r) => ({
      id: r.sasaran?.id ?? "",
      isi: {
        baru: r.pinjamanBaruDikunci,
        naik: r.naikPinjamanDikunci,
        gulung: r.gulungPinjamanDikunci,
        alasan: r.alasanKunci ?? "",
      },
    }));
  const LABEL_LAPIS = { kantor: "Kantor", kolektor: "Kolektor", nasabah: "Nasabah" } as const;

  return (
    <>
      <Bagian
        judul="Rem kantor"
        keterangan="Menahan pinjaman di seluruh kantor, mis. saat modal menipis."
      >
        {aktif.isPending ? (
          <Memuat />
        ) : (
          <div className="max-w-md space-y-3">
            <SaklarRem isi={nilai} ubah={setIsi} />
            <Pesan ok={m.isSuccess ? "Tersimpan" : null} galat={m.error?.message} />
            <Button disabled={m.isPending || isi === null} onClick={() => m.mutate()}>
              {m.isPending ? "Menyimpan…" : "Simpan rem kantor"}
            </Button>
          </div>
        )}
      </Bagian>
      <Bagian
        judul="Rem yang menyala"
        keterangan="Semua lapis. Rem nasabah diatur dari layar Nasabah."
      >
        <Button
          variant="outline"
          className="w-fit"
          disabled={!kolektorQ.data?.length}
          onClick={() => setDialogKolektor(true)}
        >
          <Plus />
          Atur rem kolektor
        </Button>
        {aktif.isError ? <GalatMuat galat={aktif.error} /> : null}
        {aktif.data && aktif.data.length === 0 ? <Kosong>Tidak ada rem yang menyala</Kosong> : null}
        <ul className="divide-y text-sm">
          {aktif.data?.map((r) => (
            <li
              key={`${r.lapis}-${r.sasaran?.id ?? "kantor"}`}
              className="flex flex-wrap justify-between gap-2 py-2"
            >
              <span className="flex items-center gap-2">
                <Badge variant="secondary">{LABEL_LAPIS[r.lapis]}</Badge>
                {r.sasaran?.nama ?? "Seluruh kantor"}
              </span>
              <span className="text-muted-foreground">
                {[
                  r.pinjamanBaruDikunci && "pinjaman baru",
                  r.naikPinjamanDikunci && "naik",
                  r.gulungPinjamanDikunci && "gulung",
                ]
                  .filter(Boolean)
                  .join(", ")}
                {r.alasanKunci ? ` · ${r.alasanKunci}` : ""} · {r.diubahOleh.nama}
              </span>
            </li>
          ))}
        </ul>
      </Bagian>
      {dialogKolektor && kolektorQ.data ? (
        <DialogRemKolektor
          kolektor={kolektorQ.data.map((o) => ({ id: o.id, nama: o.nama }))}
          aktif={remKolektor}
          tutup={() => setDialogKolektor(false)}
        />
      ) : null}
    </>
  );
}

// ---- libur kantor -------------------------------------------------------------------

function LiburKantor() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const sampai = geserTanggal(hariIni, 365);
  const q = useQuery({
    queryKey: ["libur-kantor", hariIni],
    queryFn: () =>
      ambil(() =>
        api.kantor["libur-kantor"].$get({
          query: { tanggalMulai: hariIni, tanggalSelesai: sampai },
        }),
      ),
  });
  const [isi, setIsi] = useState({ mulai: hariIni, selesai: "", alasan: "" });
  const [batal, setBatal] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kantor["libur-kantor"].$post({
          json: {
            tanggalMulai: isi.mulai,
            ...(isi.selesai ? { tanggalSelesai: isi.selesai } : {}),
            alasan: isi.alasan.trim(),
          },
        }),
      ),
    onSuccess: () => {
      setIsi({ mulai: hariIni, selesai: "", alasan: "" });
      void klien.invalidateQueries({ queryKey: ["libur-kantor"] });
    },
  });
  const kirim = (e: FormEvent) => {
    e.preventDefault();
    m.mutate();
  };
  return (
    <Bagian
      judul="Libur kantor"
      keterangan="Hari tanpa penagihan (mis. Lebaran). Hari ini atau ke depan; rentang dipecah per tanggal."
    >
      <form className="flex flex-wrap items-end gap-3" onSubmit={kirim}>
        <Medan label="Dari">
          <Input
            type="date"
            className="w-40"
            min={hariIni}
            value={isi.mulai}
            onChange={(e) => setIsi({ ...isi, mulai: e.target.value || hariIni })}
          />
        </Medan>
        <Medan label="Sampai (opsional)">
          <Input
            type="date"
            className="w-40"
            min={isi.mulai}
            value={isi.selesai}
            onChange={(e) => setIsi({ ...isi, selesai: e.target.value })}
          />
        </Medan>
        <Medan label="Alasan" className="min-w-48 flex-1">
          <Input
            value={isi.alasan}
            maxLength={100}
            onChange={(e) => setIsi({ ...isi, alasan: e.target.value })}
          />
        </Medan>
        <Button type="submit" disabled={m.isPending || isi.alasan.trim() === ""}>
          <Plus />
          Tetapkan libur
        </Button>
      </form>
      <Pesan
        ok={
          m.data
            ? `Ditambah ${m.data.ditambah.length} hari${m.data.dilewati.length ? `, ${m.data.dilewati.length} sudah ada` : ""}`
            : null
        }
        galat={m.error?.message}
      />
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} />
      ) : q.data.length === 0 ? (
        <Kosong>Tidak ada libur kantor setahun ke depan</Kosong>
      ) : (
        <ul className="divide-y text-sm">
          {q.data.map((l) => (
            <li key={l.tanggal} className="flex items-center justify-between gap-2 py-1.5">
              <span>
                {formatTanggal(l.tanggal)}{" "}
                <span className="text-muted-foreground">· {l.alasan}</span>
              </span>
              {l.tanggal > hariIni ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Batalkan libur"
                  aria-label={`Batalkan libur ${formatTanggal(l.tanggal)}`}
                  className="text-red-700"
                  onClick={() => setBatal(l.tanggal)}
                >
                  <Undo2 />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {batal ? (
        <DialogBatal
          judul={`Batalkan libur ${formatTanggal(batal)}?`}
          keterangan="Hari itu kembali menjadi hari tagih."
          segarkan={[["libur-kantor"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.kantor["libur-kantor"][":tanggal"].batal.$post({
                param: { tanggal: batal },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </Bagian>
  );
}

// ---- tarif gaji ---------------------------------------------------------------------

function TarifGaji() {
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

// ---- rute kolektor ------------------------------------------------------------------

function RuteKolektor() {
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

// ---- kampung ------------------------------------------------------------------------

const ambilKampung = (baru: boolean) =>
  ambil(() => api.kantor.wilayah.$get({ query: baru ? { baru: "7" } : {} }));
type Kampung = Awaited<ReturnType<typeof ambilKampung>>[number];

/** Segarkan semua yang memuat nama kampung. */
function useSegarkanKampung() {
  const klien = useQueryClient();
  return () => {
    for (const k of [["wilayah"], ["nasabah"], ["rute-kolektor"]]) {
      void klien.invalidateQueries({ queryKey: k });
    }
  };
}

function DialogGantiNama({ w, semua, tutup }: { w: Kampung; semua: Kampung[]; tutup: () => void }) {
  const segarkan = useSegarkanKampung();
  const [nama, setNama] = useState(w.nama);
  const rapi = rapikanNamaWilayah(nama);
  // Sama dengan pemeriksaan server: kunci sudah dipakai kampung lain → gabung.
  const tujuan = semua.find((x) => x.id !== w.id && x.kunci === kunciWilayah(rapi));
  const m = useMutation({
    mutationFn: () =>
      ambil(() => api.kantor.wilayah["ganti-nama"].$post({ json: { dari: w.id, ke: rapi } })),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Ganti nama ${w.nama}`}
      keterangan="Nasabah dan rute yang memakai kampung ini ikut berganti nama."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim={tujuan ? `Gabung ke ${tujuan.nama}` : "Simpan"}
      bahaya={!!tujuan}
      bisaKirim={rapi !== "" && rapi !== w.nama}
    >
      <Isian
        label="Nama baru"
        value={nama}
        maxLength={50}
        autoFocus
        onChange={(e) => setNama(e.target.value)}
      />
      {tujuan ? (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Nama ini sudah dipakai kampung <b>{tujuan.nama}</b>. {w.nama} akan digabung ke sana:{" "}
          {w.nasabahTotal} nasabah dan {w.dipakaiRute} rute pindah, lalu {w.nama} dihapus.
        </p>
      ) : null}
    </DialogFormulir>
  );
}

function DialogHapusKampung({ w, tutup }: { w: Kampung; tutup: () => void }) {
  const segarkan = useSegarkanKampung();
  const m = useMutation({
    mutationFn: () => ambil(() => api.kantor.wilayah[":id"].$delete({ param: { id: w.id } })),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul={`Hapus kampung ${w.nama}?`}
      keterangan="Kampung ini tidak dipakai nasabah maupun rute. Penghapusan tercatat di aktivitas."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Hapus"
      bahaya
    />
  );
}

function DaftarKampung() {
  const kantor = useKantor();
  const [baru, setBaru] = useState(false);
  const [cari, setCari] = useState("");
  const [aksi, setAksi] = useState<{ jenis: "ganti" | "hapus"; w: Kampung } | null>(null);
  const q = useQuery({ queryKey: ["wilayah", baru], queryFn: () => ambilKampung(baru) });
  const data = (q.data ?? []).filter((w) => w.kunci.includes(kunciWilayah(cari)));

  const kolom = useMemo(() => {
    const k = pembantuKolom<Kampung>();
    return [
      k.accessor("nama", {
        header: "Kampung",
        cell: (c) => <span className="font-medium">{c.getValue()}</span>,
      }),
      k.accessor("nasabahTotal", {
        header: "Nasabah",
        meta: { kanan: true },
        cell: (c) => `${c.row.original.nasabahAktif} aktif / ${c.getValue()}`,
      }),
      k.accessor("dipakaiRute", { header: "Rute", meta: { kanan: true } }),
      k.accessor("dibuatAt", {
        header: "Muncul",
        cell: (c) => (
          <span className="text-muted-foreground">
            {c.row.original.dibuatOleh.nama} · {waktu(c.getValue(), kantor.zonaWaktu)}
          </span>
        ),
      }),
      k.display({
        id: "aksi",
        header: "",
        cell: (c) => {
          const w = c.row.original;
          const kosong = w.nasabahTotal === 0 && w.dipakaiRute === 0;
          return (
            <div className="flex justify-end gap-1">
              <Button
                size="icon"
                variant="ghost"
                title="Ganti nama / gabung"
                aria-label={`Ganti nama ${w.nama}`}
                onClick={() => setAksi({ jenis: "ganti", w })}
              >
                <Pencil />
              </Button>
              {kosong ? (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Hapus kampung kosong"
                  aria-label={`Hapus ${w.nama}`}
                  className="text-red-700 hover:text-red-800"
                  onClick={() => setAksi({ jenis: "hapus", w })}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </div>
          );
        },
      }),
    ] as Kolom<Kampung>[];
  }, [kantor.zonaWaktu]);

  return (
    <Bagian
      judul="Kampung"
      keterangan="Kampung baru muncul dari formulir nasabah. Betulkan salah ketik dengan ganti nama — bila namanya sama dengan kampung lain, keduanya digabung."
    >
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="search"
          className="w-60"
          placeholder="Cari kampung…"
          value={cari}
          maxLength={50}
          onChange={(e) => setCari(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={baru}
            onChange={(e) => setBaru(e.target.checked)}
          />
          Hanya yang muncul 7 hari terakhir
        </label>
      </div>
      {q.isPending ? (
        <Memuat />
      ) : q.isError ? (
        <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />
      ) : (
        <TabelData
          kolom={kolom}
          data={data}
          idBaris={(w) => w.id}
          kosong={baru ? "Tidak ada kampung baru 7 hari terakhir" : "Belum ada kampung"}
        />
      )}
      {aksi?.jenis === "ganti" ? (
        <DialogGantiNama w={aksi.w} semua={q.data ?? []} tutup={() => setAksi(null)} />
      ) : null}
      {aksi?.jenis === "hapus" ? (
        <DialogHapusKampung w={aksi.w} tutup={() => setAksi(null)} />
      ) : null}
    </Bagian>
  );
}

// ---- layar --------------------------------------------------------------------------

const TAB = [
  { nilai: "kantor", label: "Kantor" },
  { nilai: "rem", label: "Rem" },
  { nilai: "libur", label: "Libur" },
  { nilai: "tarif", label: "Tarif gaji" },
  { nilai: "rute", label: "Rute kolektor" },
  { nilai: "kampung", label: "Kampung" },
] as const;
export type TabPengaturan = (typeof TAB)[number]["nilai"];

/** Pengaturan kantor: profil & pekan kerja, rem, libur, tarif gaji, rute kolektor. */
export function LayarPengaturan() {
  const { tab } = rute.useSearch();
  const navigasi = rute.useNavigate();
  return (
    <>
      <KepalaHalaman judul="Pengaturan" keterangan="Semua perubahan tercatat di aktivitas." />
      <Tabs
        value={tab ?? "kantor"}
        onValueChange={(v) =>
          void navigasi({
            search: { tab: v === "kantor" ? undefined : (v as Exclude<TabPengaturan, "kantor">) },
          })
        }
      >
        <TabsList>
          {TAB.map((t) => (
            <TabsTrigger key={t.nilai} value={t.nilai}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="kantor" className="space-y-6">
          <ProfilKantor />
          <PekanKerja />
        </TabsContent>
        <TabsContent value="rem" className="space-y-6">
          <Rem />
        </TabsContent>
        <TabsContent value="libur">
          <LiburKantor />
        </TabsContent>
        <TabsContent value="tarif">
          <TarifGaji />
        </TabsContent>
        <TabsContent value="rute">
          <RuteKolektor />
        </TabsContent>
        <TabsContent value="kampung">
          <DaftarKampung />
        </TabsContent>
      </Tabs>
    </>
  );
}
