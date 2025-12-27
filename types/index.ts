// types/index.ts

export interface CalonMahasiswa {
  id: string;
  namaLengkap: string;
  email: string;
  jenisKelamin: string;
  foto: string;
  negaraAsal: string;
  prodiPilihan: string;
  statusBerkas: string;
  statusAkhir: string;
  tahapanSeleksi: {
    seleksiBerkas: { status: string; catatan: string | null };
    tesPengetahuan: { status: string; nilai: number | null };
    wawancara: { status: string; hasilId: string | null };
  };
}

export interface JadwalWawancara {
  id: string;
  prodi: string;
  pewawancara: string;
  waktu: string;
  linkZoom: string;
  pesertaIds: string[];
}

export interface Statistik {
  total: number;
  diterima: number;
  ditolak: number;
  perProdi: Record<string, number>;
}