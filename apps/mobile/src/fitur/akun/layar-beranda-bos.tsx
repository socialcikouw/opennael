import { View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Layar } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { useSesi } from "@/lib/sesi";
import { TombolKeluar } from "./komponen/tombol-keluar";

/**
 * Cadangan untuk akun tanpa layar HP (bos): pekerjaan bos ada di web.
 * Peran lain tidak sampai sini — penjaga di `app/_layout.tsx` mengarahkannya.
 */
export function LayarBerandaBos() {
  const g = useG();
  const s = useSesi();
  if (!s) return null;

  return (
    <Layar>
      <Merek />
      <Judul>Halo, {s.pengguna.nama}</Judul>
      <Spanduk
        judul="Akun ini dipakai di web"
        isi="Pekerjaan bos — karyawan, kas, gaji, pengaturan — ada di web OpenNael. Aplikasi HP untuk kasir, pengawas, dan kolektor."
      />
      <Keterangan>{s.pengguna.kantor.nama}</Keterangan>
      <View style={g.isi} />
      <TombolKeluar />
    </Layar>
  );
}
