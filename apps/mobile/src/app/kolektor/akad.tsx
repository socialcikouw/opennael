import type { NasabahLama } from "@opennael/contracts";
import { type JenisPinjaman, kunciWilayah, syaratAkad, TENOR_PINJAMAN } from "@opennael/domain";
import { LABEL_JENIS, namaTenor, rupiah } from "@opennael/format";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import {
  type FotoSerahTerima,
  fotoMasihBerlaku,
  IsianFotoSerahTerima,
} from "../../komponen/kamera-serah-terima";
import { useWarna } from "../../komponen/tampilan";
import {
  Baris,
  Gulir,
  Isian,
  IsianUang,
  Kartu,
  Keterangan,
  PesanGalat,
  Pilihan,
  Tombol,
  TombolTeks,
  useG,
} from "../../komponen/ui";
import { cobaAturan } from "../../lib/aturan";
import { tulis, useKampung, useNasabahLama, useTulis } from "../../lib/lapangan";

const POKOK_CEPAT = [500_000, 1_000_000, 1_500_000, 2_000_000];

/**
 * AKAD BARU (A) — orang baru, atau nasabah lama pegangan sendiri yang pinjam
 * lagi. Angka pratinjau = rumus server (`syaratAkad`). Foto diambil terakhir,
 * saat uang diserahkan.
 */
