import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Isian, KartuTengah, PesanGalat, Pilihan, Tombol } from "@/komponen/formulir";
import { api, panggil } from "@/lib/api";
import { sesi } from "@/lib/sesi";

type Zona = "WIB" | "WITA" | "WIT";

/** Bos membuka kantor baru — butuh kode registrasi dari pemilik server. */
export function LayarDaftar() {
  const navigasi = useNavigate();
  const [isi, setIsi] = useState({
    kodeRegistrasi: "",
    namaKantor: "",
    zonaWaktu: "WIB" as Zona,
    nama: "",
    nomorHp: "",
    sandi: "",
  });
  const ubah = (kunci: keyof typeof isi) => (nilai: string) =>
    setIsi((lama) => ({ ...lama, [kunci]: nilai }));

  const daftar = useMutation({
    mutationFn: async () => {
      const res = await panggil(() =>
        api.identitas.auth.register.$post({ json: { ...isi, perangkat: { platform: "web" } } }),
      );
      if (res.status !== 201) throw new Error("Jawaban tak terduga");
      return res.json();
    },
    onSuccess: (hasil) => {
      sesi.simpan(hasil);
      void navigasi({ to: "/" });
    },
  });

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    daftar.mutate();
  };

  return (
    <KartuTengah judul="Buka kantor baru">
      <form className="space-y-4" onSubmit={kirim}>
        <Isian
          label="Kode registrasi"
          value={isi.kodeRegistrasi}
          onChange={(e) => ubah("kodeRegistrasi")(e.target.value)}
          autoComplete="off"
          required
        />
        <Isian
          label="Nama kantor"
          value={isi.namaKantor}
          onChange={(e) => ubah("namaKantor")(e.target.value)}
          placeholder="Nael Capital"
          required
        />
        <Pilihan
          label="Zona waktu"
          value={isi.zonaWaktu}
          onChange={(e) => ubah("zonaWaktu")(e.target.value)}
        >
          <option value="WIB">WIB</option>
          <option value="WITA">WITA</option>
          <option value="WIT">WIT</option>
        </Pilihan>
        <Isian
          label="Nama Anda"
          value={isi.nama}
          onChange={(e) => ubah("nama")(e.target.value)}
          required
        />
        <Isian
          label="Nomor HP (untuk masuk)"
          type="tel"
          autoComplete="tel"
          value={isi.nomorHp}
          onChange={(e) => ubah("nomorHp")(e.target.value)}
          placeholder="0812…"
          required
        />
        <Isian
          label="Kata sandi (minimal 8 karakter)"
          type="password"
          autoComplete="new-password"
          value={isi.sandi}
          onChange={(e) => ubah("sandi")(e.target.value)}
          minLength={8}
          required
        />
        <PesanGalat pesan={daftar.error?.message} />
        <Tombol type="submit" memuat={daftar.isPending}>
          Buka kantor
        </Tombol>
      </form>
      <p className="text-sm text-slate-600">
        Sudah punya akun?{" "}
        <Link to="/masuk" className="font-semibold text-emerald-700 hover:underline">
          Masuk
        </Link>
      </p>
    </KartuTengah>
  );
}
