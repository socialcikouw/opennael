import { hitungBayar } from "@opennael/domain";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LembarBawah } from "../../../komponen/lembar-bawah";
import { useGaya, useWarna } from "../../../komponen/tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna, type WarnaMode } from "../../../komponen/tema";
import { Baris, IsianUang, PesanGalat } from "../../../komponen/ui";
import { cobaAturan, rupiah } from "../../../lib/format";
import type { KartuVM } from "../inti/kartu";

/**
 * LEMBAR BAYAR — kolektor mengisinya berdiri di depan rumah nasabah, jadi
 * hanya SATU angka dicetak besar: patokan angsuran yang harus ia tagih.
 * Nominal terisi angsuran; 2× / 3× sekali ketuk; sisa saldo dihitung aturan
 * yang sama dengan server.
 */
export function LembarBayar(props: {
  vm: KartuVM | null;
  aksen: WarnaMode;
  sedangKirim: boolean;
  galat: string | null;
  onTutup: () => void;
  onKirim: (vm: KartuVM, setoranMurni: number) => void;
}) {
  const WARNA = useWarna();
  const gaya = useGaya(buatGaya);
  const p = props.vm?.p ?? null;
  const [nominal, setNominal] = useState(0);
  const id = p?.id;
  const angsuran = p?.angsuran ?? 0;
  useEffect(() => {
    if (id) setNominal(angsuran);
  }, [id, angsuran]);

  const pratinjau = p ? cobaAturan(() => hitungBayar(p, nominal, 0)) : null;
  const kali = p ? [1, 2, 3].filter((n) => n * p.angsuran < p.saldo) : [];

  return (
    <LembarBawah
      terbuka={p !== null}
      onTutup={props.onTutup}
      judul={p ? p.nasabah.nama : undefined}
    >
      {p && props.vm ? (
        <>
          <View style={gaya.patokan}>
            <Text style={gaya.patokanLabel}>ANGSURAN</Text>
            <Text style={[gaya.patokanNilai, { color: props.aksen.teks }]}>
              {rupiah(p.angsuran)}
            </Text>
            <Text style={gaya.patokanKet}>
              Angsuran ke-{p.angsuranKe + 1} dari {p.tenor} · sisa {rupiah(p.saldo)}
            </Text>
          </View>
          <IsianUang label="Nominal setoran" nilai={nominal} onUbah={setNominal} />
          {kali.length > 1 ? (
            <View style={gaya.kali}>
              {kali.map((n) => {
                const nilai = n * p.angsuran;
                const aktif = nilai === nominal;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setNominal(nilai)}
                    style={[
                      gaya.pil,
                      aktif
                        ? { backgroundColor: props.aksen.lembut, borderColor: props.aksen.teks }
                        : null,
                    ]}
                  >
                    <Text style={[gaya.pilTeks, aktif ? { color: props.aksen.teks } : null]}>
                      {n}× · {rupiah(nilai)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
          {pratinjau?.hasil ? (
            <Baris
              label="Sisa saldo sesudah bayar"
              nilai={rupiah(pratinjau.hasil.sisaSaldo)}
              tebal
            />
          ) : (
            <PesanGalat pesan={pratinjau?.galat} />
          )}
          <PesanGalat pesan={props.galat} />
          <Pressable
            accessibilityRole="button"
            disabled={!pratinjau?.hasil || props.sedangKirim}
            onPress={() => props.vm && props.onKirim(props.vm, nominal)}
            style={({ pressed }) => [
              gaya.kirim,
              { backgroundColor: props.aksen.isi },
              !pratinjau?.hasil || props.sedangKirim ? gaya.mati : null,
              pressed ? gaya.ditekan : null,
            ]}
          >
            <Text style={[gaya.kirimTeks, { color: props.aksen.teksIsi }]}>
              {props.sedangKirim ? "Menyimpan…" : `Bayar ${rupiah(nominal)}`}
            </Text>
          </Pressable>
          <Text style={[gaya.patokanKet, { color: WARNA.samar }]}>
            Pelunasan sebagian & riwayat lengkap ada di kartu nasabah.
          </Text>
        </>
      ) : null}
    </LembarBawah>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    patokan: {
      alignItems: "center",
      gap: RUANG[1],
      paddingVertical: RUANG[3],
      borderRadius: SUDUT.besar,
      backgroundColor: WARNA.abu,
    },
    patokanLabel: {
      ...HURUF["2xs"],
      fontWeight: TEBAL.ekstra,
      letterSpacing: 1,
      color: WARNA.redup,
    },
    patokanNilai: { ...HURUF["3xl"], fontWeight: TEBAL.ekstra, fontVariant: ["tabular-nums"] },
    patokanKet: { ...HURUF.xs, color: WARNA.redup, textAlign: "center" },
    kali: { flexDirection: "row", flexWrap: "wrap", gap: RUANG[2] },
    pil: {
      paddingHorizontal: RUANG[3],
      paddingVertical: RUANG[2],
      borderRadius: SUDUT.bulat,
      borderWidth: 1,
      borderColor: WARNA.garisTegas,
    },
    pilTeks: { ...HURUF.sm, fontWeight: TEBAL.sedang, color: WARNA.teksTombol },
    kirim: {
      height: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: SUDUT.sedang,
    },
    kirimTeks: { ...HURUF.base, fontWeight: TEBAL.tebal },
    mati: { opacity: 0.5 },
    ditekan: { opacity: 0.8 },
  });
