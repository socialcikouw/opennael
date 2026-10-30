import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { DialogFormulir } from "@/komponen/dialog-formulir";
import { Isian, Medan, PilihanAsli } from "@/komponen/formulir";
import { IsianRupiah } from "@/komponen/isian-rupiah";
import { ambil, api } from "@/lib/api";
import { useSegarkanKas } from "../data";
import { type Akun, type JenisMutasi, LABEL_MUTASI } from "../inti";

/** Arah akun per jenis mutasi: masuk → `keAkun`, keluar → `dariAkun`, pindah → keduanya. */
const ARAH: Record<JenisMutasi, "masuk" | "keluar" | "pindah"> = {
  setor_modal: "masuk",
  lain_masuk: "masuk",
  tarik_modal: "keluar",
  biaya_kantor: "keluar",
  lain_keluar: "keluar",
  pindah_akun: "pindah",
};

// ---- mutasi -------------------------------------------------------------------------

export function DialogMutasi({ tutup }: { tutup: () => void }) {
  const segarkan = useSegarkanKas();
  const [jenis, setJenis] = useState<JenisMutasi>("setor_modal");
  const [akun, setAkun] = useState<Akun>("tunai");
  const [nominal, setNominal] = useState<number | null>(null);
  const [keterangan, setKeterangan] = useState("");
  const arah = ARAH[jenis];
  const lain: Akun = akun === "tunai" ? "bank" : "tunai";
  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.kas.kas.mutasi.$post({
          json: {
            jenis,
            dariAkun: arah === "masuk" ? null : akun,
            keAkun: arah === "keluar" ? null : arah === "pindah" ? lain : akun,
            nominal: nominal ?? 0,
            keterangan: keterangan.trim(),
          },
        }),
      ),
    onSuccess: () => {
      segarkan();
      tutup();
    },
  });
  return (
    <DialogFormulir
      judul="Catat mutasi kas"
      keterangan="Uang masuk/keluar kantor di luar pekerjaan kolektor — tercatat hari ini."
      buka
      ubahBuka={(b) => !b && tutup()}
      kirim={() => m.mutate()}
      memuat={m.isPending}
      galat={m.error?.message}
      labelKirim="Catat"
      bisaKirim={!!nominal && keterangan.trim() !== ""}
    >
      <Medan label="Jenis">
        <PilihanAsli value={jenis} onChange={(e) => setJenis(e.target.value as JenisMutasi)}>
          {(Object.keys(LABEL_MUTASI) as JenisMutasi[]).map((j) => (
            <option key={j} value={j}>
              {LABEL_MUTASI[j]}
            </option>
          ))}
        </PilihanAsli>
      </Medan>
      <Medan
        label={arah === "masuk" ? "Masuk ke" : arah === "keluar" ? "Keluar dari" : "Dari"}
        petunjuk={arah === "pindah" ? `Ke ${lain}` : undefined}
      >
        <PilihanAsli value={akun} onChange={(e) => setAkun(e.target.value as Akun)}>
          <option value="tunai">Tunai (brankas)</option>
          <option value="bank">Bank</option>
        </PilihanAsli>
      </Medan>
      <IsianRupiah label="Nominal" nilai={nominal} ubah={setNominal} />
      <Isian
        label="Keterangan"
        value={keterangan}
        maxLength={200}
        onChange={(e) => setKeterangan(e.target.value)}
      />
    </DialogFormulir>
  );
}
