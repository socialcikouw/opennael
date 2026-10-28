# Operasi idempoten

Disetujui sebagai bagian arsitektur 28 Oktober 2026. Menyimpan hasil berhasil
suatu operasi bersama perubahan usahanya, dalam transaksi PostgreSQL yang sama.

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid | PK, acak |
| kantor_id | uuid | wajib, FK kantor |
| pengguna_id | uuid | wajib, FK gabungan pengguna(id, kantor_id) |
| kunci | uuid | identitas operasi dari klien; unik per kantor/pengguna |
| operasi | varchar(120) | wajib, tidak kosong; modul + metode |
| sidik_isi | varchar(64) | SHA-256 heksadesimal kecil; input kanonik + peran |
| hasil | jsonb | wajib, hasil JSON berhasil |
| dibuat_at | timestamptz | wajib, now() |

UNIQUE `uniq_operasi_idempoten_pelaku_kunci` pada kantor_id, pengguna_id, kunci.
FK `operasi_idempoten_kantor_fk` dan `operasi_idempoten_pengguna_kantor_fk`.
CHECK `operasi_idempoten_operasi_check` dan `operasi_idempoten_sidik_isi_check`.

Header `Idempotency-Key` adalah UUID, opsional untuk kompatibilitas klien lama.
Operasi terautentikasi dan input tervalidasi sebelum memanggil pelaksana.
Pelaksana mengambil advisory lock tingkat transaksi berdasarkan kantor/pengguna/
kunci, membaca hasil lama, lalu menjalankan operasi bila belum ada. Kunci
sama untuk metode/isi/peran berbeda ditolak 409. Galat tidak disimpan dan
seluruh perubahan di-rollback. Hasil berhasil disimpan sebelum commit; retry
setelah respons hilang mengembalikan hasil yang sama, tanpa menjalankan aturan
tanggal/jam/hari ulang. HTTP tetap memakai status berhasil endpoint semula.

Tabel ini metadata teknis, bukan buku uang. Belum ada penghapusan otomatis:
retensi harus mempertahankan perlindungan retry operasi lama. Tidak menyimpan
token, kata sandi, atau berkas foto. Header tidak dipakai untuk autentikasi
atau upload berkas; cakupan awal seluruh operasi uang dan keadaan hari.

Uji: CHECK/FK/UNIQUE, pelaku lintas kantor, replay, isi berbeda, kegagalan
atomik, dua koneksi bersamaan, dan kontrak HTTP. Semua ke Supabase dev.
