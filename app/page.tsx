// app/page.tsx
import db from '@/data/db.json';
import { CalonMahasiswa } from '@/types';

// Fungsi helper untuk menghitung statistik
function getStats() {
  const users = db.calonMahasiswa as CalonMahasiswa[];
  
  return {
    total: users.length,
    diterima: users.filter(u => u.statusAkhir === 'Diterima').length,
    ditolak: users.filter(u => u.statusAkhir === 'Ditolak').length,
    diproses: users.filter(u => u.statusAkhir === 'Proses Seleksi').length,
  };
}

export default function Dashboard() {
  const stats = getStats();
  const notifTerbaru = db.notifications.slice(0, 3); // Ambil 3 notif teratas

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Dashboard PMB Internasional</h1>
      
      {/* KARTU STATISTIK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard label="Total Pendaftar" value={stats.total} color="bg-blue-500" />
        <StatCard label="Diterima" value={stats.diterima} color="bg-green-500" />
        <StatCard label="Ditolak" value={stats.ditolak} color="bg-red-500" />
        <StatCard label="Sedang Proses" value={stats.diproses} color="bg-yellow-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BAGIAN JADWAL WAWANCARA */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Jadwal Wawancara Terdekat</h2>
          <div className="space-y-4">
            {db.jadwalWawancara.slice(0, 3).map((jadwal: any) => (
              <div key={jadwal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-800">{jadwal.prodi}</p>
                  <p className="text-sm text-gray-500">{new Date(jadwal.waktu).toLocaleString()}</p>
                  <p className="text-xs text-gray-400">Pewawancara: {jadwal.pewawancara}</p>
                </div>
                <a href={jadwal.linkZoom} target="_blank" className="text-blue-600 text-sm hover:underline">
                  Link Zoom
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* BAGIAN NOTIFIKASI SYSTEM */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold mb-4 text-gray-700">Log Notifikasi Terakhir</h2>
          <div className="space-y-3">
            {notifTerbaru.map((notif: any) => (
              <div key={notif.id} className={`p-3 rounded border-l-4 ${notif.pesan.includes('Ditolak') ? 'border-red-400 bg-red-50' : 'border-blue-400 bg-blue-50'}`}>
                <p className="text-sm text-gray-700">{notif.pesan}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(notif.timestamp).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Komponen Kecil untuk Card
function StatCard({ label, value, color }: { label: string, value: number, color: string }) {
  return (
    <div className={`${color} text-white p-6 rounded-xl shadow-lg`}>
      <h3 className="text-sm opacity-80 font-medium uppercase">{label}</h3>
      <p className="text-4xl font-bold mt-2">{value}</p>
    </div>
  );
}