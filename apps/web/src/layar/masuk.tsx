import { useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Isian, KartuTengah, PesanGalat, Tombol } from "../komponen/formulir";
import { api, panggil } from "../lib/api";
import { sesi } from "../lib/sesi";

/** Bos masuk dengan nomor HP + kata sandi. */
export function LayarMasuk() {
  const navigasi = useNavigate();
  const [nomorHp, setNomorHp] = useState("");
  const [sandi, setSandi] = useState("");

  const masuk = useMutation({
    mutationFn: async () => {
      const res = await panggil(() =>
        api.identitas.auth.login.$post({
          json: { nomorHp, sandi, perangkat: { platform: "web" } },
        }),
      );
      if (res.status !== 200) throw new Error("Jawaban tak terduga");
      return res.json();
    },
    onSuccess: (hasil) => {
      sesi.simpan(hasil);
      void navigasi({ to: "/" });
    },
  });

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    masuk.mutate();
  };

  return (
    <KartuTengah judul="OpenNael — Bos">
      <form className="space-y-4" onSubmit={kirim}>
        <Isian
          label="Nomor HP"
          type="tel"
          autoComplete="tel"
          placeholder="0812…"
          value={nomorHp}
          onChange={(e) => setNomorHp(e.target.value)}
          required
        />
        <Isian
          label="Kata sandi"
          type="password"
          autoComplete="current-password"
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          required
        />
        <PesanGalat pesan={masuk.error?.message} />
        <Tombol type="submit" memuat={masuk.isPending}>
          Masuk
        </Tombol>
      </form>
      <p className="text-sm text-slate-600">
        Membuka kantor baru?{" "}
        <Link to="/daftar" className="font-semibold text-emerald-700 hover:underline">
          Daftar dengan kode registrasi
        </Link>
      </p>
    </KartuTengah>
  );
}
