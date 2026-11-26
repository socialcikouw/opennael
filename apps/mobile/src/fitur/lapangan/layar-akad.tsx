import type { NasabahLama } from "@opennael/contracts";
import { type JenisPinjaman, syaratAkad, tenorTunggal } from "@opennael/domain";
import { LABEL_JENIS, rupiah, tanggalBertahun } from "@opennael/format";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, StyleSheet, View } from "react-native";
import Animated, { LayoutAnimationConfig } from "react-native-reanimated";
import { ruteJenis } from "@/fitur/mode";
import { g } from "@/komponen/ui/gaya-bersama";
import { GESER_LANGKAH } from "@/komponen/ui/gerak";
import { getar } from "@/komponen/ui/getar";
import { SelubungMencatat } from "@/komponen/ui/selubung-mencatat";
import { StempelBerhasil } from "@/komponen/ui/stempel-berhasil";
import { cobaAturan } from "@/lib/aturan";
import { tulis, useAkad, useHariIni } from "./data";
import { isiNasabahAkad, type KampungAkad } from "./inti/isi-akad";
import {
  type LangkahAkad,
  langkahBerikut,
  langkahSebelum,
  nomorLangkah,
  perkiraanJatuhTempo,
  type SiapaNasabah,
  urutanLangkah,
} from "./inti/langkah-akad";
import { jumlahKetukan, tekanPokok } from "./inti/papan";
import type { Kerangka } from "./komponen/akad/kerangka-langkah";
import { LangkahData } from "./komponen/akad/langkah-data";
import { LangkahJenis } from "./komponen/akad/langkah-jenis";
import { LangkahKampung } from "./komponen/akad/langkah-kampung";
import { LangkahPeriksa } from "./komponen/akad/langkah-periksa";
import { LangkahPernahMelunasi } from "./komponen/akad/langkah-pernah-melunasi";
import { LangkahPokok } from "./komponen/akad/langkah-pokok";
import { LangkahSiapa } from "./komponen/akad/langkah-siapa";
import { LembarBatalAkad } from "./komponen/akad/lembar-batal-akad";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  KameraSerahTerima,
} from "./komponen/kamera-serah-terima";
import { ringkasTitikLatar, useTitikRumahLatar } from "./titik-rumah-latar";

/** Lama stempel Berhasil tampil sebelum kembali ke tab jenisnya. */
const TAMPIL_BERHASIL_MS = 1200;

type Arah = "maju" | "mundur";

/**
 * AKAD BARU (A) — orang baru, atau nasabah yang pernah melunasi; SATU PERTANYAAN PER LAYAR
 * (urutan: `inti/langkah-akad.ts`; langkah di `komponen/akad/`). Dibuka (+) di tab mana pun.
 * ← = langkah sebelumnya (di langkah pertama: tanya batal), ✕ = batalkan (ditanya dulu);
 * "Ubah" di Periksa membuka langkahnya lalu kembali ke Periksa. Tiap pindah langkah bergeser:
 * maju dari kanan, mundur dari kiri (`GESER_LANGKAH`).
 *
 * FOTO SESUDAH POKOK (keputusan pemilik 26 Nov 2026): "Selanjutnya" di Pokok → server
 * memeriksa aturan akad (`periksaAkad`, tanpa menulis) → kamera "serahkan Rp …, potret
 * nasabah memegang uangnya" → Periksa → Cairkan. Foto terikat isian saat dipotret: mengubah nasabah, jenis,
 * atau pokok sesudahnya membuang foto (jumlah di foto harus jumlah yang dicairkan).
 * GPS dipantau di latar sejak layar dibuka; titik terbaiknya jadi titik rumah begitu akad
 * tersimpan (nasabah lama: menimpa titik lama bila ≤ 30 m dan saklar "Perbarui titik
 * rumah" di Periksa menyala). Sesudahnya: stempel Berhasil, lalu tab jenisnya di segmen Droping.
 */
