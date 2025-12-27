import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_PATH = join(process.cwd(), "data", "db.json");

// --- GET: Ambil Data Jadwal ---
export async function GET() {
  try {
    const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    return NextResponse.json(data.jadwalWawancara || []);
  } catch (error) {
    console.error("Error reading jadwalWawancara data:", error);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}

// --- POST: Simpan Jadwal Baru & Update Kandidat ---
export async function POST(request: Request) {
  try {
    const newSchedule = await request.json();

    // Validasi sederhana
    if (!newSchedule.id || !newSchedule.pesertaIds) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // 1. Baca Database
    const fileData = readFileSync(DATA_PATH, "utf-8");
    const db = JSON.parse(fileData);

    // 2. Tambahkan Jadwal Baru
    if (!db.jadwalWawancara) db.jadwalWawancara = [];
    db.jadwalWawancara.push(newSchedule);

    // 3. Update Status Kandidat (Link ke Jadwal)
    // Kita loop calonMahasiswa, jika ID-nya ada di pesertaIds jadwal baru, update fieldnya
    db.calonMahasiswa = db.calonMahasiswa.map((mhs: any) => {
      if (newSchedule.pesertaIds.includes(mhs.id)) {
        return {
          ...mhs,
          jadwalWawancaraId: newSchedule.id, // Link ke jadwal
          statusAkhir: "Wawancara Terjadwal" // Optional: Update status akhir
        };
      }
      return mhs;
    });

    // 4. Simpan Perubahan ke File
    writeFileSync(DATA_PATH, JSON.stringify(db, null, 2));

    return NextResponse.json({ success: true, message: "Jadwal tersimpan" });
  } catch (error) {
    console.error("Error saving schedule:", error);
    return NextResponse.json({ error: "Failed to save data" }, { status: 500 });
  }
}