export default function Akad() {
  const WARNA = useWarna();
  const [siapa, setSiapa] = useState<"baru" | "lama">("baru");
  const [nama, setNama] = useState("");
  const [kampungTeks, setKampungTeks] = useState("");
  const [kampungId, setKampungId] = useState<string | null>(null);
  const [nik, setNik] = useState("");
  const [nomorHp, setNomorHp] = useState("");
  const [lama, setLama] = useState<NasabahLama | null>(null);
  // Dibuka dari tombol + mode Harian/Mingguan/Tempoan: jenisnya mengikuti mode, tanpa pilihan.
  const param = useLocalSearchParams<{ jenis?: string }>().jenis;
  const jenisTetap = param && param in TENOR_PINJAMAN ? (param as JenisPinjaman) : null;
  const [jenis, setJenis] = useState<JenisPinjaman>(jenisTetap ?? "harian");
  const [tenor, setTenor] = useState<number>(TENOR_PINJAMAN[jenisTetap ?? "harian"][0] ?? 0);
  const [pokok, setPokok] = useState(1_000_000);
  const [foto, setFoto] = useState<FotoSerahTerima | null>(null);
  const akad = useTulis(tulis.akad);

  const pilihJenis = (j: JenisPinjaman) => {
    setJenis(j);
    setTenor(TENOR_PINJAMAN[j][0] ?? 0);
  };
  const pilihLama = (n: NasabahLama | null) => {
    setLama(n);
    if (n?.terakhir && (!jenisTetap || n.terakhir.jenis === jenisTetap)) {
      pilihJenis(n.terakhir.jenis);
      setPokok(n.terakhir.pokok);
    }
  };

  const syarat = cobaAturan(() => syaratAkad(jenis, pokok, tenor));
  const namaNasabah = siapa === "lama" ? lama?.nama : nama.trim();
  const nasabahLengkap = siapa === "lama" ? !!lama : !!nama.trim() && !!kampungTeks.trim();
  const fotoSah = fotoMasihBerlaku(foto);

  const simpan = () => {
    if (!syarat.hasil || !fotoMasihBerlaku(foto)) return;
    const nasabah =
      siapa === "lama" && lama
        ? { nasabahId: lama.id }
        : {
            nama: nama.trim(),
            kampung: kampungId ? { wilayahId: kampungId } : { nama: kampungTeks.trim() },
            ...(nik ? { nik } : {}),
            ...(nomorHp ? { nomorHp } : {}),
          };
    Alert.alert(
      "Simpan akad?",
      `Serahkan ${rupiah(syarat.hasil.pencairan)} tunai ke ${namaNasabah}.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Simpan",
          onPress: () =>
            akad.mutate(
              { nasabah, jenis, pokok, tenor, fotoSerahTerimaId: foto.id },
              { onSuccess: () => router.back() },
            ),
        },
      ],
    );
  };

  return (
    <Gulir>
      <Pilihan
        segmen
        pilihan={[
          { nilai: "baru", teks: "Orang baru" },
          { nilai: "lama", teks: "Nasabah lama" },
        ]}
        nilai={siapa}
        onPilih={setSiapa}
      />

      {siapa === "baru" ? (
        <>
          <Isian
            label="Nama nasabah"
            value={nama}
            onChangeText={setNama}
            maxLength={50}
            autoCapitalize="words"
          />
          <PilihKampung
            teks={kampungTeks}
            terpilih={kampungId}
            onUbah={(teks, id) => {
              setKampungTeks(teks);
              setKampungId(id);
            }}
          />
          <Isian
            label="NIK (boleh kosong)"
            value={nik}
            onChangeText={(t) => setNik(t.replace(/\D/g, "").slice(0, 16))}
            keyboardType="number-pad"
            galat={nik && nik.length !== 16 ? "NIK 16 digit" : undefined}
          />
          <Isian
            label="Nomor HP (boleh kosong)"
            value={nomorHp}
            onChangeText={setNomorHp}
            keyboardType="phone-pad"
            maxLength={16}
          />
        </>
      ) : (
        <PilihNasabahLama terpilih={lama} onPilih={pilihLama} />
      )}

      {jenisTetap ? (
        <Stack.Screen options={{ title: `Akad ${LABEL_JENIS[jenisTetap]}` }} />
      ) : (
        <Pilihan
          segmen
          label="Jenis pinjaman"
          pilihan={(["harian", "mingguan", "tempoan"] as const).map((j) => ({
            nilai: j,
            teks: LABEL_JENIS[j],
          }))}
          nilai={jenis}
          onPilih={pilihJenis}
        />
      )}
      {TENOR_PINJAMAN[jenis].length > 1 ? (
        <Pilihan
          label="Tenor"
          pilihan={TENOR_PINJAMAN[jenis].map((t) => ({ nilai: t, teks: namaTenor(jenis, t) }))}
          nilai={tenor}
          onPilih={setTenor}
        />
      ) : null}
      <IsianUang label="Pokok" nilai={pokok} onUbah={setPokok} />
      <Pilihan
        pilihan={POKOK_CEPAT.map((n) => ({ nilai: n, teks: rupiah(n) }))}
        nilai={pokok}
        onPilih={setPokok}
      />

      {syarat.hasil ? (
        <Kartu>
          <Baris label="Potongan admin" nilai={rupiah(syarat.hasil.potonganAdmin)} />
          <Baris label="Masuk tabungan" nilai={rupiah(syarat.hasil.tabunganMasuk)} />
          <Baris
            label="Tunai ke nasabah"
            nilai={rupiah(syarat.hasil.pencairan)}
            tebal
            warna={WARNA.utama}
          />
          <Baris label="Total kembali" nilai={rupiah(syarat.hasil.totalKembali)} />
          <Baris
            label={jenis === "tempoan" ? "Dibayar sekali" : "Angsuran"}
            nilai={rupiah(syarat.hasil.angsuran)}
          />
        </Kartu>
      ) : (
        <PesanGalat pesan={syarat.galat} />
      )}

      <IsianFotoSerahTerima nilai={foto} onUbah={setFoto} />
      <PesanGalat pesan={akad.error?.message} />
      <Tombol
        judul="Simpan akad"
        ikon="circle-check"
        memuat={akad.isPending}
        nonaktif={!nasabahLengkap || !syarat.hasil || !fotoSah || (!!nik && nik.length !== 16)}
        onPress={simpan}
      />
    </Gulir>
  );
}

/** Kampung: ketik bebas, atau ketuk kampung yang sudah ada (ejaan baku). */
function PilihKampung(props: {
  teks: string;
  terpilih: string | null;
  onUbah: (teks: string, id: string | null) => void;
}) {
  const g = useG();
  const kampung = useKampung();
  const saran = useMemo(() => {
    const kunci = kunciWilayah(props.teks);
    return (kampung.data ?? [])
      .filter((k) => !kunci || kunciWilayah(k.nama).includes(kunci))
      .slice(0, 8);
  }, [kampung.data, props.teks]);

  return (
    <View style={g.tumpuk2}>
      <Isian
        label="Kampung"
        value={props.teks}
        onChangeText={(t) => props.onUbah(t, null)}
        placeholder="Ketik atau pilih di bawah"
        maxLength={50}
        autoCapitalize="words"
      />
      {props.terpilih ? null : (
        <View style={g.bungkus}>
          {saran.map((k) => (
            <Pressable
              key={k.id}
              onPress={() => props.onUbah(k.nama, k.id)}
              style={({ pressed }) => [g.chip, pressed ? g.ditekan : null]}
            >
              <Text style={g.teksKecil}>{k.nama}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

function PilihNasabahLama(props: {
  terpilih: NasabahLama | null;
  onPilih: (n: NasabahLama | null) => void;
}) {
  const WARNA = useWarna();
  const g = useG();
  const daftar = useNasabahLama();
  const [cari, setCari] = useState("");
  const cocok = useMemo(() => {
    const kunci = kunciWilayah(cari);
    return (daftar.data ?? [])
      .filter((n) => !kunci || kunciWilayah(`${n.nama} ${n.kampung}`).includes(kunci))
      .slice(0, 30);
  }, [daftar.data, cari]);

  if (props.terpilih) {
    const n = props.terpilih;
    return (
      <Kartu>
        <Text style={g.teksTebal}>{n.nama}</Text>
        <Text style={g.teksKecil}>{n.kampung}</Text>
        {n.terakhir ? (
          <Baris
            label={`Terakhir: ${LABEL_JENIS[n.terakhir.jenis]} ke-${n.terakhir.pinjamanKe}`}
            nilai={rupiah(n.terakhir.pokok)}
          />
        ) : null}
        <Baris label="Tabungan" nilai={rupiah(n.tabungan)} />
        <TombolTeks judul="Ganti nasabah" onPress={() => props.onPilih(null)} />
      </Kartu>
    );
  }

  return (
    <View style={g.tumpuk2}>
      <Isian
        label="Cari nasabah lama"
        ikon="search"
        value={cari}
        onChangeText={setCari}
        placeholder="Nama / kampung"
        clearButtonMode="while-editing"
      />
      {daftar.isPending ? <ActivityIndicator color={WARNA.utama} /> : null}
      <PesanGalat pesan={daftar.error?.message} />
      {daftar.data && cocok.length === 0 ? (
        <Keterangan>Tidak ada nasabah lama tanpa pinjaman aktif.</Keterangan>
      ) : null}
      {cocok.map((n) => (
        <Pressable
          key={n.id}
          onPress={() => props.onPilih(n)}
          style={({ pressed }) => [g.butirDaftar, pressed ? g.butirDitekan : null]}
        >
          <Text style={g.teksTebal}>{n.nama}</Text>
          <Text style={g.teksKecil}>
            {n.kampung}
            {n.terakhir
              ? ` · terakhir ${LABEL_JENIS[n.terakhir.jenis]} ${rupiah(n.terakhir.pokok)}`
              : ""}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