export function LayarAkad() {
  const [jenis, setJenis] = useState<JenisPinjaman | null>(null);
  const [langkah, setLangkah] = useState<LangkahAkad>("siapa");
  const [arah, setArah] = useState<Arah>("maju");
  const [kePeriksa, setKePeriksa] = useState(false);
  const [foto, setFoto] = useState<(FotoSerahTerima & { kunci: string }) | null>(null);
  const [siapa, setSiapa] = useState<SiapaNasabah | null>(null);
  const [nama, setNama] = useState("");
  const [kampung, setKampung] = useState<KampungAkad | null>(null);
  const [nik, setNik] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [lama, setLama] = useState<NasabahLama | null>(null);
  const [ketukan, setKetukan] = useState<readonly number[]>([]);
  const [batal, setBatal] = useState(false);
  const [berhasil, setBerhasil] = useState(false);
  const [memeriksa, setMemeriksa] = useState(false);
  const [galatPeriksa, setGalatPeriksa] = useState<string | null>(null);
  const akad = useAkad();
  const titik = useTitikRumahLatar();
  // Nasabah lama: titik baru menimpa titik lama kecuali dimatikan (27 Nov 2026).
  const [perbaruiTitik, setPerbaruiTitik] = useState(true);
  const hariIni = useHariIni().data?.kalender.tanggal ?? null;

  const urutan = urutanLangkah(siapa);
  const pokok = jumlahKetukan(ketukan);
  // Semua jenis bertenor tunggal (A2) — tak ada langkah tenor.
  const tenor = jenis === null ? null : tenorTunggal(jenis);
  const syaratSah =
    jenis !== null && tenor !== null
      ? cobaAturan(() => syaratAkad(jenis, pokok, tenor)).hasil
      : null;
  const nasabahIsi = isiNasabahAkad({
    siapa,
    lamaId: lama?.id ?? null,
    nama,
    kampung,
    nik,
    nomorHp,
  });
  // Isian yang diikat foto: berubah sesudah dipotret → foto tak berlaku lagi.
  const kunciIsi = JSON.stringify([nasabahIsi, jenis, pokok]);
  const fotoCocok = foto !== null && foto.kunci === kunciIsi ? foto : null;

  const ke = (l: LangkahAkad, a: Arah = "maju") => {
    setArah(a);
    setLangkah(l);
  };
  const kembaliKePeriksa = () => {
    setKePeriksa(false);
    ke("periksa");
  };
  const lanjut = () => {
    if (kePeriksa) kembaliKePeriksa();
    else ke(langkahBerikut(urutan, langkah));
  };
  const mundur = () => {
    if (kePeriksa) {
      setKePeriksa(false);
      ke("periksa", "mundur");
      return;
    }
    const sebelum = langkahSebelum(urutan, langkah);
    if (sebelum) ke(sebelum, "mundur");
    else setBatal(true);
  };
  const ubah = (l: LangkahAkad) => {
    setKePeriksa(true);
    ke(l, "mundur");
  };

  // Tombol kembali Android = ← (bukan menutup akad); dipasang ulang tiap render supaya
  // memakai langkah terkini. Lembar (Modal) menanganinya sendiri lebih dulu.
  useEffect(() => {
    const tahan = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!akad.isPending && !berhasil && !memeriksa) mundur();
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
    ke(langkahBerikut(urutanLangkah(s), "siapa"));
  };
  const pilihLama = (n: NasabahLama) => {
    setLama(n);
    lanjut();
  };
  const pilihJenis = (j: JenisPinjaman) => {
    if (j !== jenis) {
      setJenis(j);
      // Pinjaman terakhir berjenis sama = patokan pokok (hanya bila pokok belum diisi).
      const terakhir = lama?.terakhir;
      if (ketukan.length === 0 && terakhir?.jenis === j) setKetukan([terakhir.pokok]);
    }
    if (kePeriksa) kembaliKePeriksa();
    else ke(langkahBerikut(urutanLangkah(siapa), "jenis"));
  };
  const tekanPapan = (kunci: string) => {
    if (akad.error) akad.reset();
    setGalatPeriksa(null);
    setKetukan((k) => tekanPokok(k, kunci));
  };

  /** Periksa ke server dulu (tanpa menulis); boleh → kamera serah terima. */
  const serahkan = async () => {
    if (!jenis || tenor === null || !nasabahIsi || !syaratSah || memeriksa) return;
    setGalatPeriksa(null);
    setMemeriksa(true);
    try {
      await tulis.periksaAkad({ nasabah: nasabahIsi, jenis, pokok, tenor });
      ke("foto");
    } catch (e) {
      getar("galat");
      setGalatPeriksa(e instanceof Error ? e.message : String(e));
    } finally {
      setMemeriksa(false);
    }
  };

  const cairkan = () => {
    if (!jenis || !fotoCocok || !fotoMasihBerlaku(fotoCocok) || tenor === null) return;
    if (!nasabahIsi || !syaratSah) return;
    akad.mutate(
      {
        akad: { nasabah: nasabahIsi, jenis, pokok, tenor, fotoSerahTerimaId: fotoCocok.id },
        titik: titik.status === "siap" ? titik.titik : null,
        perbarui: perbaruiTitik,
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
      case "data":
        return (
          <LangkahData
            k={k}
            nama={nama}
            nik={nik}
            nomorHp={nomorHp}
            onNama={setNama}
            onNik={setNik}
            onNomorHp={setNomorHp}
            onLanjut={lanjut}
          />
        );
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
            memuat={memeriksa}
            galat={galatPeriksa}
            onTekan={tekanPapan}
            // Selanjutnya = server memeriksa akad, lalu kamera serah terima (bukan Periksa).
            onLanjut={kePeriksa ? kembaliKePeriksa : () => void serahkan()}
          />
        );
      case "periksa":
        return jenis && siapa && tenor !== null && syaratSah ? (
          <LangkahPeriksa
            k={k}
            jenis={jenis}
            foto={fotoCocok}
            siapa={siapa}
            nama={nama}
            kampung={kampung}
            nik={nik}
            nomorHp={nomorHp}
            lama={lama}
            pokok={pokok}
            tenor={tenor}
            jatuhTempo={
              jenis === "tempoan" && hariIni ? tanggalBertahun(perkiraanJatuhTempo(hariIni)) : null
            }
            titik={titik}
            perbaruiTitik={perbaruiTitik}
            onPerbaruiTitik={setPerbaruiTitik}
            memeriksa={memeriksa}
            memuat={akad.isPending}
            galat={galatPeriksa ?? akad.error?.message}
            onUbah={ubah}
            onSerahkan={() => void serahkan()}
            onCairkan={cairkan}
          />
        ) : null;
      case "foto":
        return syaratSah ? (
          <KameraSerahTerima
            terbuka
            sebaris
            petunjuk={`Serahkan ${rupiah(syaratSah.pencairan)}, lalu potret nasabah memegang uangnya — wajah terlihat jelas.`}
            judulPakai="Selanjutnya"
            keterangan={ringkasTitikLatar(titik)}
            onTutup={() => ke(fotoCocok ? "periksa" : "pokok", "mundur")}
            onSelesai={(id, uri) => {
              setFoto({ id, uri, diambilAt: Date.now(), kunci: kunciIsi });
              ke("periksa");
            }}
          />
        ) : null;
      default:
        return null;
    }
  })();

  const gerak = GESER_LANGKAH[arah];
  return (
    <View style={g.layar}>
      {/* Langkah pertama tak bergeser masuk — layar akad sendiri sudah naik. */}
      <LayoutAnimationConfig skipEntering>
        <Animated.View
          key={langkah}
          entering={gerak.masuk}
          exiting={gerak.keluar}
          style={StyleSheet.absoluteFill}
        >
          {isi}
        </Animated.View>
      </LayoutAnimationConfig>

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
