import { hitungBayar } from "@opennael/domain";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cobaAturan, rupiah } from "../lib/format";
import { tulis, useTulis } from "../lib/lapangan";
import { AvatarNasabah } from "./foto-nasabah";
import type { KartuVM } from "./kartu-tagihan";
import { useGaya } from "./tampilan";
import { HURUF, RUANG, SUDUT, TEBAL, type Warna } from "./tema";
import { Baris, IsianUang, PesanGalat, Pilihan, Tombol, TombolTeks } from "./ui";

/**
 * LEMBAR SETOR — naik dari bawah saat tombol Setor di kartu diketuk. Nominal
 * terisi angsuran; 2× / 3× sekali ketuk; sisa saldo dihitung aturan yang sama
 * dengan server (`hitungBayar`). Pelunasan sebagian, libur, lunas, dan gulung
 * tetap di kartu lengkap — lembar ini untuk kasus yang terjadi di hampir
 * setiap rumah.
 */
export function LembarSetor(props: {
  vm: KartuVM | null;
  onTutup: () => void;
  onKartuLengkap: (id: string) => void;
}) {
  const gaya = useGaya(buatGaya);
  const bawah = useSafeAreaInsets().bottom;
  const p = props.vm?.p ?? null;
  const [murni, setMurni] = useState(0);
  const bayar = useTulis(tulis.bayar);

  // Lembar dibuka untuk nasabah lain: isi ulang nominal & buang galat lama.
  const id = p?.id;
  const angsuran = p?.angsuran ?? 0;
  const { reset } = bayar;
  useEffect(() => {
    if (id) {
      setMurni(angsuran);
      reset();
    }
  }, [id, angsuran, reset]);

  const pratinjau = p ? cobaAturan(() => hitungBayar(p, murni, 0)) : null;
  const kali = p ? [1, 2, 3].filter((n) => n * p.angsuran <= p.saldo) : [];

  const simpan = () => {
    if (!p) return;
    bayar.mutate(
      { pinjamanId: p.id, setoranMurni: murni, setoranPelunasan: 0 },
      {
        onSuccess: () => {
          // Kartu turun ke bagian "sudah" dengan gerak halus.
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          props.onTutup();
        },
      },
    );
  };

  return (
    <Modal
      visible={p !== null}
      transparent
      animationType="slide"
      onRequestClose={props.onTutup}
      statusBarTranslucent
    >
      <Pressable style={gaya.tirai} onPress={props.onTutup} accessibilityLabel="Tutup" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[gaya.lembar, { paddingBottom: bawah + RUANG[4] }]}>
          <View style={gaya.pegangan} />
          {p ? (
            <>
              <View style={gaya.kepala}>
                <AvatarNasabah fotoId={p.fotoSerahTerimaId} nama={p.nasabah.nama} ukuran={44} />
                <View style={gaya.kepalaTeks}>
                  <Text style={gaya.nama} numberOfLines={1}>
                    {p.nasabah.nama}
                  </Text>
                  <Text style={gaya.meta}>
                    Angsuran {rupiah(p.angsuran)} · sisa {rupiah(p.saldo)}
                  </Text>
                </View>
              </View>
              <IsianUang label="Setoran" nilai={murni} onUbah={setMurni} />
              {kali.length > 1 ? (
                <Pilihan
                  pilihan={kali.map((n) => ({
                    nilai: n * p.angsuran,
                    teks: `${n}× ${rupiah(n * p.angsuran)}`,
                  }))}
                  nilai={murni}
                  onPilih={setMurni}
                />
              ) : null}
              {pratinjau?.hasil ? (
                <Baris
                  label="Sisa saldo sesudah setor"
                  nilai={rupiah(pratinjau.hasil.sisaSaldo)}
                  tebal
                />
              ) : (
                <PesanGalat pesan={pratinjau?.galat} />
              )}
              <PesanGalat pesan={bayar.error?.message} />
              <Tombol
                judul={`Simpan setoran ${rupiah(murni)}`}
                ikon="circle-check"
                memuat={bayar.isPending}
                nonaktif={!pratinjau?.hasil}
                onPress={simpan}
              />
              <View style={gaya.tautan}>
                <TombolTeks
                  judul="Libur, lunas, gulung, atau pelunasan sebagian — buka kartu lengkap"
                  onPress={() => props.onKartuLengkap(p.id)}
                />
              </View>
            </>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const buatGaya = (WARNA: Warna) =>
  StyleSheet.create({
    tirai: { flex: 1, backgroundColor: WARNA.tiraiGelap },
    lembar: {
      gap: RUANG[4],
      paddingHorizontal: RUANG[5],
      paddingTop: RUANG[3],
      borderTopLeftRadius: SUDUT.lebar,
      borderTopRightRadius: SUDUT.lebar,
      backgroundColor: WARNA.permukaan,
    },
    pegangan: {
      alignSelf: "center",
      width: 40,
      height: 5,
      borderRadius: SUDUT.bulat,
      backgroundColor: WARNA.garisTegas,
    },
    kepala: { flexDirection: "row", alignItems: "center", gap: RUANG[3] },
    kepalaTeks: { flex: 1, gap: RUANG[0.5] },
    nama: { ...HURUF.lg, fontWeight: TEBAL.tebal, color: WARNA.teks },
    meta: { ...HURUF.sm, color: WARNA.redup },
    tautan: { alignItems: "center" },
  });
