import type { NasabahLama } from "@opennael/contracts";
import { geserTanggal, type JenisPinjaman, syaratAkad, tenorTunggal } from "@opennael/domain";
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
import { isiNasabahAkad, type KampungAkad } from "./inti/isi-akad";
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
import { LangkahJenis } from "./komponen/akad/langkah-jenis";
import { LangkahKampung } from "./komponen/akad/langkah-kampung";
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
import { ringkasTitikLatar, useTitikRumahLatar } from "./titik-rumah-latar";

/** Lama stempel Berhasil tampil sebelum kembali ke tab jenisnya. */
const TAMPIL_BERHASIL_MS = 1200;

/**
 * AKAD BARU (A) — orang baru, atau nasabah yang pernah melunasi; SATU PERTANYAAN PER LAYAR
 * (urutan: `inti/langkah-akad.ts`; langkah di `komponen/akad/`). Dibuka (+) di tab mana pun.
 * ← = langkah sebelumnya, ✕ = batalkan (ditanya dulu); "Ubah" di Periksa membuka langkahnya
 * lalu kembali ke Periksa. GPS dipantau di latar; titik terbaiknya jadi titik rumah begitu
 * akad tersimpan. Sesudahnya: stempel Berhasil, lalu tab jenisnya di segmen Droping.
 */
export function LayarAkad() {
  const [jenis, setJenis] = useState<JenisPinjaman | null>(null);
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
  const tenor = jenis === null ? null : (tenorTunggal(jenis) ?? tenorDipilih);
  const syaratSah =
    jenis !== null && tenor !== null && cobaAturan(() => syaratAkad(jenis, pokok, tenor)).hasil;

  const ke = (l: LangkahAkad) => {
    if (l === "foto") setKamera(true);
    else setLangkah(l);
  };
  const lanjut = () => {
    // Pokok diubah dari Periksa sampai tenornya tak berlaku lagi: pilih tenor dulu.
    if (kePeriksa && langkah === "pokok" && tenor !== null && !syaratSah) return ke("tenor");
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

  // Tombol kembali Android = ← (bukan menutup akad); dipasang ulang tiap render supaya
  // memakai langkah terkini. Lembar & kamera (Modal) menanganinya sendiri lebih dulu.
  useEffect(() => {
    const tahan = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!akad.isPending && !berhasil) mundur();
      return true;
    });
    return () => tahan.remove();
  });

  useEffect(() => {
    if (!berhasil) return;
    const t = setTimeout(
      () =>
        router.dismissTo({ pathname: ruteJenis(jenis ?? "harian"), params: { segmen: "droping" } }),
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
    lanjut();
  };
  const pilihJenis = (j: JenisPinjaman) => {
    if (j !== jenis) {
      setJenis(j);
      setTenor(null);
      // Pinjaman terakhir berjenis sama = patokan pokok (hanya bila pokok belum diisi).
      const terakhir = lama?.terakhir;
      if (ketukan.length === 0 && terakhir?.jenis === j) setKetukan([terakhir.pokok]);
      // Diubah dari Periksa: tenor jenis lama tak berlaku — pilih tenornya dulu, lalu kembali.
      if (kePeriksa && tenorTunggal(j) === null) return setLangkah("tenor");
    }
    if (kePeriksa) {
      setKePeriksa(false);
      setLangkah("periksa");
    } else setLangkah(langkahBerikut(urutanLangkah(siapa, j), "jenis"));
  };
  const tekanPapan = (kunci: string) => {
    if (akad.error) akad.reset();
    setKetukan((k) => tekanPokok(k, kunci));
  };

  const cairkan = () => {
    if (!jenis || !foto || !fotoMasihBerlaku(foto) || tenor === null) return;
    const nasabah = isiNasabahAkad({
      siapa,
      lamaId: lama?.id ?? null,
      nama,
      kampung,
      nik,
      nomorHp,
    });
    if (!nasabah || !syaratSah) return;
    akad.mutate(
      {
        akad: { nasabah, jenis, pokok, tenor, fotoSerahTerimaId: foto.id },
        titik: titik.status === "siap" ? titik.titik : null,
      },
      { onSuccess: () => setBerhasil(true) },
    );
  };

  const k: Kerangka = {
    judul: jenis ? `Akad ${LABEL_JENIS[jenis]}` : "Akad Baru",
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
      case "jenis":
        return <LangkahJenis k={k} nilai={jenis} lama={lama} onPilih={pilihJenis} />;
      case "pokok":
        return jenis === null ? null : (
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
        return jenis === null || tenorTunggal(jenis) !== null ? null : (
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
        return jenis && foto && siapa && tenor !== null && syaratSah ? (
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
        keterangan={ringkasTitikLatar(titik)}
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
