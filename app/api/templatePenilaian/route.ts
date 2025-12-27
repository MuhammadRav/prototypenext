import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_PATH = join(process.cwd(), "data", "db.json");

// --- TYPES ---
interface Template {
  id: string;
  namaTemplate: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  poinPenilaian: any[];
}

interface DB {
  templatePenilaian: Template[];
}

// --- HELPER FUNCTIONS ---
const getDB = (): DB => {
  if (!existsSync(DATA_PATH)) return { templatePenilaian: [] };
  const file = readFileSync(DATA_PATH, "utf-8");
  return file ? JSON.parse(file) : { templatePenilaian: [] };
};

const saveDB = (data: DB) => {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
};

// Cek apakah dua rentang tanggal bertabrakan
// Logika: (StartA <= EndB) dan (EndA >= StartB)
const isOverlapping = (startA: string, endA: string, startB: string, endB: string) => {
  const sA = new Date(startA).getTime();
  const eA = new Date(endA).getTime();
  const sB = new Date(startB).getTime();
  const eB = new Date(endB).getTime();
  return sA <= eB && eA >= sB;
};

// Cek apakah template SEDANG berjalan hari ini
const isActiveNow = (start: string, end: string) => {
  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  e.setHours(23, 59, 59, 999); // Akhir hari
  return now >= s && now <= e;
};

// --- GET (Ambil Data) ---
export async function GET() {
  try {
    const data = getDB();
    
    // Urutkan berdasarkan tanggal mulai terbaru (Descending)
    const sorted = data.templatePenilaian.sort((a, b) => {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });

    return NextResponse.json(sorted);
  } catch (error) {
    return NextResponse.json({ error: "Database Error" }, { status: 500 });
  }
}

// --- POST (Buat Jadwal Baru) ---
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { namaTemplate, startDate, endDate, poinPenilaian } = body;

    // 1. Validasi Input
    if (!namaTemplate || !startDate || !endDate || !poinPenilaian) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NextResponse.json({ error: "Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai" }, { status: 400 });
    }

    const data = getDB();

    // 2. CONSTRAINT: Cek Tabrakan Jadwal
    // Loop semua template yang ada, pastikan tanggal baru tidak overlap
    for (const tpl of data.templatePenilaian) {
      if (isOverlapping(startDate, endDate, tpl.startDate, tpl.endDate)) {
        return NextResponse.json({ 
          error: `Jadwal bertabrakan dengan "${tpl.namaTemplate}" (${tpl.startDate} s/d ${tpl.endDate}). Silakan pilih tanggal lain.` 
        }, { status: 400 });
      }
    }

    // 3. Simpan
    const newId = `TPL-${Date.now()}`;
    const newTemplate: Template = { 
        id: newId, 
        namaTemplate, 
        startDate, 
        endDate, 
        poinPenilaian 
    };
    
    data.templatePenilaian.unshift(newTemplate);
    saveDB(data);

    return NextResponse.json(newTemplate);
  } catch (error) {
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}

// --- PUT (Edit Jadwal) ---
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, namaTemplate, startDate, endDate, poinPenilaian } = body;

    const data = getDB();
    const index = data.templatePenilaian.findIndex((t) => t.id === id);

    if (index === -1) return NextResponse.json({ error: "Template tidak ditemukan" }, { status: 404 });

    const existingTemplate = data.templatePenilaian[index];

    // PROTEKSI 1: Cek apakah template SEDANG BERJALAN (Active)
    // Jika hari ini berada dalam range tanggal template yang mau diedit, TOLAK.
    if (isActiveNow(existingTemplate.startDate, existingTemplate.endDate)) {
        return NextResponse.json({ 
            error: "DILARANG: Template ini SEDANG AKTIF digunakan. Anda tidak dapat mengubah data saat batch sedang berjalan demi integritas data." 
        }, { status: 403 });
    }

    // Validasi Tanggal Dasar
    if (new Date(startDate) > new Date(endDate)) {
        return NextResponse.json({ error: "Tanggal Mulai tidak boleh lebih besar dari Tanggal Selesai" }, { status: 400 });
    }

    // PROTEKSI 2: Cek Tabrakan Jadwal (Kecuali dengan dirinya sendiri)
    for (const tpl of data.templatePenilaian) {
        if (tpl.id === id) continue; // Skip diri sendiri

        if (isOverlapping(startDate, endDate, tpl.startDate, tpl.endDate)) {
            return NextResponse.json({ 
                error: `Konflik Jadwal: Tanggal baru bertabrakan dengan "${tpl.namaTemplate}". Harap atur tanggal di luar periode template lain.` 
            }, { status: 400 });
        }
    }

    // Update Data
    data.templatePenilaian[index] = { 
        ...existingTemplate, 
        namaTemplate, 
        startDate, 
        endDate, 
        poinPenilaian 
    };

    saveDB(data);
    return NextResponse.json(data.templatePenilaian[index]);
  } catch (error) {
    return NextResponse.json({ error: "Gagal update data" }, { status: 500 });
  }
}

// --- DELETE (Hapus) ---
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const data = getDB();
    const index = data.templatePenilaian.findIndex((t) => t.id === id);

    if (index === -1) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });
    
    const target = data.templatePenilaian[index];

    // PROTEKSI: Jangan hapus jika sedang aktif
    if (isActiveNow(target.startDate, target.endDate)) {
      return NextResponse.json({ 
          error: "GAGAL: Template SEDANG AKTIF berjalan. Tidak dapat dihapus sampai periode berakhir." 
      }, { status: 403 });
    }

    data.templatePenilaian.splice(index, 1);
    saveDB(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Gagal menghapus data" }, { status: 500 });
  }
}