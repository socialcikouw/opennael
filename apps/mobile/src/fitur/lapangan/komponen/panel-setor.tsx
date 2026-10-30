import type { KartuTagih } from "@opennael/contracts";
import { hitungBayar } from "@opennael/domain";
import { rupiah } from "@opennael/format";
import { router } from "expo-router";
import { useState } from "react";
import { IsianUang, PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Pilihan } from "@/komponen/ui/pilihan";
import { Tombol } from "@/komponen/ui/tombol";
import { cobaAturan } from "@/lib/aturan";
import { tulis, useTulis } from "../data";

export function PanelSetor({ p }: { p: KartuTagih }) {
  const [murni, setMurni] = useState(p.angsuran);
  const [pelunasan, setPelunasan] = useState(0);
  const [tambahPelunasan, setTambahPelunasan] = useState(false);
  const bayar = useTulis(tulis.bayar);
  const pratinjau = cobaAturan(() => hitungBayar(p, murni, tambahPelunasan ? pelunasan : 0));
  const kali = [1, 2, 3].filter((n) => n * p.angsuran < p.saldo);

  return (
    <Kartu>
      <IsianUang label="Setoran" nilai={murni} onUbah={setMurni} />
      {kali.length > 1 ? (
        <Pilihan
          pilihan={kali.map((n) => ({
            nilai: n * p.angsuran,
            teks: `${n}× ${rupiah(n * p.angsuran)}`,
          }))}
          nilai={murni}
          onPilih={setMurni}
        />
      ) : null}
      {tambahPelunasan ? (
        <IsianUang label="Pelunasan sebagian" nilai={pelunasan} onUbah={setPelunasan} />
      ) : (
        <Tombol
          judul="Pelunasan sebagian"
          jenis="kedua"
          ikon="plus"
          onPress={() => setTambahPelunasan(true)}
        />
      )}
      {pratinjau.hasil ? (
        <Baris label="Sisa saldo sesudah setor" nilai={rupiah(pratinjau.hasil.sisaSaldo)} tebal />
      ) : (
        <PesanGalat pesan={pratinjau.galat} />
      )}
      <PesanGalat pesan={bayar.error?.message} />
      <Tombol
        judul={`Simpan setoran ${rupiah(murni + (tambahPelunasan ? pelunasan : 0))}`}
        ikon="circle-check"
        memuat={bayar.isPending}
        nonaktif={!pratinjau.hasil}
        onPress={() =>
          bayar.mutate(
            {
              pinjamanId: p.id,
              setoranMurni: murni,
              setoranPelunasan: tambahPelunasan ? pelunasan : 0,
            },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Kartu>
  );
}
