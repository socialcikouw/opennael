import { Redirect } from "expo-router";
import { View } from "react-native";
import { useG } from "@/komponen/ui/gaya-bersama";
import { Layar } from "@/komponen/ui/layar";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Judul, Keterangan, Merek } from "@/komponen/ui/teks";
import { layarAwal } from "@/lib/navigasi";
import { useSesi } from "@/lib/sesi";
import { TombolKeluar } from "./komponen/tombol-keluar";

/**
 * Cadangan untuk akun tanpa layar HP (bos): pekerjaan bos ada di web.
 * Kasir, pengawas, dan kolektor diarahkan ke layarnya masing-masing.
 */
export function LayarBerandaBos() {
  const g = useG();
  const s = useSesi();
  if (s === undefined) return null;
  if (s === null) return <Redirect href="/tautkan" />;
  const tujuan = layarAwal(s.pengguna.peran);
  if (tujuan !== "/beranda") return <Redirect href={tujuan} />;

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
