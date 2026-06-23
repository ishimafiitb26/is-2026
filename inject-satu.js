const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

// Ganti dengan nama file service account JSON kamu yang sebenarnya
const serviceAccount = require("./serviceAccountKey.json"); 

// Inisialisasi Firebase Admin V12 Modern
initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();
const auth = getAuth();

// ==========================================
// UBAH DATA ANAK INI SESUAIKAN DENGAN ASLINYA
// ==========================================
const targetNIM = "10225127"; 
const targetEmail = "10225127@mahasiswa.itb.ac.id"; 
const targetPassword = "10225127"; 
const targetNama = "Ihsan Fishudur";
// ==========================================

async function injectSingleUser() {
  try {
    // 1. Memaksa pembuatan akun Auth dengan UID = NIM
    await auth.createUser({
      uid: targetNIM,
      email: targetEmail,
      password: targetPassword,
      displayName: targetNama,
    });
    console.log(`✅ Sukses Auth: Akun ${targetNIM} berhasil dibuat dengan UID = NIM.`);

    // 2. Memasukkan data ke Firestore agar lolos whitelist
    await db.collection("users").doc(targetNIM).set({
      nim: targetNIM,
      email: targetEmail,
      nama: targetNama,
      role: "user",
      createdAt: FieldValue.serverTimestamp()
    });
    console.log(`✅ Sukses Firestore: Data ${targetNIM} berhasil ditanam.`);
    console.log("🚀 PESERTA SUDAH BISA LOGIN SEKARANG!");

  } catch (error) {
    console.error("❌ Gagal Inject:", error.message);
  }
}

injectSingleUser();