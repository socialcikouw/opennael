import { kunci } from "@opennael/api-client";
import { hitungLunas, liburPerluAlasan } from "@opennael/domain";
import { rupiah } from "@opennael/format";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, LayoutAnimation } from "react-native";
import { bacaGerbang, kabarTercatat, type Stempel, tulis, type useHariIni } from "@/fitur/lapangan";
import type { KartuVM } from "./inti/kartu";
import type { AksiKartu } from "./komponen/kartu-nasabah";

/** Lama stempel tampil di kartu sebelum kartu turun ke "Sudah ditagih". */
const LAMA_STEMPEL_MS = 900;

/**
 * Transaksi dari kartu (bayar, gulung, libur, lunas): gerbang lapangan,
 * stempel sesaat sesudah tercatat, lalu data disegarkan. `sibuk` = id pinjaman
 * yang tulisannya masih berjalan (kartunya menampilkan "Mencatat…").
 */
export function useAksiKartu(hariIni: ReturnType<typeof useHariIni>) {
  const klien = useQueryClient();

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
        tercatat(id, cap);
      } catch (e) {
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
      gerbang.perluAbsen ? "Absen dulu" : (gerbang.judul ?? "Lapangan tutup"),
      gerbang.perluAbsen
        ? "Transaksi bisa dicatat sesudah absen pagi di tab Notifikasi."
        : gerbang.isi,
    );
    return true;
  }, [gerbang]);

  /** Kartu yang sedang meminta alasan libur (tempoan, G1); null = lembar tertutup. */
  const [liburBeralasan, setLiburBeralasan] = useState<KartuVM | null>(null);
  const lembarLibur = useMemo(
    () => ({
      vm: liburBeralasan,
      tutup: () => setLiburBeralasan(null),
      kirim: (alasan: string) => {
        const vm = liburBeralasan;
        if (!vm) return;
        setLiburBeralasan(null);
        void catat(
          vm.id,
          () => tulis.libur({ pinjamanId: vm.id, alasan }),
          "libur",
          "Gagal mencatat libur",
        );
      },
    }),
    [liburBeralasan, catat],
  );

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
        if (berjalan.current.has(vm.id)) return;
        if (vm.alasanLibur) {
          Alert.alert("Belum bisa libur", vm.alasanLibur);
          return;
        }
        if (gerbangTutup()) return;
        // G1: libur tempoan wajib beralasan → lembar alasan.
        if (liburPerluAlasan(vm.p)) {
          setLiburBeralasan(vm);
          return;
        }
        Alert.alert("Tandai libur", `Yakin ${vm.nama} libur hari ini?`, [
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
    [gerbangTutup, catat],
  );

  return { stempel, sibuk, aksi, gerbang, lembarLibur };
}
