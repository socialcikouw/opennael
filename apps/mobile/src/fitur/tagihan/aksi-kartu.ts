import { kunci } from "@opennael/api-client";
import { hitungLunas } from "@opennael/domain";
import { rupiah } from "@opennael/format";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, LayoutAnimation } from "react-native";
import { bacaGerbang, kabarTercatat, type Stempel, tulis, type useHariIni } from "@/fitur/lapangan";
import type { AksiKartu } from "./komponen/kartu-nasabah";

const gagal = (judul: string) => (e: Error) => Alert.alert(judul, e.message);

/** Lama stempel tampil di kartu sebelum kartu turun ke "Sudah ditagih". */
const LAMA_STEMPEL_MS = 900;

/**
 * Transaksi dari kartu (bayar, gulung, libur, lunas): gerbang lapangan,
 * stempel sesaat sesudah tercatat, lalu data disegarkan.
 */
export function useAksiKartu(hariIni: ReturnType<typeof useHariIni>) {
  const klien = useQueryClient();

  // ---- transaksi ----------------------------------------------------------
  const [stempel, setStempel] = useState<ReadonlyMap<string, Stempel>>(new Map());
  const { mutate: catatLibur } = useMutation({ mutationFn: tulis.libur });
  const { mutate: catatLunas } = useMutation({ mutationFn: tulis.lunas });

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

  const gerbang = useMemo(() => (hariIni.data ? bacaGerbang(hariIni.data) : null), [hariIni.data]);
  /** Gerbang lapangan (C4) dijelaskan di tempat — server tetap memutuskan. */
  const gerbangTutup = useCallback((): boolean => {
    if (!gerbang || gerbang.buka) return false;
    Alert.alert(
      gerbang.perluAbsen ? "Absen dulu" : (gerbang.judul ?? "Lapangan tutup"),
      gerbang.perluAbsen ? "Transaksi bisa dicatat sesudah absen pagi di Beranda." : gerbang.isi,
    );
    return true;
  }, [gerbang]);

  const aksi: AksiKartu = useMemo(
    () => ({
      bayar: (vm) => {
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/bayar/[id]", params: { id: vm.id } });
      },
      gulung: (vm) => {
        const status = vm.progres?.status ?? "boleh";
        if (status !== "boleh") {
          Alert.alert("Belum bisa digulung", vm.progres?.petunjuk);
          return;
        }
        if (gerbangTutup()) return;
        router.push({ pathname: "/kolektor/gulung/[id]", params: { id: vm.id } });
      },
      libur: (vm) => {
        if (vm.alasanLibur) {
          Alert.alert("Belum bisa libur", vm.alasanLibur);
          return;
        }
        if (gerbangTutup()) return;
        Alert.alert("Tandai libur", `Yakin ${vm.nama} libur hari ini?`, [
          { text: "Batal", style: "cancel" },
          {
            text: "Yakin",
            style: "destructive",
            onPress: () =>
              catatLibur(
                { pinjamanId: vm.id },
                {
                  onSuccess: () => tercatat(vm.id, "libur"),
                  onError: gagal("Gagal mencatat libur"),
                },
              ),
          },
        ]);
      },
      lunas: (vm) => {
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
              onPress: () =>
                catatLunas(vm.id, {
                  onSuccess: () => tercatat(vm.id, "lunas"),
                  onError: gagal("Gagal melunasi"),
                }),
            },
          ],
        );
      },
    }),
    [gerbangTutup, catatLibur, catatLunas, tercatat],
  );

  return { stempel, aksi, gerbang };
}
