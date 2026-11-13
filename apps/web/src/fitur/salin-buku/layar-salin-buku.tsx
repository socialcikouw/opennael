import { Link } from "@tanstack/react-router";
import { ArrowLeft, BookCopy } from "lucide-react";
import { KepalaHalaman } from "@/komponen/halaman";
import { Button } from "@/komponen/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/komponen/ui/card";
import { useFormulirSalin } from "./data";
import { BagianNasabah } from "./komponen/bagian-nasabah";
import { BagianPinjaman } from "./komponen/bagian-pinjaman";
import { DisalinHariIni } from "./komponen/disalin-hari-ini";
import { HasilSalin } from "./komponen/hasil-salin";

/**
 * SALIN DARI BUKU (aturan-usaha A10) — bos mengetik pinjaman yang masih
 * berjalan di buku lama, satu per satu. Kolektor, kampung, jenis, dan tenor
 * tetap terisi untuk baris berikutnya supaya menyalin satu halaman buku cepat.
 */
export function LayarSalinBuku() {
  const f = useFormulirSalin();

  return (
    <>
      <KepalaHalaman
        judul="Salin Dari Buku"
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
            <form className="grid gap-5" onSubmit={f.kirim}>
              <BagianNasabah f={f} />

              <BagianPinjaman f={f} />

              <HasilSalin f={f} />
              <Button type="submit" className="w-fit" disabled={!f.bisaKirim || f.m.isPending}>
                <BookCopy />
                {f.m.isPending ? "Menyalin…" : "Salin"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Disalin Hari Ini</CardTitle>
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
