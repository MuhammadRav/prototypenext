import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_PATH = join(process.cwd(), "data", "db.json");

// --- GET (Tetap sama persis seperti request Anda) ---
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const jalurPendaftaran = searchParams.get("jalurPendaftaran");
    const statusBerkas = searchParams.get("statusBerkas");
    const jadwalWawancaraId = searchParams.get("jadwalWawancaraId");

    const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    let candidates = data.calonMahasiswa || [];

    // Filter logic
    if (jalurPendaftaran) {
      candidates = candidates.filter(
        (c: any) => c.jalurPendaftaran === jalurPendaftaran
      );
    }
    if (statusBerkas) {
      candidates = candidates.filter(
        (c: any) => c.statusBerkas === statusBerkas
      );
    }
    if (jadwalWawancaraId === "null") {
      candidates = candidates.filter((c: any) => c.jadwalWawancaraId === null);
    }

    return NextResponse.json(candidates);
  } catch (error) {
    console.error("Error reading calonMahasiswa data:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

// --- PATCH (Dimodifikasi: Menambah logika ADM06 tanpa menghapus ADM02) ---
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    // Tambahkan parameter 'type' untuk membedakan aksi
    const { id, decision, type } = body; 

    if (!id || !decision) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // 1. Baca file
    const fileData = readFileSync(DATA_PATH, "utf-8");
    const db = JSON.parse(fileData);

    // 2. Cari index mahasiswa
    const index = db.calonMahasiswa.findIndex((c: any) => c.id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }

    // ==========================================
    // LOGIKA BARU UNTUK ADM06 (KEPUTUSAN AKHIR)
    // ==========================================
    if (type === "FINAL_DECISION") {
      // Langsung update statusAkhir menjadi "Diterima" atau "Ditolak"
      // Tidak mengubah status berkas karena sudah pasti lengkap
      db.calonMahasiswa[index] = {
        ...db.calonMahasiswa[index],
        statusAkhir: decision, // "Diterima" | "Ditolak"
        tanggalKeputusan: new Date().toISOString(),
        olehAdmin: "Pimpinan Admisi", // Opsional
      };

      // Simpan & Return untuk ADM06
      writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));
      return NextResponse.json({ 
        success: true, 
        message: `Keputusan Final: ${decision}`,
        data: db.calonMahasiswa[index] 
      });
    }

    // ==========================================
    // LOGIKA ASLI UNTUK ADM02 (VERIFIKASI BERKAS)
    // (Tidak ada yang dikurangi/diubah dari kode asli Anda)
    // ==========================================
    
    // 3. Tentukan nilai baru berdasarkan keputusan
    const isLolos = decision === "Lolos";
    const statusBerkasBaru = isLolos ? "Lengkap" : "Ditolak";
    const statusAkhirBaru = isLolos ? "Proses Seleksi" : "Ditolak";
    const statusSeleksiBaru = isLolos ? "Lolos" : "Gagal";

    // 4. Update Object Mahasiswa
    db.calonMahasiswa[index] = {
      ...db.calonMahasiswa[index],
      statusBerkas: statusBerkasBaru,
      statusAkhir: statusAkhirBaru,
      tanggalVerifikasi: new Date().toISOString(),
      olehAdmin: "Admin Verifikasi",
      tahapanSeleksi: {
        ...db.calonMahasiswa[index].tahapanSeleksi,
        seleksiBerkas: {
          ...db.calonMahasiswa[index].tahapanSeleksi.seleksiBerkas,
          status: statusSeleksiBaru
        }
      }
    };

    // 5. Tulis ulang ke file db.json (Simpan Permanen)
    writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json({ 
      success: true, 
      message: `Status updated to ${statusBerkasBaru}`,
      data: db.calonMahasiswa[index] 
    });

  } catch (error) {
    console.error("Error updating calonMahasiswa:", error);
    return NextResponse.json({ error: "Failed to update data" }, { status: 500 });
  }
}