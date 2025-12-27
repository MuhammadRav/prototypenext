"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic"; 
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  User,
  MapPin,
  Mail,
  Phone,
  CreditCard,
  Download
} from "lucide-react";
import db from "@/data/db.json";
import { showLuxuryToast } from "@/lib/luxuryToast";

// --- IMPORT TOMBOL PDF SECARA DYNAMIC ---
const PdfDownloadButton = dynamic(
  () => import("@/components/PdfDownloadButton"), 
  { 
    ssr: false,
    loading: () => (
      <button className="flex items-center gap-2 bg-[#F5F5F5] text-[#8D8D8C] px-6 py-3 text-[10px] font-bold uppercase tracking-widest cursor-wait border border-[#E5E5E5]">
        <Download className="w-4 h-4 animate-bounce" />
        <span>Memuat PDF...</span>
      </button>
    )
  }
);

const MySwal = withReactContent(Swal);

// --- HELPER FUNCTIONS ---
const getScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "text-[#8D8D8C]";
  if (score >= 90) return "text-[#1E3A8A]";
  if (score >= 80) return "text-[#2F5D40]";
  if (score >= 70) return "text-[#B45309]";
  if (score >= 60) return "text-[#EA580C]";
  return "text-[#6F0B0B]";
};

const getPredikatColor = (predikat: string | null) => {
  if (!predikat) return "text-[#8D8D8C]";
  const p = predikat.toLowerCase();
  
  if (p.includes("sangat direkomendasikan")) return "text-[#1E3A8A] font-bold";
  if (p.includes("tidak") && p.includes("sangat")) return "text-[#6F0B0B] font-bold";
  if (p.includes("tidak")) return "text-[#EA580C] font-bold";
  if (p.includes("direkomendasikan")) return "text-[#2F5D40] font-bold";
  if (p.includes("dipertimbangkan")) return "text-[#B45309] font-bold";
  
  return "text-[#8D8D8C]";
};

const calculateAge = (dob: string) => {
  if (!dob) return "-";
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return isNaN(age) ? "-" : age;
};

const formatFileName = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

