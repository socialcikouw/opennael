import type { Aktivitas, HasilMigrasi } from "@opennael/contracts";
import { GalatAturan, type JenisPinjaman, syaratMigrasi, TENOR_PINJAMAN } from "@opennael/domain";
import { jam, LABEL_JENIS, rupiah } from "@opennael/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookCopy, Undo2, UserCheck } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { DialogBatal } from "@/komponen/dialog-batal";
import { Isian, Medan, PesanGalat, PilihanAsli } from "@/komponen/formulir";
import { GalatMuat, KepalaHalaman, Kosong, Memuat } from "@/komponen/halaman";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { Badge } from "@/komponen/ui/badge";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { Input } from "@/komponen/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api } from "@/lib/api";
import { useHariIni, useKantor } from "@/lib/kantor";
import { cn } from "@/lib/utils";

/**
 * SALIN DARI BUKU (aturan-usaha A10) — bos mengetik pinjaman yang masih
 * berjalan di buku lama, satu per satu. Kolektor, kampung, jenis, dan tenor
 * tetap terisi untuk baris berikutnya supaya menyalin satu halaman buku cepat.
 */

function useTenang<T>(nilai: T, ms = 300) {
  const [tenang, setTenang] = useState(nilai);
  useEffect(() => {
    const t = setTimeout(() => setTenang(nilai), ms);
    return () => clearTimeout(t);
  }, [nilai, ms]);
  return tenang;
}

type Orang = { nama: string; kampung: string; nomorHp: string; nik: string };
type NasabahLama = { id: string; nama: string; kampung: string; kolektor: string };

