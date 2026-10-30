import { LABEL_PERAN } from "@opennael/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import type { Karyawan } from "../data";

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

export function DialogSunting({ orang, tutup }: { orang: Karyawan; tutup: () => void }) {
  const klien = useQueryClient();
  const [isi, setIsi] = useState({
    nama: orang.nama,
    nomorHp: orang.nomorHp ?? "",
    resort: orang.resort ?? "",
  });
  const ubah = perubahan(orang, isi);
  const simpan = useMutation({
    mutationFn: () =>
      ambil(() => api.identitas.pengguna[":id"].$patch({ param: { id: orang.id }, json: ubah })),
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
