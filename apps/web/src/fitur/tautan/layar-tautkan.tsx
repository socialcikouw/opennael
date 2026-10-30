import { bakukanKode, tampilanKode } from "@opennael/domain";
import { LABEL_PERAN } from "@opennael/format";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Isian, KartuFormulir, PesanGalat, Pilihan, Tombol } from "@/komponen/formulir";
import { Tabs, TabsList, TabsTrigger } from "@/komponen/ui/tabs";
import { ambil, api, panggil } from "@/lib/api";
import type { PeranTertaut } from "./inti";
import { AkunBaru } from "./komponen/akun-baru";
import { Pemindai } from "./komponen/pemindai";

/**
 * Bos menyetujui HP karyawan: kode dari pemindai atau ketikan, lalu akun baru
 * kasir / pengawas / kolektor — atau akun lama (HP baru, akun diaktifkan lagi).
 */
export function LayarTautkan() {
  const [kode, setKode] = useState<string | null>(null);
  const [ketikan, setKetikan] = useState("");
  const [kamera, setKamera] = useState(false);
  const [galatKode, setGalatKode] = useState<string | null>(null);
  const [akunLama, setAkunLama] = useState<string | null>(null);
  const karyawan = useQuery({
    queryKey: ["pengguna", "semua"],
    queryFn: () => ambil(() => api.identitas.pengguna.$get({ query: { termasukNonaktif: "ya" } })),
  });
  const bisaDitautkan = (karyawan.data ?? []).filter((o) => o.aktif && o.peran !== "bos");
  const [akun, setAkun] = useState({
    peran: "kolektor" as PeranTertaut,
    nama: "",
    nomorHp: "",
    resort: "",
  });

  const setujui = useMutation({
    mutationFn: async () => {
      if (!kode) throw new Error("Kode belum diisi");
      const res = await panggil(() =>
        api.identitas.auth.tautan.setujui.$post({
          json: {
            kode,
            akun:
              akunLama !== null
                ? { penggunaId: akunLama }
                : {
                    peran: akun.peran,
                    nama: akun.nama.trim(),
                    ...(akun.nomorHp.trim() ? { nomorHp: akun.nomorHp.trim() } : {}),
                    ...(akun.peran === "kolektor" && akun.resort.trim()
                      ? { resort: akun.resort.trim() }
                      : {}),
                  },
          },
        }),
      );
      if (res.status !== 200) throw new Error("Jawaban tak terduga");
      return res.json();
    },
  });

  const pakaiKetikan = (e: FormEvent) => {
    e.preventDefault();
    const baku = bakukanKode(ketikan);
    if (!baku) {
      setGalatKode("Itu bukan kode penautan OpenNael");
      return;
    }
    setKode(baku);
  };

  const ulang = () => {
    setKode(null);
    setKetikan("");
    setKamera(false);
    setAkun({ peran: "kolektor", nama: "", nomorHp: "", resort: "" });
    setAkunLama(null);
    setujui.reset();
  };

  if (setujui.data) {
    return (
      <KartuFormulir judul="Disetujui">
        <p className="text-foreground">
          HP {setujui.data.perangkat.nama ?? "karyawan"} akan masuk otomatis sebagai{" "}
          <strong>{setujui.data.pengguna.nama}</strong> dalam beberapa detik.
        </p>
        <Tombol onClick={ulang}>Tautkan HP lain</Tombol>
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:underline">
          Kembali ke beranda
        </Link>
      </KartuFormulir>
    );
  }

  if (!kode) {
    return (
      <KartuFormulir judul="Tautkan HP karyawan">
        <p className="text-muted-foreground">
          Di HP karyawan, buka aplikasi OpenNael — layar "Tautkan HP ini" menampilkan QR dan kode.
        </p>
        {kamera ? (
          <Pemindai onKode={setKode} />
        ) : (
          <Tombol onClick={() => setKamera(true)}>Pindai QR dengan kamera</Tombol>
        )}
        <form className="space-y-3" onSubmit={pakaiKetikan}>
          <Isian
            label="Atau ketik kodenya"
            placeholder="K7QM-28XD"
            autoComplete="off"
            value={ketikan}
            onChange={(e) => {
              setKetikan(e.target.value);
              setGalatKode(null);
            }}
          />
          <PesanGalat pesan={galatKode} />
          <Tombol type="submit" jenis="kedua" disabled={ketikan.trim() === ""}>
            Lanjut
          </Tombol>
        </form>
        <Link to="/" className="block text-center text-sm text-muted-foreground hover:underline">
          Batal
        </Link>
      </KartuFormulir>
    );
  }

  return (
    <KartuFormulir judul={`Akun untuk HP ${tampilanKode(kode)}`}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          setujui.mutate();
        }}
      >
        <Tabs
          value={akunLama === null ? "baru" : "lama"}
          onValueChange={(v) => setAkunLama(v === "lama" ? (bisaDitautkan[0]?.id ?? "") : null)}
        >
          <TabsList className="w-full">
            <TabsTrigger value="baru">Akun baru</TabsTrigger>
            <TabsTrigger value="lama">Akun yang sudah ada</TabsTrigger>
          </TabsList>
        </Tabs>
        {akunLama !== null ? (
          <Pilihan
            label="Akun"
            value={akunLama}
            onChange={(e) => setAkunLama(e.target.value)}
            required
          >
            {bisaDitautkan.length === 0 ? <option value="">Belum ada akun aktif</option> : null}
            {bisaDitautkan.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nama} — {LABEL_PERAN[o.peran]}
                {o.perangkatAktif > 0 ? ` (${o.perangkatAktif} HP tertaut)` : ""}
              </option>
            ))}
          </Pilihan>
        ) : (
          <AkunBaru akun={akun} ubah={setAkun} />
        )}
        <PesanGalat pesan={setujui.error?.message} />
        <Tombol type="submit" memuat={setujui.isPending} disabled={akunLama === ""}>
          Setujui
        </Tombol>
        <Tombol jenis="kedua" onClick={ulang}>
          Ganti kode
        </Tombol>
      </form>
    </KartuFormulir>
  );
}
