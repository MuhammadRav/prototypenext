import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";

const DATA_PATH = join(process.cwd(), "data", "db.json");

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validasi Body
    if (!body.calonMahasiswaId || !body.skorTotalWawancara || !body.jawaban) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const data = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
    
    // Cek apakah sudah dinilai sebelumnya (Double Submit Protection)
    const exists = data.hasilPenilaianWawancara.find(
      (r: any) => r.calonMahasiswaId === body.calonMahasiswaId
    );

    if (exists) {
      return NextResponse.json({ error: "Kandidat ini sudah dinilai." }, { status: 400 });
    }

    const newResult = {
      id: `RES-${Date.now()}`,
      ...body,
      tanggalPenilaian: new Date().toISOString()
    };

    // Simpan ke DB
    data.hasilPenilaianWawancara.push(newResult);
    
    // Update Status Akhir Mahasiswa jadi "Proses Seleksi" (Menandakan selesai wawancara)
    // Atau bisa jadi "Wawancara Selesai" tergantung flow, tapi biasanya tetap "Proses Seleksi" sampai Admin Finalisasi
    const mhsIndex = data.calonMahasiswa.findIndex((c:any) => c.id === body.calonMahasiswaId);
    if (mhsIndex !== -1) {
        // Update status tahapan wawancara
        if (data.calonMahasiswa[mhsIndex].tahapanSeleksi?.wawancara) {
            data.calonMahasiswa[mhsIndex].tahapanSeleksi.wawancara.status = "Selesai";
            data.calonMahasiswa[mhsIndex].tahapanSeleksi.wawancara.hasilId = newResult.id;
        }
    }

    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, data: newResult });

  } catch (error) {
    console.error("Error saving interview result:", error);
    return NextResponse.json({ error: "Gagal menyimpan data" }, { status: 500 });
  }
}