export default function RekapMahasiswaPage() {
  // --- STATE ---
  const [candidates, setCandidates] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);

  // --- LOAD DATA ---
  useEffect(() => {
    const enrichedCandidates = db.calonMahasiswa
      .filter((c: any) => c.jalurPendaftaran === "Beasiswa" && c.statusBerkas === "Lengkap")
      .map((c: any) => ({
        ...c,
        hasilWawancara:
          db.hasilPenilaianWawancara.find(
            (r: any) => r.calonMahasiswaId === c.id
          ) || null,
      }));

    setCandidates(enrichedCandidates);
    setSchedules(db.jadwalWawancara);
    setTemplates(db.templatePenilaian);
  }, []);

  // --- SORT DATA (Tanpa Filter) ---
  const sortedData = useMemo(() => {
    // Hanya melakukan sorting berdasarkan ID, tidak ada filtering status/prodi
    return [...candidates].sort((a, b) =>
      a.id.localeCompare(b.id, undefined, { numeric: true })
    );
  }, [candidates]);

  // --- STATISTICS ---
  const summary = useMemo(() => {
    const total = sortedData.length;
    const gender = sortedData.reduce(
      (acc, c) => {
        c.jenisKelamin === "Pria" ? acc.p++ : acc.w++;
        return acc;
      },
      { p: 0, w: 0 }
    );

    const countries = sortedData.reduce((acc: any, c) => {
      acc[c.negaraAsal] = (acc[c.negaraAsal] || 0) + 1;
      return acc;
    }, {});

    const topCountries = Object.entries(countries)
      .sort((a: any, b: any) => b[1] - a[1])
      .slice(0, 3)
      .map(([n, c]) => `${n} (${c})`)
      .join(", ");

    return { total, gender, topCountries: topCountries || "-" };
  }, [sortedData]);

  // --- PAGINATION ---
  const totalPages = Math.max(1, Math.ceil(sortedData.length / perPage));
  const paginatedData = sortedData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // --- MODAL HANDLERS ---
  const handleShowDetailInterview = (mhs: any) => {
    const result = mhs.hasilWawancara;
    const template = templates.find(
      (t: any) => t.id === result.templatePenilaianId
    );

    if (!template)
      return showLuxuryToast({ type: "error", title: "Template tidak ditemukan" });

    const htmlContent = `
      <div class="space-y-6 text-left max-h-[60vh] overflow-y-auto pr-4 text-sm font-sans custom-scroll">
        ${template.poinPenilaian
          .map((poin: any, idx: number) => {
            const ans = result.jawaban.find(
              (j: any) => j.poinId === poin.poinId
            );
            return `
            <div class="pb-6 border-b border-[#E5E5E5] last:border-0">
              <div class="flex justify-between items-start mb-3 gap-4">
                <p class="font-serif text-[#1C1C1A] text-lg leading-snug w-3/4"><span class="text-[#6F0B0B] mr-2 text-sm font-sans">0${idx + 1}.</span> ${poin.pertanyaan}</p>
                <div class="flex flex-col items-end">
                   <span class="font-serif font-bold text-[#6F0B0B] text-2xl">${ans?.skor || 0}</span>
                   <span class="text-[9px] uppercase tracking-widest text-[#8D8D8C]">Skor</span>
                </div>
              </div>
              <div class="bg-[#FAFAFA] p-4 text-[#4A4A48] text-sm italic border-l-2 border-[#E5E5E5] leading-relaxed">"${ans?.jawaban || "-"}"</div>
            </div>`;
          })
          .join("")}
      </div>
    `;

    MySwal.fire({
      title: <div className="font-serif text-3xl text-[#1C1C1A] pb-4 border-b border-[#E5E5E5] mb-4 text-left">Detail Penilaian</div>,
      html: htmlContent,
      width: "800px",
      showCloseButton: true,
      showConfirmButton: false,
      customClass: { popup: "rounded-none font-sans p-10" },
    });
  };

  const renderScheduleInfo = (mhs: any) => {
    if (!mhs.jadwalWawancaraId) return <span className="text-[#8D8D8C] italic text-[10px]">Belum Dijadwalkan</span>;
    const sch = schedules.find((s) => s.id === mhs.jadwalWawancaraId);
    if (!sch) return <span className="text-danger text-[10px]">Jadwal Error</span>;
    return (
      <div className="text-[10px] font-sans space-y-1">
        <div className="font-serif text-[#6F0B0B] text-sm">
          {new Date(sch.waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", hourCycle: 'h23' })}
        </div>
        <div className="text-[#8D8D8C] tracking-wide capitalize">
          Oleh: <span className="font-medium text-[#1C1C1A]">{sch.pewawancara}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20 relative">
      
        {/* --- STICKY HEADER --- */}
        <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E5E5] px-10 py-6 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] transition-all">
            <div className="flex justify-between items-end gap-8">
                <div className="flex-1">
                    <h1 className="text-3xl font-serif text-[#1C1C1A] mb-1">Rekapitulasi Penerimaan</h1>
                    <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
                        Laporan Seleksi Beasiswa • <span className="text-[#6F0B0B] font-bold">{sortedData.length} Kandidat</span>
                    </p>
                </div>
                
                {/* TOMBOL PDF - Filter di-hardcode 'semua' agar judul PDF tetap benar */}
                <div className="shrink-0">
                    <PdfDownloadButton 
                        data={sortedData}
                        filterProdi="semua"
                        filterStatus="semua"
                    />
                </div>
            </div>
        </div>

        <div className="px-10 py-10 max-w-full">
            
            {/* --- FILTER SECTION REMOVED --- */}

            {/* SUMMARY STATS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="border border-[#E5E5E5] p-6 hover:border-[#6F0B0B] transition-colors bg-[#FAFAFA]">
                    <p className="text-[9px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest mb-3">Total Kandidat</p>
                    <p className="text-4xl font-serif text-[#1C1C1A]">{summary.total}</p>
                </div>
                <div className="border border-[#E5E5E5] p-6 col-span-1 md:col-span-2 hover:border-[#6F0B0B] transition-colors bg-white">
                    <p className="text-[9px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest mb-3">Distribusi Gender</p>
                    <p className="font-serif text-xl text-[#1C1C1A]">
                    Pria: <span className="text-[#6F0B0B] font-bold mx-1">{summary.gender.p}</span>
                    <span className="text-[#E5E5E5] mx-4">|</span>
                    Wanita: <span className="text-[#6F0B0B] font-bold mx-1">{summary.gender.w}</span>
                    </p>
                </div>
                <div className="border border-[#E5E5E5] p-6 hover:border-[#6F0B0B] transition-colors bg-[#FAFAFA]">
                    <p className="text-[9px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest mb-3">Dominasi Negara</p>
                    <p className="font-sans text-xs text-[#1C1C1A] leading-relaxed font-medium">{summary.topCountries}</p>
                </div>
            </div>

            {/* TABLE */}
            <div className="border border-[#E5E5E5] overflow-auto">
            <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] sticky top-0 z-10">
                <tr>
                    <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[30%] whitespace-nowrap">Profil Kandidat</th>
                    <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[15%] whitespace-nowrap">Prodi</th>
                    <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[20%] whitespace-nowrap">Jadwal Interview</th>
                    <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[20%] whitespace-nowrap text-left pl-6">Hasil Seleksi</th>
                    <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest text-center w-[15%] whitespace-nowrap">Status Akhir</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5]">
                {paginatedData.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-[#8D8D8C] italic font-serif text-sm">Belum ada data kandidat.</td></tr>
                ) : (
                    paginatedData.map((mhs) => {
                    const tesScore = mhs.tahapanSeleksi?.tesPengetahuan?.nilai;
                    const wawancaraScore = mhs.hasilWawancara?.skorTotalWawancara;
                    const predikat = mhs.hasilWawancara?.rekomendasiPredikat;

                    return (
                        <tr key={mhs.id} className="hover:bg-[#FAFAFA] transition-colors group">
                        {/* KOLOM 1: PROFIL */}
                        <td className="p-5 border-r border-[#E5E5E5]">
                            <button onClick={() => setSelectedCandidate(mhs)} className="flex gap-4 items-start w-full hover:opacity-80 transition-opacity text-left">
                            <img src={mhs.foto || "/placeholder.png"} className="w-12 h-12 object-cover border border-[#E5E5E5] shrink-0" alt="Foto" />
                            <div className="flex-1 min-w-0 flex flex-col justify-between h-12 py-0.5">
                                <div className="font-serif text-lg text-[#1C1C1A] group-hover:text-[#6F0B0B] transition-colors leading-none truncate">
                                    {mhs.namaLengkap}
                                </div>
                                <div className="text-[10px] text-[#8D8D8C] font-sans uppercase tracking-wider mt-1">
                                    {mhs.negaraAsal} • {mhs.jenisKelamin}
                                </div>
                            </div>
                            </button>
                        </td>

                        {/* KOLOM 2: PRODI */}
                        <td className="p-5 border-r border-[#E5E5E5] align-middle">
                            <span className="text-[10px] font-bold text-[#1C1C1A] font-sans block truncate">
                                {mhs.prodiPilihan}
                            </span>
                        </td>

                        {/* KOLOM 3: JADWAL */}
                        <td className="p-5 border-r border-[#E5E5E5]">{renderScheduleInfo(mhs)}</td>
                        
                        {/* KOLOM 4: HASIL SELEKSI */}
                        <td className="p-5 border-r border-[#E5E5E5] align-top pl-6">
                            <div className="space-y-1 text-[10px] font-sans whitespace-nowrap w-full">
                            <div className="flex justify-between items-center"><span className="text-[#8D8D8C]">Tes Tulis:</span> <span className={`font-bold ${getScoreColor(tesScore)}`}>{tesScore ?? "-"}</span></div>
                            <div className="flex justify-between items-center"><span className="text-[#8D8D8C]">Wawancara:</span> <span className={`font-bold ${getScoreColor(wawancaraScore)}`}>{wawancaraScore ?? "-"}</span></div>
                            <div className="pt-2 mt-2 text-left border-t border-[#E5E5E5]">
                                <span className={`text-[8px] uppercase tracking-wide block py-1 ${getPredikatColor(predikat)}`}>{predikat || "-"}</span>
                            </div>
                            </div>
                        </td>

                        {/* KOLOM 5: STATUS AKHIR */}
                        <td className="p-5 text-center align-middle">
                            <div className="flex justify-center">
                                <span className={`w-32 py-2 text-[9px] font-bold uppercase tracking-widest border transition-all shadow-sm flex items-center justify-center ${
                                    mhs.statusAkhir === "Diterima" ? "bg-success text-white border-success hover:bg-[#1B5E20]" :
                                    mhs.statusAkhir === "Ditolak" ? "bg-danger text-white border-danger hover:bg-[#8B0D0D]" :
                                    "bg-[#E5E5E5] text-[#8D8D8C] border-[#E5E5E5]"
                                }`}>
                                {mhs.statusAkhir || "BELUM ADA"}
                                </span>
                            </div>
                        </td>
                        </tr>
                    );
                    })
                )}
                </tbody>
            </table>

            {/* PAGINATION */}
            <div className="p-5 border-t border-[#E5E5E5] bg-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="p-2 hover:bg-[#FAFAFA] disabled:opacity-30 transition-colors rounded-none border border-transparent hover:border-[#E5E5E5]"><ChevronLeft className="w-4 h-4 text-[#1C1C1A]" /></button>
                <span className="text-xs text-[#8D8D8C] font-sans tracking-wide">Halaman <span className="font-bold text-[#1C1C1A]">{currentPage}</span> dari {totalPages}</span>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="p-2 hover:bg-[#FAFAFA] disabled:opacity-30 transition-colors rounded-none border border-transparent hover:border-[#E5E5E5]"><ChevronRight className="w-4 h-4 text-[#1C1C1A]" /></button>
                </div>
                <div className="text-xs text-[#8D8D8C] font-sans flex items-center gap-3">
                Tampilkan:
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setCurrentPage(1); }} className="border-b border-[#E5E5E5] pb-0.5 text-xs bg-white cursor-pointer hover:border-[#6F0B0B] transition-colors outline-none font-medium text-[#1C1C1A]">
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                </select>
                </div>
            </div>
            </div>

            {/* MODAL DETAIL (POPOVER) */}
            {selectedCandidate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1C1C1A]/80 backdrop-blur-sm">
                <div className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col shadow-2xl rounded-none">
                    
                    {/* MODAL HEADER */}
                    <div className="p-8 border-b border-[#E5E5E5] bg-white sticky top-0 z-10">
                    <div className="flex justify-between items-start mb-6">
                        <h2 className="text-3xl font-serif text-[#1C1C1A]">Detail Kandidat</h2>
                        <button onClick={() => setSelectedCandidate(null)} className="text-[#8D8D8C] hover:text-[#1C1C1A] transition-colors"><X className="w-6 h-6" /></button>
                    </div>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-start">
                        <img src={selectedCandidate.foto || "/placeholder.png"} className="w-24 h-32 object-cover border border-[#E5E5E5] shadow-sm shrink-0" alt="Foto" />
                        
                        <div className="flex-1 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-4xl font-serif text-[#1C1C1A] mb-2">{selectedCandidate.namaLengkap}</h3>
                                    <div className="flex gap-4 text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest mb-4">
                                        <span className="font-bold text-[#1C1C1A]">{selectedCandidate.prodiPilihan}</span>
                                        <span className="text-[#E5E5E5]">|</span>
                                        <span>{selectedCandidate.negaraAsal}</span>
                                        <span className="text-[#E5E5E5]">|</span>
                                        <span>{calculateAge(selectedCandidate.tanggalLahir)} Tahun</span>
                                    </div>
                                </div>
                                <div className={`px-6 py-3 text-sm font-bold uppercase tracking-widest border ${
                                    selectedCandidate.statusAkhir === "Diterima" ? "bg-success text-white border-success" :
                                    selectedCandidate.statusAkhir === "Ditolak" ? "bg-danger text-white border-danger" :
                                    "bg-[#F5F5F5] text-[#8D8D8C] border-[#E5E5E5]"
                                }`}>
                                    {selectedCandidate.statusAkhir}
                                </div>
                            </div>
                        </div>
                    </div>
                    </div>

                    <div className="p-8 space-y-8">
                        {/* PERFORMANCE METRICS */}
                        <div>
                            <h4 className="font-serif text-lg text-[#1C1C1A] mb-4 pb-2 border-b border-[#E5E5E5]">Hasil Penilaian</h4>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                                <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] text-center">
                                    <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-1">Tes Tulis</p>
                                    <p className={`font-serif text-3xl ${getScoreColor(selectedCandidate.tahapanSeleksi?.tesPengetahuan?.nilai)}`}>
                                        {selectedCandidate.tahapanSeleksi?.tesPengetahuan?.nilai ?? "-"}
                                    </p>
                                </div>
                                <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] text-center">
                                    <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-1">Wawancara</p>
                                    <p className={`font-serif text-3xl ${getScoreColor(selectedCandidate.hasilWawancara?.skorTotalWawancara)}`}>
                                        {selectedCandidate.hasilWawancara?.skorTotalWawancara ?? "-"}
                                    </p>
                                </div>
                                <div className="p-4 bg-[#FAFAFA] border border-[#E5E5E5] text-center col-span-2 flex flex-col justify-center items-center">
                                    <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-2">Rekomendasi Pewawancara</p>
                                    <p className={`text-sm ${getPredikatColor(selectedCandidate.hasilWawancara?.rekomendasiPredikat)}`}>
                                        {selectedCandidate.hasilWawancara?.rekomendasiPredikat || "-"}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-[#FAFAFA] border border-[#E5E5E5] p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex-1">
                                    <strong className="text-gray-500 block text-[10px] uppercase tracking-wider mb-1">Catatan Pewawancara:</strong>
                                    <em className="text-gray-700 text-sm">"{selectedCandidate.hasilWawancara?.catatanPewawancara || 'Tidak ada catatan khusus.'}"</em>
                                </div>
                                {selectedCandidate.hasilWawancara && (
                                    <button onClick={() => handleShowDetailInterview(selectedCandidate)} className="whitespace-nowrap px-6 py-3 bg-[#1C1C1A] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#6F0B0B] transition-colors">
                                        Lihat Detail Jawaban
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* EVIDENCE */}
                        <div>
                            <h4 className="font-serif text-lg text-[#1C1C1A] mb-4 pb-2 border-b border-[#E5E5E5]">Berkas Lampiran</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {Object.entries(selectedCandidate.berkas || {}).map(([key, value]) => (
                                    value ? (
                                        <a key={key} href={value as string} target="_blank" className="flex flex-col items-center justify-center p-4 border border-[#E5E5E5] hover:border-[#6F0B0B] hover:bg-[#FAFAFA] transition-all group text-center gap-2">
                                            <FileText className="w-6 h-6 text-[#8D8D8C] group-hover:text-[#6F0B0B]" />
                                            <span className="text-[10px] font-bold uppercase text-[#1C1C1A] group-hover:text-[#6F0B0B]">{formatFileName(key)}</span>
                                        </a>
                                    ) : null
                                ))}
                            </div>
                        </div>

                        {/* INFO */}
                        <div className="bg-[#F9F9F9] p-6 border-t border-[#E5E5E5]">
                            <h4 className="font-serif text-lg text-[#1C1C1A] mb-4">Data Administratif & Wali</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-xs font-sans text-[#1C1C1A]">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#8D8D8C] uppercase tracking-widest text-[9px] font-bold mb-1">Kontak Pribadi</div>
                                    <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-[#8D8D8C]"/> {selectedCandidate.email}</div>
                                    <div className="flex items-center gap-2"><CreditCard className="w-3 h-3 text-[#8D8D8C]"/> {selectedCandidate.profilLengkap?.noPassport || "-"}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#8D8D8C]"/> {selectedCandidate.profilLengkap?.noWhatsapp || "-"}</div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#8D8D8C] uppercase tracking-widest text-[9px] font-bold mb-1">Orang Tua / Wali</div>
                                    <div className="flex items-center gap-2"><User className="w-3 h-3 text-[#8D8D8C]"/> {selectedCandidate.profilLengkap?.orangTua?.nama || "-"}</div>
                                    <div className="ml-5 text-[#8D8D8C] italic">{selectedCandidate.profilLengkap?.orangTua?.pekerjaan || "-"}</div>
                                    <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-[#8D8D8C]"/> {selectedCandidate.profilLengkap?.orangTua?.noTelp || "-"}</div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 text-[#8D8D8C] uppercase tracking-widest text-[9px] font-bold mb-1">Domisili</div>
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-3 h-3 text-[#8D8D8C] mt-0.5"/> 
                                        <span className="leading-relaxed">{selectedCandidate.profilLengkap?.orangTua?.alamat || "-"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            )}
        </div>
    </div>
  );
}