import { kunci } from "@opennael/api-client";
import type { HasilMigrasi } from "@opennael/contracts";
import { type JenisPinjaman, TENOR_PINJAMAN } from "@opennael/domain";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useRef, useState } from "react";
import { ambil, api, kueri } from "@/lib/api";
import { useHariIni } from "@/lib/kantor";
import { type NasabahLama, type Orang, pratinjau } from "./inti";

/** Keadaan & kirim formulir SALIN DARI BUKU: baris tetap, baris yang diulang, pratinjau, dan mutasi. */
export function useFormulirSalin() {
  const hariIni = useHariIni();
  const klien = useQueryClient();
  const namaRef = useRef<HTMLInputElement>(null);

  const kolektorQ = useQuery(kueri.pengguna.kolektor());
  const kampungQ = useQuery(kueri.kampung());

  // Tetap untuk baris berikutnya.
  const [modus, setModus] = useState<"baru" | "lama">("baru");
  const [kolektorId, setKolektorId] = useState("");
  const [jenis, setJenis] = useState<JenisPinjaman>("harian");
  const [tenor, setTenor] = useState(TENOR_PINJAMAN.harian[0] ?? 0);
  // Diulang tiap baris.
  const [orang, setOrang] = useState<Orang>({ nama: "", kampung: "", nomorHp: "", nik: "" });
  const [lama, setLama] = useState<NasabahLama | null>(null);
  const [pokok, setPokok] = useState<number | null>(null);
  const [saldo, setSaldo] = useState<number | null>(null);
  const [tabungan, setTabungan] = useState<number | null>(0);
  const [tanggalAkad, setTanggalAkad] = useState("");
  const [pinjamanKe, setPinjamanKe] = useState("");
  const [macet, setMacet] = useState(false);
  const [terakhir, setTerakhir] = useState<HasilMigrasi | null>(null);

  const pilihKolektor = kolektorId || kolektorQ.data?.[0]?.id || "";
  const hitung = pratinjau(jenis, tenor, pokok, saldo, tabungan);

  const m = useMutation({
    mutationFn: () =>
      ambil(() =>
        api.migrasi.pinjaman.migrasi.$post({
          json: {
            nasabah:
              modus === "lama" && lama
                ? { nasabahId: lama.id }
                : {
                    nama: orang.nama.trim(),
                    kampung: { nama: orang.kampung.trim() },
                    ...(orang.nomorHp.trim() ? { nomorHp: orang.nomorHp.trim() } : {}),
                    ...(orang.nik ? { nik: orang.nik } : {}),
                  },
            ...(modus === "baru" ? { kolektorId: pilihKolektor } : {}),
            jenis,
            tenor,
            pokok: pokok ?? 0,
            tanggalAkad,
            saldo: saldo ?? 0,
            tabungan: tabungan ?? 0,
            ...(pinjamanKe ? { pinjamanKe: Number(pinjamanKe) } : {}),
            ...(macet ? { macet: true } : {}),
          },
        }),
      ),
    onSuccess: (hasil) => {
      setTerakhir(hasil);
      setOrang((o) => ({ nama: "", kampung: o.kampung, nomorHp: "", nik: "" }));
      setLama(null);
      setPokok(null);
      setSaldo(null);
      setTabungan(0);
      setPinjamanKe("");
      setMacet(false);
      for (const k of [kunci.aktivitas, kunci.nasabah, kunci.kampung]) {
        void klien.invalidateQueries({ queryKey: k });
      }
      namaRef.current?.focus();
    },
  });

  const nasabahSiap =
    modus === "lama"
      ? lama !== null
      : orang.nama.trim() !== "" &&
        orang.kampung.trim() !== "" &&
        pilihKolektor !== "" &&
        (orang.nik === "" || orang.nik.length === 16);
  const bisaKirim = nasabahSiap && !!hitung?.ok && tanggalAkad !== "" && tanggalAkad <= hariIni;

  const kirim = (e: FormEvent) => {
    e.preventDefault();
    if (bisaKirim && !m.isPending) m.mutate();
  };

  return {
    hariIni,
    namaRef,
    kampungQ,
    kolektorQ,
    modus,
    setModus,
    setKolektorId,
    pilihKolektor,
    jenis,
    setJenis,
    tenor,
    setTenor,
    orang,
    setOrang,
    lama,
    setLama,
    pokok,
    setPokok,
    saldo,
    setSaldo,
    tabungan,
    setTabungan,
    tanggalAkad,
    setTanggalAkad,
    pinjamanKe,
    setPinjamanKe,
    macet,
    setMacet,
    terakhir,
    hitung,
    m,
    bisaKirim,
    kirim,
  };
}

export type FormulirSalin = ReturnType<typeof useFormulirSalin>;
