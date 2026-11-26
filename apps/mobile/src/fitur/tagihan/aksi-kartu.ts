import { kunci } from "@opennael/api-client";
import { hitungLunas } from "@opennael/domain";
import { judul, rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, LayoutAnimation } from "react-native";
import {
  bacaGerbang,
  kabarTercatat,
  type Stempel,
  tulis,
  type useHariIni,
  useSiapkanNasabah,
} from "@/fitur/lapangan";
import { getar } from "@/komponen/ui/getar";
import type { AksiKartu } from "./komponen/kartu-nasabah";

/** Lama stempel "Berhasil" tampil di kartu (animasi ±0,45 dtk + waktu membaca) sebelum kartu turun ke "Sudah ditagih". */
const LAMA_STEMPEL_MS = 1200;

/**
 * Transaksi dari kartu (bayar, gulung, libur, lunas): gerbang lapangan,
 * stempel sesaat sesudah tercatat, lalu data disegarkan. `sibuk` = id pinjaman
 * yang tulisannya masih berjalan (kartunya menampilkan "Mencatat…").
 */
export function useAksiKartu(hariIni: ReturnType<typeof useHariIni>) {
  const klien = useQueryClient();
  const siapkanNasabah = useSiapkanNasabah();

  // ---- transaksi ----------------------------------------------------------
  const [stempel, setStempel] = useState<ReadonlyMap<string, Stempel>>(new Map());

  /** Stempel di kartu sebentar, lalu data disegarkan & kartunya turun ke "Sudah ditagih". */
  const tercatat = useCallback(
    (id: string, jenisStempel: Stempel) => {
      setStempel((m) => new Map(m).set(id, jenisStempel));
      setTimeout(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        void klien.invalidateQueries({ queryKey: kunci.lapangan }).finally(() =>
          setStempel((m) => {
            const baru = new Map(m);
            baru.delete(id);
            return baru;
          }),
        );
      }, LAMA_STEMPEL_MS);
    },
    [klien],
  );

  // Bayar dicatat di layarnya sendiri: stempel dipasang di sini sesudah kembali.
  useEffect(() => kabarTercatat.dengar(tercatat), [tercatat]);

  // Libur & Lunasi berjalan per kartu: tiap panggilan membawa hasil dan galatnya sendiri
  // (satu `useMutation` bersama hanya memanggil callback panggilan terakhir). `berjalan`
  // = penjaga kirim ganda; `sibuk` cuplikannya untuk tampilan ("Mencatat…" di kartu).
  const berjalan = useRef(new Set<string>());
  const [sibuk, setSibuk] = useState<ReadonlySet<string>>(new Set());
  const catat = useCallback(
    async (id: string, kerja: () => Promise<unknown>, cap: Stempel, judulGagal: string) => {
      if (berjalan.current.has(id)) return;
      berjalan.current.add(id);
      setSibuk(new Set(berjalan.current));
      try {
        await kerja();
        // Libur & Lunasi kartu tak lewat mutasi TanStack: getar hasilnya di sini.
        getar("berhasil");
        tercatat(id, cap);
      } catch (e) {
        getar("galat");
        Alert.alert(judulGagal, e instanceof Error ? e.message : String(e));
      } finally {
        berjalan.current.delete(id);
        setSibuk(new Set(berjalan.current));
      }
    },
    [tercatat],
  );

  const gerbang = useMemo(() => (hariIni.data ? bacaGerbang(hariIni.data) : null), [hariIni.data]);
  /** Gerbang lapangan (C4) dijelaskan di tempat — server tetap memutuskan. */
  const gerbangTutup = useCallback((): boolean => {
    if (!gerbang || gerbang.buka) return false;
    Alert.alert(
      gerbang.perluAbsen ? "Absen Dulu" : judul(gerbang.judul ?? "lapangan tutup"),
      gerbang.perluAbsen
        ? "Transaksi bisa dicatat sesudah absen pagi (lonceng Notifikasi)."
        : gerbang.isi,
    );
    return true;
  }, [gerbang]);

  const aksi: AksiKartu = useMemo(
    () => ({
      nasabah: (vm) =>
        router.push({ pathname: "/kolektor/nasabah/[id]", params: { id: vm.p.nasabah.id } }),
      siapNasabah: (vm) => siapkanNasabah(vm.p.nasabah.id),
      bayar: (vm) => {
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/bayar/[id]", params: { id: vm.id } });
      },
      gulung: (vm) => {
        const status = vm.progres?.status ?? "boleh";
        if (status !== "boleh") {
          Alert.alert("Belum Bisa Digulung", vm.progres?.petunjuk);
          return;
        }
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/gulung/[id]", params: { id: vm.id } });
      },
      libur: (vm) => {
        if (berjalan.current.has(vm.id)) return;
        const janji = vm.sekaliBayar;
        if (vm.alasanLibur) {
          Alert.alert(janji ? "BELUM BISA JANJI" : "BELUM BISA LIBUR", vm.alasanLibur);
          return;
        }
        if (gerbangTutup()) return;
        // G1: tempoan = janji besok (tanpa alasan, paling banyak 4 kali — A4).
        if (janji) {
          Alert.alert("Janji Besok", `Catat ${vm.nama} janji melunasi besok?`, [
            { text: "Batal", style: "cancel" },
            {
              text: "Catat",
              onPress: () =>
                void catat(
                  vm.id,
                  () => tulis.libur({ pinjamanId: vm.id }),
                  "janji",
                  "Gagal mencatat janji",
                ),
            },
          ]);
          return;
        }
        Alert.alert("Tandai Libur", `Yakin ${vm.nama} libur hari ini?`, [
          { text: "Batal", style: "cancel" },
          {
            text: "Yakin",
            style: "destructive",
            onPress: () =>
              void catat(
                vm.id,
                () => tulis.libur({ pinjamanId: vm.id }),
                "libur",
                "Gagal mencatat libur",
              ),
          },
        ]);
      },
      lunas: (vm) => {
        if (berjalan.current.has(vm.id)) return;
        if (gerbangTutup()) return;
        const r = hitungLunas(vm.p.saldo, vm.p.tabungan);
        const kembali = -r.storting;
        Alert.alert(
          "Pelunasan",
          `Yakin melunasi ${vm.nama}?\n\nSaldo: ${rupiah(vm.p.saldo)}\nTabungan: ${rupiah(vm.p.tabungan)}\n\n${
            kembali > 0
              ? `Tabungan keluar ke ${vm.nama}: ${rupiah(kembali)}`
              : `Sisa yang harus disetor ${vm.nama}: ${rupiah(r.setoranMurni)}`
          }`,
          [
            { text: "Batal", style: "cancel" },
            {
              text: "Yakin",
              style: "destructive",
              onPress: () => void catat(vm.id, () => tulis.lunas(vm.id), "lunas", "Gagal melunasi"),
            },
          ],
        );
      },
    }),
    [gerbangTutup, catat, siapkanNasabah],
  );

  return { stempel, sibuk, aksi, gerbang };
}
