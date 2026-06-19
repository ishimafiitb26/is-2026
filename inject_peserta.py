import csv
import firebase_admin
from firebase_admin import credentials, auth, firestore

try:
    # Membaca kunci rahasia yang sudah kamu ditaruh di folder utama
    cred = credentials.Certificate("serviceAccountKey.json")
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("[-] Protokol komunikasi Firebase Admin SDK berhasil diaktifkan.")
except Exception as e:
    print(f"[!] Gagal membaca berkas serviceAccountKey.json. Pastikan file ada di folder utama: {e}")
    exit()

def injeksi_peserta_is2026(file_csv):
    print("[-] Memulai siklus pendaftaran akun peserta...")
    
    with open(file_csv, mode='r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        
        sukses = 0
        gagal = 0
        
        for row in reader:
            nim = row['nim'].strip()
            nama = row['nama'].strip()
            
            # Username dirancang otomatis menggunakan format dummy email kampus
            dummy_email = f"{nim}@mahasiswa.itb.ac.id"
            # Kata sandi bawaan mutlak disamakan dengan NIM peserta
            password_default = nim
            
            try:
                # 1. Daftarkan akun utama ke Firebase Authentication
                auth.create_user(
                    email=dummy_email,
                    password=password_default,
                    display_name=nama,
                    uid=nim
                )
                
                # 2. Simpan data profil dasar ke Firestore Database
                db.collection("users").document(nim).set({
                    "email": dummy_email,
                    "name": nama,
                    "role": "user",  # Mengunci hak akses maba agar hanya menjadi peserta biasa
                    "createdAt": firestore.SERVER_TIMESTAMP
                })
                
                print(f"[✓] Terdaftar: NIM/Username {nim} - {nama}")
                sukses += 1
                
            except Exception as err:
                print(f"[X] Gagal mendaftarkan NIM {nim}: {err}")
                gagal += 1
                
    print("\n==================================================")
    print(f"[Summary] Selesai: {sukses} Akun Berhasil, {gagal} Gagal.")
    print("==================================================")

if __name__ == "__main__":
    injeksi_peserta_is2026("peserta.csv")