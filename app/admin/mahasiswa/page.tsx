// app/admin/mahasiswa/page.tsx
import db from '@/data/db.json';
import Link from 'next/link';

export default function MahasiswaPage() {
  const students = db.calonMahasiswa;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Data Calon Mahasiswa</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm">
          + Tambah Manual
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 text-gray-600 text-sm">
              <th className="p-4">Nama Lengkap</th>
              <th className="p-4">Negara</th>
              <th className="p-4">Prodi Pilihan</th>
              <th className="p-4">Status Berkas</th>
              <th className="p-4">Status Akhir</th>
              <th className="p-4">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {students.map((mhs) => (
              <tr key={mhs.id} className="border-b hover:bg-gray-50">
                <td className="p-4 flex items-center gap-3">
                  <img 
                    src={mhs.foto} 
                    alt={mhs.namaLengkap} 
                    className="w-10 h-10 rounded-full object-cover bg-gray-200"
                  />
                  <span className="font-medium">{mhs.namaLengkap}</span>
                </td>
                <td className="p-4">{mhs.negaraAsal}</td>
                <td className="p-4">{mhs.prodiPilihan}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs ${
                    mhs.statusBerkas === 'Lengkap' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {mhs.statusBerkas}
                  </span>
                </td>
                <td className="p-4 font-semibold">{mhs.statusAkhir}</td>
                <td className="p-4">
                  <Link 
                    href={`/admin/mahasiswa/${mhs.id}`} 
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Detail
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}