/** "Mungkin nasabah lama?" — NIK sama atau nama mirip (di kampung yang sama bila diisi). */
function SaranSerupa({ orang, pakai }: { orang: Orang; pakai: (n: NasabahLama) => void }) {
  const nama = useTenang(orang.nama.trim());
  const kampung = useTenang(orang.kampung.trim());
  const nik = orang.nik.length === 16 ? orang.nik : undefined;
  const q = useQuery({
    queryKey: ["nasabah", "serupa", nama, kampung, nik ?? null],
    queryFn: () =>
      ambil(() =>
        api.pembiayaan.nasabah.serupa.$get({
          query: { nama, ...(kampung ? { kampung } : {}), ...(nik ? { nik } : {}) },
        }),
      ),
    enabled: nama.length >= 2,
  });
  if (!q.data?.length) return null;
  return (
    <div className="space-y-1.5 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
      <p className="font-medium">Mungkin sudah terdaftar:</p>
      {q.data.map((n) => (
        <div key={n.id} className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {n.nama} · {n.kampung} · {n.kolektor.nama}
            {n.cocok === "nik" ? " · NIK sama" : ""}
            {n.diblokir ? " · diblokir" : n.punyaPinjamanAktif ? " · punya pinjaman aktif" : ""}
          </span>
          {!n.diblokir && !n.punyaPinjamanAktif ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                pakai({ id: n.id, nama: n.nama, kampung: n.kampung, kolektor: n.kolektor.nama })
              }
            >
              <UserCheck />
              Pakai nasabah ini
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Cari nasabah lama yang boleh meminjam lagi (tanpa pinjaman aktif, tak diblokir). */
function PilihNasabahLama({
  dipilih,
  pilih,
}: {
  dipilih: NasabahLama | null;
  pilih: (n: NasabahLama | null) => void;
}) {
  const [cari, setCari] = useState("");
  const tenang = useTenang(cari.trim());
  const q = useQuery({
    queryKey: ["nasabah", "bebas", tenang],
    queryFn: () =>
      ambil(() => api.pembiayaan.nasabah.$get({ query: { cari: tenang, bebas: "ya" } })),
    enabled: tenang.length >= 2,
  });
  if (dipilih) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
        <span>
          <span className="font-medium">{dipilih.nama}</span>
          <span className="text-muted-foreground">
            {" "}
            · {dipilih.kampung} · dipegang {dipilih.kolektor}
          </span>
        </span>
        <Button size="sm" variant="ghost" onClick={() => pilih(null)}>
          Ganti
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <Input
        type="search"
        placeholder="Ketik nama nasabah (tanpa pinjaman aktif)…"
        value={cari}
        onChange={(e) => setCari(e.target.value)}
      />
      {q.data ? (
        q.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada yang cocok</p>
        ) : (
          <ul className="max-h-48 divide-y overflow-y-auto rounded-md border text-sm">
            {q.data.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-muted/50"
                  onClick={() =>
                    pilih({
                      id: n.id,
                      nama: n.nama,
                      kampung: n.kampung.nama,
                      kolektor: n.kolektor?.nama ?? "—",
                    })
                  }
                >
                  <span className="font-medium">{n.nama}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {n.kampung.nama} · {n.kolektor?.nama ?? "—"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}

/** Pratinjau angka di HP bos sebelum dikirim — rumus yang sama dengan server. */
function pratinjau(
  jenis: JenisPinjaman,
  tenor: number,
  pokok: number | null,
  saldo: number | null,
  tabungan: number | null,
) {
  if (!pokok || !saldo) return null;
  try {
    return { ok: syaratMigrasi(jenis, pokok, tenor, saldo, tabungan ?? 0) } as const;
  } catch (e) {
    if (e instanceof GalatAturan) return { galat: e.message } as const;
    throw e;
  }
}

/** Salinan hari ini dari aktivitas — bisa dibatalkan di hari yang sama. */
function DisalinHariIni() {
  const kantor = useKantor();
  const hariIni = useHariIni();
  const [batal, setBatal] = useState<Aktivitas | null>(null);
  const q = useQuery({
    queryKey: ["aktivitas", hariIni, null],
    queryFn: () => ambil(() => api.pelaporan.aktivitas.$get({ query: { tanggal: hariIni } })),
  });
  if (q.isPending) return <Memuat />;
  if (q.isError) return <GalatMuat galat={q.error} ulangi={() => void q.refetch()} />;
  const batalId = new Set(
    q.data.filter((a) => a.kejadian === "batal_salin_pinjaman").map((a) => a.rujukan.id),
  );
  const salinan = q.data.filter((a) => a.kejadian === "salin_pinjaman");
  if (salinan.length === 0) return <Kosong>Belum ada yang disalin hari ini</Kosong>;
  return (
    <>
      <ul className="divide-y text-sm">
        {salinan.map((a) => {
          const dibatalkan = batalId.has(a.rujukan.id);
          return (
            <li key={a.rujukan.id} className="flex items-center gap-3 py-2">
              <span className="w-12 text-muted-foreground tabular-nums">
                {jam(a.waktu, kantor.zonaWaktu)}
              </span>
              <span className={cn("flex-1", dibatalkan && "text-muted-foreground line-through")}>
                {a.ringkasan.replace("Salin dari buku: ", "")}
              </span>
              <span className="tabular-nums">{rupiah(a.nominal ?? 0)}</span>
              {dibatalkan ? (
                <Badge variant="destructive">Batal</Badge>
              ) : (
                <Button
                  size="icon"
                  variant="ghost"
                  title="Batalkan salinan"
                  aria-label={`Batalkan salinan ${a.ringkasan}`}
                  className="text-red-700"
                  onClick={() => setBatal(a)}
                >
                  <Undo2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {batal ? (
        <DialogBatal
          judul="Batalkan salinan?"
          keterangan={`${batal.ringkasan}. Tabungan pembukanya ikut ditarik. Hanya hari ini, sebelum ada setoran.`}
          segarkan={[["nasabah"]]}
          tutup={() => setBatal(null)}
          kirim={(alasan) =>
            ambil(() =>
              api.pembiayaan.pinjaman[":id"].batal.$post({
                param: { id: batal.rujukan.id },
                json: { alasan },
              }),
            )
          }
        />
      ) : null}
    </>
  );
}

export function LayarSalinBuku() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const namaRef = useRef<HTMLInputElement>(null);

  const kolektorQ = useQuery({
    queryKey: ["pengguna", "kolektor"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { peran: "kolektor" } })),
  });
  const kampungQ = useQuery({
    queryKey: ["kampung"],
    queryFn: () => ambil(() => api.kantor.lapangan.kampung.$get()),
  });

  // Tetap untuk baris berikutnya.
  const [modus, setModus] = useState<"baru" | "lama">("baru");
  const [kolektorId, setKolektorId] = useState("");
  const [jenis, setJenis] = useState<JenisPinjaman>("harian");
  const [tenor, setTenor] = useState(24);
  // Diulang tiap baris.
  const [orang, setOrang] = useState<Orang>({ nama: "", kampung: "", nomorHp: "", nik: "" });
  const [lama, setLama] = useState<NasabahLama | null>(null);
  const [pokok, setPokok] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [tabungan, setTabungan] = useState<number | null>(0);
  const [tanggalAkad, setTanggalAkad] = useState("");
  const [pinjamanKe, setPinjamanKe] = useState("");
  const [macet, setMacet] = useState(false);
  const [terakhir, setTerakhir] = useState<HasilMigrasi | null>(null);

  const pilihKolektor = kolektorId || kolektorQ.data?.[0]?.id || "";
  const hitung = pratinjau(jenis, tenor, pokok, saldo, tabungan);

  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.migrasi.pinjaman.migrasi.$post({
          json: {
            nasabah:
              modus === "lama" && lama
                ? { nasabahId: lama.id }
                : {
                    nama: orang.nama.trim(),
                    kampung: { nama: orang.kampung.trim() },
                    ...(orang.nomorHp.trim() ? { nomorHp: orang.nomorHp.trim() } : {}),
                    ...(orang.nik ? { nik: orang.nik } : {}),
                  },
            ...(modus === "baru" ? { kolektorId: pilihKolektor } : {}),
            jenis,
            tenor,
            pokok: pokok ?? 0,
            tanggalAkad,
            saldo: saldo ?? 0,
            tabungan: tabungan ?? 0,
            ...(pinjamanKe ? { pinjamanKe: Number(pinjamanKe) } : {}),
            ...(macet ? { macet: true } : {}),
          },
        }),
      ),
    onSuccess: (hasil) => {
      setTerakhir(hasil);
      setOrang((o) => ({ nama: "", kampung: o.kampung, nomorHp: "", nik: "" }));
      setLama(null);
      setPokok(null);
      setSaldo(null);
      setTabungan(0);
      setPinjamanKe("");
      setMacet(false);
      for (const k of [["aktivitas"], ["nasabah"], ["kampung"]]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      namaRef.current?.focus();
    },
  });

  const nasabahSiap =
    modus === "lama"
      ? lama !== null
      : orang.nama.trim() !== "" &&
        orang.kampung.trim() !== "" &&
        pilihKolektor !== "" &&
        (orang.nik === "" || orang.nik.length === 16);
  const bisaKirim = nasabahSiap && !!hitung?.ok && tanggalAkad !== "" && tanggalAkad <= hariIni;

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (bisaKirim && !m.isPending) m.mutate();
  };

  return (
    <>
      <KepalaHalaman
        judul="Salin dari buku"
        keterangan="Pindahkan pinjaman yang masih berjalan di buku lama. Tanpa uang keluar — tidak tercatat sebagai droping."
        aksi={
          <Button asChild variant="outline">
            <Link to="/nasabah">
              <ArrowLeft />
              Nasabah
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardContent>
            <form className="grid gap-5" onSubmit={kirim}>
              <section className="grid gap-3">
                <Tabs
                  value={modus}
                  onValueChange={(v) => {
                    setModus(v as "baru" | "lama");
                    m.reset();
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="baru">Orang baru</TabsTrigger>
                    <TabsTrigger value="lama">Nasabah yang sudah ada</TabsTrigger>
                  </TabsList>
                </Tabs>
                {modus === "lama" ? (
                  <PilihNasabahLama dipilih={lama} pilih={setLama} />
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Medan label="Nama">
                        <Input
                          ref={namaRef}
                          value={orang.nama}
                          maxLength={50}
                          autoFocus
                          onChange={(e) => setOrang({ ...orang, nama: e.target.value })}
                        />
                      </Medan>
                      <Isian
                        label="Kampung"
                        list="kampung-salin"
                        value={orang.kampung}
                        maxLength={50}
                        onChange={(e) => setOrang({ ...orang, kampung: e.target.value })}
                      />
                      <datalist id="kampung-salin">
                        {kampungQ.data?.map((k) => (
                          <option key={k.id} value={k.nama} />
                        ))}
                      </datalist>
                      <Isian
                        label="Nomor HP (opsional)"
                        type="tel"
                        value={orang.nomorHp}
                        onChange={(e) => setOrang({ ...orang, nomorHp: e.target.value })}
                      />
                      <Isian
                        label="NIK (opsional)"
                        inputMode="numeric"
                        maxLength={16}
                        value={orang.nik}
                        onChange={(e) =>
                          setOrang({ ...orang, nik: e.target.value.replace(/\D/g, "") })
                        }
                      />
                    </div>
                    <Medan label="Kolektor pemegang">
                      <PilihanAsli
                        value={pilihKolektor}
                        onChange={(e) => setKolektorId(e.target.value)}
                      >
                        {(kolektorQ.data ?? []).map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nama}
                          </option>
                        ))}
                      </PilihanAsli>
                    </Medan>
                    <SaranSerupa
                      orang={orang}
                      pakai={(n) => {
                        setLama(n);
                        setModus("lama");
                      }}
                    />
                  </>
                )}
              </section>

              <section className="grid gap-3 sm:grid-cols-3">
                <Medan label="Jenis">
                  <PilihanAsli
                    value={jenis}
                    onChange={(e) => {
                      const j = e.target.value as JenisPinjaman;
                      setJenis(j);
                      setTenor(TENOR_PINJAMAN[j][0] ?? 0);
                    }}
                  >
                    {(Object.keys(LABEL_JENIS) as JenisPinjaman[]).map((j) => (
                      <option key={j} value={j}>
                        {LABEL_JENIS[j]}
                      </option>
                    ))}
                  </PilihanAsli>
                </Medan>
                <Medan label={jenis === "tempoan" ? "Jangka" : "Tenor"}>
                  <PilihanAsli value={tenor} onChange={(e) => setTenor(Number(e.target.value))}>
                    {TENOR_PINJAMAN[jenis].map((t) => (
                      <option key={t} value={t}>
                        {t} {jenis === "tempoan" ? "hari" : "kali"}
                      </option>
                    ))}
                  </PilihanAsli>
                </Medan>
                <IsianRupiah label="Pokok" nilai={pokok} ubah={setPokok} />
                <Medan label="Tanggal akad di buku">
                  <Input
                    type="date"
                    max={hariIni}
                    value={tanggalAkad}
                    onChange={(e) => setTanggalAkad(e.target.value)}
                  />
                </Medan>
                <IsianRupiah label="Sisa saldo di buku" nilai={saldo} ubah={setSaldo} />
                <IsianRupiah label="Tabungan di buku" nilai={tabungan} ubah={setTabungan} />
                <Isian
                  label="Pinjaman ke (opsional)"
                  inputMode="numeric"
                  placeholder="otomatis"
                  value={pinjamanKe}
                  onChange={(e) => setPinjamanKe(e.target.value.replace(/\D/g, ""))}
                />
                <label className="flex items-center gap-2 self-end pb-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={macet}
                    onChange={(e) => setMacet(e.target.checked)}
                  />
                  Di buku sudah macet
                </label>
              </section>

              {hitung?.ok ? (
                <p className="rounded-md bg-muted px-3 py-2 text-sm">
                  Total kembali <strong>{rupiah(hitung.ok.totalKembali)}</strong> · angsuran{" "}
                  <strong>{rupiah(hitung.ok.angsuran)}</strong> · sudah{" "}
                  <strong>{hitung.ok.angsuranKe}</strong> angsuran terbayar
                  {jenis === "tempoan" ? "" : ` dari ${tenor}`}
                </p>
              ) : hitung?.galat ? (
                <PesanGalat pesan={hitung.galat} />
              ) : null}
              <PesanGalat pesan={m.error?.message} />
              {terakhir && !m.error ? (
                <p className="text-sm text-emerald-700">
                  Tersalin: {terakhir.nasabah.nama} — {LABEL_JENIS[terakhir.jenis].toLowerCase()}{" "}
                  pinjaman ke-{terakhir.pinjamanKe}, saldo {rupiah(terakhir.saldo)}
                  {terakhir.status === "macet" ? " (macet)" : ""}.
                </p>
              ) : null}
              <Button type="submit" className="w-fit" disabled={!bisaKirim || m.isPending}>
                <BookCopy />
                {m.isPending ? "Menyalin…" : "Salin"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Disalin hari ini</CardTitle>
            <CardDescription>Salah ketik? Batalkan hari ini, lalu salin ulang.</CardDescription>
          </CardHeader>
          <CardContent>
            <DisalinHariIni />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
