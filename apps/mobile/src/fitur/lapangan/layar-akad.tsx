import type { NasabahLama } from "@opennael/contracts";
import { geserTanggal, type JenisPinjaman, syaratAkad, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS, tanggalBertahun } from "@opennael/format";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { ruteJenis } from "@/fitur/mode";
import { g } from "@/komponen/ui/gaya-bersama";
import { SelubungMencatat } from "@/komponen/ui/selubung-mencatat";
import { StempelBerhasil } from "@/komponen/ui/stempel-berhasil";
import { cobaAturan } from "@/lib/aturan";
import { useAkad, useHariIni } from "./data";
import {
  type LangkahAkad,
  langkahBerikut,
  langkahSebelum,
  nomorLangkah,
  type SiapaNasabah,
  urutanLangkah,
} from "./inti/langkah-akad";
import { jumlahKetukan, tekanPokok } from "./inti/papan";
import type { Kerangka } from "./komponen/akad/kerangka-langkah";
import { type KampungAkad, LangkahKampung } from "./komponen/akad/langkah-kampung";
import { LangkahKontak, nikSah } from "./komponen/akad/langkah-kontak";
import { LangkahNama } from "./komponen/akad/langkah-nama";
import { LangkahPeriksa } from "./komponen/akad/langkah-periksa";
import { LangkahPernahMelunasi } from "./komponen/akad/langkah-pernah-melunasi";
import { LangkahPokok } from "./komponen/akad/langkah-pokok";
import { LangkahSiapa } from "./komponen/akad/langkah-siapa";
import { LangkahTenor } from "./komponen/akad/langkah-tenor";
import { LembarBatalAkad } from "./komponen/akad/lembar-batal-akad";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  KameraSerahTerima,
} from "./komponen/kamera-serah-terima";
import { useTitikRumahLatar } from "./titik-rumah-latar";

/** Lama stempel Berhasil tampil sebelum kembali ke tab jenisnya. */
const TAMPIL_BERHASIL_MS = 1200;

/**
 * AKAD BARU (A) — orang baru, atau nasabah pegangan yang pernah melunasi lalu pinjam lagi.
 * Dibuka dari tombol (+) Mode Kerja; jenisnya = tab yang sedang dibuka (Harian/Mingguan/
 * Tempoan).
 *
 * SATU PERTANYAAN PER LAYAR (keputusan pemilik lewat simulasi, 26 Nov 2026; menggantikan
 * formulir penuh): kamera serah terima (A7) langsung terbuka → siapa nasabahnya → data
 * nasabah → pokok → tenor → periksa → "Cairkan Rp …". Urutannya `inti/langkah-akad.ts`;
 * tiap langkah satu berkas di `komponen/akad/`. ← = langkah sebelumnya, ✕ = batalkan
 * (ditanya dulu). Tombol "Ubah" di Periksa membuka langkahnya; tombol lanjut di sana
 * kembali ke Periksa.
 *
 * Sejak layar terbuka GPS dipantau di latar (`useTitikRumahLatar`); titik terbaiknya
 * direkam sebagai titik rumah begitu akad tersimpan, tanpa langkah tambahan. Sesudah
 * tersimpan: stempel Berhasil, lalu kembali ke tab jenisnya di segmen Droping.
 */
