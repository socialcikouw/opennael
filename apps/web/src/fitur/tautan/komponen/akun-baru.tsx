import { Isian, Pilihan } from "@/komponen/formulir";
import type { PeranTertaut } from "../inti";

type IsiAkun = { peran: PeranTertaut; nama: string; nomorHp: string; resort: string };

export function AkunBaru({ akun, ubah: setAkun }: { akun: IsiAkun; ubah: (a: IsiAkun) => void }) {
  return (
    <>
      <Pilihan
        label="Peran"
        value={akun.peran}
        onChange={(e) => setAkun({ ...akun, peran: e.target.value as PeranTertaut })}
      >
        <option value="kolektor">Kolektor</option>
        <option value="kasir">Kasir</option>
        <option value="pengawas">Pengawas</option>
      </Pilihan>
      <Isian
        label="Nama"
        value={akun.nama}
        onChange={(e) => setAkun({ ...akun, nama: e.target.value })}
        required
      />
      <Isian
        label="Nomor HP (opsional)"
        type="tel"
        value={akun.nomorHp}
        onChange={(e) => setAkun({ ...akun, nomorHp: e.target.value })}
        placeholder="0812…"
      />
      {akun.peran === "kolektor" ? (
        <Isian
          label="Resort (opsional)"
          value={akun.resort}
          onChange={(e) => setAkun({ ...akun, resort: e.target.value })}
        />
      ) : null}
    </>
  );
}
