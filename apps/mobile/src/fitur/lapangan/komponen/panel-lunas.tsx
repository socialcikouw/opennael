import type { KartuTagih } from "@opennael/contracts";
import { hitungLunas } from "@opennael/domain";
import { rupiah } from "@opennael/format";
import { router } from "expo-router";
import { Alert } from "react-native";
import { PesanGalat } from "@/komponen/ui/isian";
import { Baris, Kartu } from "@/komponen/ui/kartu";
import { Spanduk } from "@/komponen/ui/spanduk";
import { Tombol } from "@/komponen/ui/tombol";
import { tulis, useTulis } from "../data";

export function PanelLunas({ p }: { p: KartuTagih }) {
  const lunas = useTulis(tulis.lunas);
  const r = hitungLunas(p.saldo, p.tabungan);
  const kembalian = -r.storting;

  const konfirmasi = () =>
    Alert.alert(
      "Lunaskan pinjaman?",
      kembalian > 0
        ? `Kembalikan ${rupiah(kembalian)} tunai ke ${p.nasabah.nama}.`
        : `Terima ${rupiah(r.setoranMurni)} dari ${p.nasabah.nama}.`,
      [
        { text: "Batal", style: "cancel" },
        { text: "Lunaskan", onPress: () => lunas.mutate(p.id, { onSuccess: () => router.back() }) },
      ],
    );

  return (
    <Kartu>
      <Baris label="Saldo" nilai={rupiah(p.saldo)} />
      <Baris label="Ditutup tabungan" nilai={rupiah(r.setoranPelunasan)} />
      <Baris label="Dibayar nasabah" nilai={rupiah(r.setoranMurni)} tebal />
      {kembalian > 0 ? (
        <Spanduk
          warna="merah"
          judul={`Kembalikan ${rupiah(kembalian)} tunai ke nasabah`}
          isi="Tabungan melebihi saldo. Setoran sore Anda berkurang sebesar ini."
        />
      ) : null}
      <PesanGalat pesan={lunas.error?.message} />
      <Tombol judul="Lunaskan" ikon="badge-check" memuat={lunas.isPending} onPress={konfirmasi} />
    </Kartu>
  );
}