export function LayarAkad({ jenis: param }: { jenis?: string }) {
  const jenis: JenisPinjaman =
    param && param in TENOR_PINJAMAN ? (param as JenisPinjaman) : "harian";
  const [langkah, setLangkah] = useState<LangkahAkad>("siapa");
  const [kePeriksa, setKePeriksa] = useState(false);
  const [kamera, setKamera] = useState(true);
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const [siapa, setSiapa] = useState<SiapaNasabah | null>(null);
  const [nama, setNama] = useState("");
  const [kampung, setKampung] = useState<KampungAkad | null>(null);
  const [nik, setNik] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [lama, setLama] = useState<NasabahLama | null>(null);
  const [ketukan, setKetukan] = useState<readonly number[]>([]);
  const [tenorDipilih, setTenor] = useState<number | null>(null);
  const [batal, setBatal] = useState(false);
  const [berhasil, setBerhasil] = useState(false);
  const akad = useAkad();
  const titik = useTitikRumahLatar();
  const hariIni = useHariIni().data?.kalender.tanggal ?? null;

  const urutan = urutanLangkah(siapa, jenis);
  const pokok = jumlahKetukan(ketukan);
  const tenor = jenis === "harian" ? (TENOR_PINJAMAN.harian[0] ?? 24) : tenorDipilih;

  const ke = (l: LangkahAkad) => {
    if (l === "foto") setKamera(true);
    else setLangkah(l);
  };
  const lanjut = () => {
    if (kePeriksa) {
      setKePeriksa(false);
      setLangkah("periksa");
    } else ke(langkahBerikut(urutan, langkah));
  };
  const mundur = () => {
    if (kePeriksa) {
      setKePeriksa(false);
      setLangkah("periksa");
      return;
    }
    const sebelum = langkahSebelum(urutan, langkah);
    if (sebelum) ke(sebelum);
  };
  const ubah = (l: LangkahAkad) => {
    if (l !== "foto") setKePeriksa(true);
    ke(l);
  };

  // Tombol kembali Android = ← (langkah sebelumnya), bukan menutup akad diam-diam. Dipasang
  // ulang tiap render supaya selalu memakai langkah terkini; lembar & kamera (Modal)
  // menangani tombol kembali sendiri lebih dulu.
  useEffect(() => {
    const tahan = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!akad.isPending && !berhasil) mundur();
      return true;
    });
    return () => tahan.remove();
  });

  // Akad tersimpan: stempel Berhasil sebentar, lalu ke tab jenisnya — pinjaman baru di Droping.
  useEffect(() => {
    if (!berhasil) return;
    const t = setTimeout(
      () => router.dismissTo({ pathname: ruteJenis(jenis), params: { segmen: "droping" } }),
      TAMPIL_BERHASIL_MS,
    );
    return () => clearTimeout(t);
  }, [berhasil, jenis]);

  const pilihSiapa = (s: SiapaNasabah) => {
    if (s !== siapa) {
      setSiapa(s);
      setLama(null);
    }
    setLangkah(langkahBerikut(urutanLangkah(s, jenis), "siapa"));
  };
  const pilihLama = (n: NasabahLama) => {
    setLama(n);
    // Pinjaman terakhir berjenis sama = patokan pokok (hanya bila pokok belum diisi).
    if (ketukan.length === 0 && n.terakhir?.jenis === jenis) setKetukan([n.terakhir.pokok]);
    lanjut();
  };
  const tekanPapan = (kunci: string) => {
    if (akad.error) akad.reset();
    setKetukan((k) => tekanPokok(k, kunci));
  };

  const cairkan = () => {
    if (!foto || !fotoMasihBerlaku(foto) || tenor === null) return;
    const syarat = cobaAturan(() => syaratAkad(jenis, pokok, tenor));
    if (!syarat.hasil) return;
    const nasabah =
      siapa === "pernah-melunasi" && lama
        ? { nasabahId: lama.id }
        : {
            nama: nama.trim(),
            kampung: kampung?.id ? { wilayahId: kampung.id } : { nama: kampung?.nama.trim() ?? "" },
            ...(nik ? { nik } : {}),
            ...(nomorHp ? { nomorHp } : {}),
          };
    akad.mutate(
      {
        akad: { nasabah, jenis, pokok, tenor, fotoSerahTerimaId: foto.id },
        titik: titik.status === "siap" ? titik.titik : null,
      },
      { onSuccess: () => setBerhasil(true) },
    );
  };

  const k: Kerangka = {
    judul: `Akad ${LABEL_JENIS[jenis]}`,
    nomor: nomorLangkah(urutan, langkah),
    jumlah: urutan.length,
    kePeriksa,
    onMundur: mundur,
    onTutup: () => setBatal(true),
  };

  const isi = (() => {
    switch (langkah) {
      case "siapa":
        return <LangkahSiapa k={k} nilai={siapa} onPilih={pilihSiapa} />;
      case "nama":
        return <LangkahNama k={k} nilai={nama} onUbah={setNama} onLanjut={lanjut} />;
      case "kampung":
        return (
          <LangkahKampung
            k={k}
            nilai={kampung}
            onPilih={(kp) => {
              setKampung(kp);
              lanjut();
            }}
          />
        );
      case "kontak":
        return (
          <LangkahKontak
            k={k}
            nik={nik}
            nomorHp={nomorHp}
            onNik={setNik}
            onNomorHp={setNomorHp}
            onLanjut={() => {
              if (nikSah(nik)) lanjut();
            }}
          />
        );
      case "pernah-melunasi":
        return <LangkahPernahMelunasi k={k} nilai={lama} onPilih={pilihLama} />;
      case "pokok":
        return (
          <LangkahPokok
            k={k}
            jenis={jenis}
            pokok={pokok}
            lama={lama}
            onTekan={tekanPapan}
            onLanjut={lanjut}
          />
        );
      case "tenor":
        return jenis === "harian" ? null : (
          <LangkahTenor
            k={k}
            jenis={jenis}
            pokok={pokok}
            hariIni={hariIni}
            nilai={tenorDipilih}
            onPilih={(t) => {
              setTenor(t);
              lanjut();
            }}
          />
        );
      case "periksa":
        return foto && siapa && tenor !== null ? (
          <LangkahPeriksa
            k={k}
            jenis={jenis}
            foto={foto}
            siapa={siapa}
            nama={nama}
            kampung={kampung}
            nik={nik}
            nomorHp={nomorHp}
            lama={lama}
            pokok={pokok}
            tenor={tenor}
            jatuhTempo={
              jenis === "tempoan" && hariIni ? tanggalBertahun(geserTanggal(hariIni, tenor)) : null
            }
            titik={titik}
            memuat={akad.isPending}
            galat={akad.error?.message}
            onUbah={ubah}
            onCairkan={cairkan}
          />
        ) : null;
      default:
        return null;
    }
  })();

  return (
    <View style={g.layar}>
      {isi}

      <KameraSerahTerima
        terbuka={kamera}
        judulPakai={langkah === "periksa" ? "Kembali ke periksa" : "Selanjutnya"}
        keterangan={
          titik.status === "siap"
            ? `Titik rumah terdeteksi (±${titik.titik.akurasiMeter} m)`
            : titik.status === "mencari"
              ? "Titik rumah: mencari sinyal GPS…"
              : undefined
        }
        onTutup={() => {
          setKamera(false);
          // Akad dimulai dari kamera: batal sebelum ada foto = batal akad.
          if (!foto) router.back();
        }}
        onSelesai={(id, uri) => {
          setFoto({ id, uri, diambilAt: Date.now() });
          setKamera(false);
        }}
      />
      <LembarBatalAkad
        terbuka={batal}
        onTutup={() => setBatal(false)}
        onBatalkan={() => router.back()}
      />
      {akad.isPending ? <SelubungMencatat judul="Mencatat akad…" layar /> : null}
      {berhasil ? <StempelBerhasil keterangan="Akad tercatat" layar /> : null}
    </View>
  );
}
