import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian } from "@/komponen/formulir";
import { ambil, api } from "@/lib/api";
import { useSegarkanNasabah } from "../data";
import type { Nasabah } from "../inti";

// ---- dialog aksi --------------------------------------------------------------------

export function DialogSunting({
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
    mutationFn: () =>
      ambil(() => api.pembiayaan.nasabah[":id"].$patch({ param: { id: n.id }, json: ubah })),
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
