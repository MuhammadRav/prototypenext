"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Mail,
  Info,
  MessageSquare 
} from "lucide-react";
import db from "@/data/db.json";
import { showLuxuryToast } from "@/lib/luxuryToast";

const MySwal = withReactContent(Swal);

// --- KONFIGURASI MODAL DEAD CENTER (LUXURY) ---
const swalCenterConfig = {
  target: 'body', 
  position: 'center' as const,
  heightAuto: false,
  backdrop: true,
  customClass: {
    container: "flex items-center justify-center w-screen h-screen fixed inset-0 z-[9999] !p-0 !m-0", 
    popup: "rounded-none font-sans p-8 shadow-2xl border border-[#E5E5E5] m-auto bg-white",
    confirmButton: "rounded-none font-bold uppercase tracking-wider text-xs px-6 py-3",
    cancelButton: "rounded-none font-bold uppercase tracking-wider text-xs px-6 py-3",
    closeButton: "text-[#8D8D8C] hover:text-[#1C1C1A] focus:outline-none"
  },
  buttonsStyling: true
};

// --- 1. LOGIC UTILS ---
const getScoreColor = (score: number | null | undefined) => {
  if (score === null || score === undefined) return "text-[#8D8D8C]";
  if (score >= 90) return "text-[#1E3A8A]"; // Navy
  if (score >= 80) return "text-[#2F5D40]"; // Green
  if (score >= 70) return "text-[#B45309]"; // Gold
  if (score >= 60) return "text-[#EA580C]"; // Orange
  return "text-[#6F0B0B]"; // Red
};

const getPredikatColor = (predikat: string | null) => {
  if (!predikat) return "text-[#8D8D8C]";
  const p = predikat.toLowerCase();
  
  if (p === "sangat direkomendasikan") return "text-[#1E3A8A] font-bold";
  if (p === "direkomendasikan") return "text-[#2F5D40] font-bold";
  if (p === "dipertimbangkan") return "text-[#B45309] font-bold";
  if (p === "tidak direkomendasikan") return "text-[#EA580C] font-bold";
  if (p.includes("sangat tidak")) return "text-[#6F0B0B] font-bold";
  
  return "text-[#8D8D8C]";
};

// --- 2. BUSINESS LOGIC (ADAPTIF) ---
const generateFinalPredicate = (mhs: any) => {
  // Jika di data hasil wawancara sudah ada rekomendasiPredikat, pakai itu dulu
  if (mhs.hasilWawancara?.rekomendasiPredikat) {
      return mhs.hasilWawancara.rekomendasiPredikat;
  }

  const tesScore = mhs.tahapanSeleksi?.tesPengetahuan?.nilai;
  
  const calculate = (s1: number, s2?: number) => {
    let score = 0;
    if (!s1 || s1 === 0) {
        score = s2 !== undefined ? s2 : 0;
    } else {
        score = s2 !== undefined ? (s1 + s2) / 2 : s1;
    }

    if (score >= 90) return "Sangat Direkomendasikan";
    if (score >= 80) return "Direkomendasikan";
    if (score >= 70) return "Dipertimbangkan";
    if (score >= 60) return "Tidak Direkomendasikan";
    return "Sangat Tidak Direkomendasikan";
  };

  if (mhs.jalurPendaftaran === "Beasiswa") {
    const interviewScore = mhs.hasilWawancara?.skorTotalWawancara;
    if (typeof interviewScore !== "number") return null;
    return calculate(tesScore, interviewScore);
  } else {
    if (typeof tesScore !== "number") return null;
    return calculate(tesScore);
  }
};

export default function Adm06Page() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<"Beasiswa" | "Mandiri">("Beasiswa");
  const [filterProdi, setFilterProdi] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef<HTMLDivElement>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10); 

  // --- 3. LOAD DATA ---
  useEffect(() => {
    // Pastikan kita mengambil array hasilPenilaianWawancara dari db
    const interviewResults = (db as any).hasilPenilaianWawancara || [];

    const rawData = db.calonMahasiswa
      .filter((c: any) => c.statusBerkas === "Lengkap") 
      .map((c: any) => {
        // Cari hasil wawancara berdasarkan ID Calon Mahasiswa (String vs String comparison)
        const interviewResult = interviewResults.find(
            (r: any) => r.calonMahasiswaId === c.id
        );
        return {
          ...c,
          hasilWawancara: interviewResult || null,
        };
      });

    setCandidates(rawData);
    setTemplates((db as any).templatePenilaian || []);

    const handleClickOutside = (event: MouseEvent) => {
      if (legendRef.current && !legendRef.current.contains(event.target as Node)) {
        setShowLegend(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- 4. FILTER & SORT ---
  const filteredData = useMemo(() => {
    let result = candidates.filter((c) => {
      if (c.jalurPendaftaran !== activeTab) return false;
      if (filterProdi && c.prodiPilihan !== filterProdi) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.namaLengkap.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return result.sort((a, b) => {
      const pendingA = a.statusAkhir === "Proses Seleksi";
      const pendingB = b.statusAkhir === "Proses Seleksi";
      if (pendingA && !pendingB) return -1;
      if (!pendingA && pendingB) return 1;
      return a.namaLengkap.localeCompare(b.namaLengkap);
    });
  }, [candidates, activeTab, filterProdi, searchQuery]);

  const prodiOptions = useMemo(() => {
      const prodis = new Set(candidates.map(c => c.prodiPilihan).filter(Boolean));
      return Array.from(prodis).sort();
  }, [candidates]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / perPage));
  const paginatedData = filteredData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // --- 5. ACTION LOGIC ---
  const getActionState = (mhs: any) => {
    if (mhs.statusAkhir === "Diterima" || mhs.statusAkhir === "Ditolak")
      return { disabled: true, reason: "Keputusan Final" };

    if (mhs.jalurPendaftaran === "Beasiswa") {
      const hasInterviewScore = typeof mhs.hasilWawancara?.skorTotalWawancara === "number";
      if (!hasInterviewScore)
        return { disabled: true, reason: "Menunggu Wawancara" }; 
    } 
    else {
      const hasTestScore = typeof mhs.tahapanSeleksi?.tesPengetahuan?.nilai === "number";
      if (!hasTestScore)
        return { disabled: true, reason: "Menunggu Tes" };
    }

    return { disabled: false, reason: "" };
  };

  // --- 6. POPUPS (DECISION, TRANSCRIPT, & NOTES) ---
  
  // A. Popup Keputusan (Terima/Tolak)
  const handleDecision = async (id: string, keputusan: string, mhsName: string, prodi: string) => {
    const isAccepting = keputusan === "Diterima";
    const defaultMessage = isAccepting
      ? `Selamat! Berdasarkan hasil seleksi menyeluruh, kami dengan senang hati menyatakan Anda DITERIMA di program studi ${prodi}, Universitas Bakti Nagara.`
      : `Terima kasih atas partisipasi Anda. Berdasarkan hasil seleksi yang ketat, kami mohon maaf belum dapat menerima Anda saat ini. Tetap semangat!`;

    const result = await MySwal.fire({
      ...swalCenterConfig,
      title: (
        <div className="flex items-center gap-3 text-left">
            <div className={`p-3 rounded-full ${isAccepting ? "bg-green-50" : "bg-red-50"}`}>
                {isAccepting ? <Check className="w-6 h-6 text-[#2F5D40]" /> : <X className="w-6 h-6 text-[#6F0B0B]" />}
            </div>
            <div className="font-serif text-2xl text-[#1C1C1A]">Konfirmasi Keputusan</div>
        </div>
      ),
      html: (
        <div className="text-left font-sans mt-4">
          <p className="mb-4 text-sm text-[#8D8D8C]">
            Anda akan menetapkan status <span className={`font-bold ${isAccepting ? "text-[#2F5D40]" : "text-[#6F0B0B]"}`}>{keputusan.toUpperCase()}</span> untuk <strong className="text-[#1C1C1A]">{mhsName}</strong>.
            <br/>Sistem akan mengirimkan notifikasi berikut ke email mahasiswa:
          </p>
          <div className="relative">
            <Mail className="absolute top-3 left-3 w-4 h-4 text-[#8D8D8C]" />
            <textarea 
                id="swal-notif" 
                className="w-full border border-[#E5E5E5] p-3 pl-10 text-sm h-28 bg-[#FAFAFA] focus:border-[#6F0B0B] outline-none font-medium text-[#1C1C1A] resize-none"
                defaultValue={defaultMessage}
            ></textarea>
          </div>
        </div>
      ),
      showCancelButton: true,
      confirmButtonText: "Konfirmasi & Kirim",
      cancelButtonText: "Batal",
      confirmButtonColor: isAccepting ? "#2F5D40" : "#6F0B0B",
      cancelButtonColor: "#8D8D8C",
      preConfirm: () => {
        return (document.getElementById("swal-notif") as HTMLTextAreaElement).value;
      },
    });

    if (result.isConfirmed) {
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? { ...c, statusAkhir: keputusan } : c))
      );
      showLuxuryToast({
        type: "success",
        title: "Keputusan Disimpan",
        message: "Notifikasi telah dikirim ke mahasiswa."
      });
    }
  };

  // B. Popup Transkrip Wawancara (Detail Poin)
  const showInterviewDetails = (mhs: any) => {
    if (!mhs.hasilWawancara) return;
    const result = mhs.hasilWawancara;
    
    // Fallback mencari template
    let template = templates.find((t: any) => t.id === result.templatePenilaianId);
    if (!template && (db as any).templatePenilaian) {
         template = (db as any).templatePenilaian.find((t: any) => t.id === result.templatePenilaianId);
    }

    if (!template) {
        return showLuxuryToast({ type: "error", title: "Template penilaian tidak ditemukan" });
    }

    const htmlContent = `
      <div class="space-y-6 text-left max-h-[60vh] overflow-y-auto pr-4 custom-scroll font-sans">
        ${template.poinPenilaian.map((poin: any, idx: number) => {
            const ans = result.jawaban?.find((j: any) => j.poinId === poin.poinId);
            return `
            <div class="pb-6 border-b border-[#E5E5E5] last:border-0">
              <div class="flex justify-between items-start mb-3 gap-4">
                <div class="flex gap-3">
                   <span class="text-[#8D8D8C] font-sans text-sm font-bold pt-0.5">0${idx + 1}</span>
                   <p class="font-serif text-[#1C1C1A] text-lg leading-snug">${poin.pertanyaan}</p>
                </div>
                <div class="text-right shrink-0">
                    <span class="font-serif text-2xl font-bold text-[#1C1C1A]">${ans?.skor || 0}</span>
                    <p class="text-[9px] uppercase tracking-widest text-[#8D8D8C] font-medium mt-1">POIN</p>
                </div>
              </div>
              <div class="bg-[#FAFAFA] p-4 text-sm text-[#4A4A48] border-l-2 border-[#E5E5E5] italic leading-relaxed ml-8">
                "${ans?.jawaban || "Tidak ada catatan jawaban."}"
              </div>
            </div>`;
          }).join("")}
      </div>
    `;

    MySwal.fire({
      ...swalCenterConfig,
      title: (
        <div className="font-serif text-3xl text-[#1C1C1A] border-b border-[#E5E5E5] pb-6 mb-6 text-left">
            Transkrip Wawancara
        </div>
      ),
      html: htmlContent,
      width: "800px",
      showConfirmButton: false,
      showCloseButton: true,
    });
  };

  // C. Popup Catatan Pewawancara (BARU)
  const showNoteDetails = (mhsName: string, catatan: string) => {
    MySwal.fire({
      ...swalCenterConfig,
      title: (
        <div className="flex items-center gap-3 text-left border-b border-[#E5E5E5] pb-4 w-full">
            <MessageSquare className="w-6 h-6 text-[#1C1C1A]" />
            <div className="font-serif text-2xl text-[#1C1C1A]">Catatan Pewawancara</div>
        </div>
      ),
      html: (
        <div className="text-left mt-4 w-full">
          <p className="text-xs font-bold text-[#8D8D8C] uppercase tracking-widest mb-2">
            Kandidat: <span className="text-[#1C1C1A]">{mhsName}</span>
          </p>
          <div className="bg-[#FAFAFA] p-6 border-l-4 border-[#6F0B0B] text-base text-[#1C1C1A] leading-relaxed italic font-serif shadow-sm">
            "{catatan || "Tidak ada catatan khusus yang ditinggalkan."}"
          </div>
        </div>
      ),
      width: "500px",
      showConfirmButton: false,
      showCloseButton: true,
    });
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* HEADER */}
      <div className="bg-white border-b border-[#E5E5E5] px-10 py-8 sticky top-0 z-20">
        <div className="flex justify-between items-end">
            <div>
                <h1 className="text-3xl font-serif text-[#1C1C1A] mb-2">Input Keputusan Akhir</h1>
                <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
                Finalisasi Penerimaan Mahasiswa Baru
                </p>
            </div>
            <div className="flex gap-8">
                {(["Beasiswa", "Mandiri"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setCurrentPage(1); }}
                        className={`text-[10px] font-bold uppercase tracking-widest pb-2 border-b-2 transition-all ${
                            activeTab === tab ? "border-[#6F0B0B] text-[#6F0B0B]" : "border-transparent text-[#8D8D8C] hover:text-[#1C1C1A]"
                        }`}
                    >
                        Jalur {tab}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="px-10 py-10 max-w-full">
        {/* FILTER BAR */}
        <div className="mb-8 flex flex-col md:flex-row gap-8 justify-between items-end border-b border-[#E5E5E5] pb-6">
          <div className="flex gap-8 w-full md:w-auto">
            <div className="w-full md:w-64">
              <label className="text-[9px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2.5">Filter Prodi</label>
              <select 
                value={filterProdi} 
                onChange={(e) => setFilterProdi(e.target.value)} 
                className="clean-input w-full text-xs font-medium cursor-pointer border-b border-[#E5E5E5] bg-transparent focus:outline-none focus:border-[#6F0B0B] transition-colors pb-2"
              >
                <option value="">Semua Program Studi</option>
                {prodiOptions.map((p: string) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="w-full md:w-64">
              <label className="text-[9px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2.5">Cari Kandidat</label>
              <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nama kandidat..."
                  className="clean-input w-full text-xs font-medium border-b border-[#E5E5E5] bg-transparent focus:outline-none focus:border-[#6F0B0B] transition-colors pb-2"
              />
            </div>
          </div>
        </div>

        {/* MAIN TABLE */}
        <div className="border border-[#E5E5E5] overflow-visible">
          <table className="w-full text-left border-collapse table-fixed relative">
            <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] sticky top-0 z-10">
              <tr>
                <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[25%]">Profil Kandidat</th>
                <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[15%]">Prodi</th>
                
                {/* --- HEADER SKOR & CATATAN --- */}
                <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[22%] text-center relative group">
                    <div className="flex items-center justify-center gap-2">
                        SKOR & CATATAN
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowLegend(!showLegend); }} 
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                        >
                            <Info className="w-3.5 h-3.5 text-[#1C1C1A]" />
                        </button>
                    </div>

                    {/* LEGEND POPUP */}
                    {showLegend && (
                        <div 
                            ref={legendRef}
                            className="absolute top-12 left-1/2 -translate-x-1/2 w-72 bg-white shadow-2xl border border-[#E5E5E5] p-5 z-[50] rounded-sm text-left animate-in fade-in zoom-in-95 duration-200"
                        >
                            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-t border-l border-[#E5E5E5] transform rotate-45"></div>
                            <h4 className="font-serif text-[#1C1C1A] text-sm mb-3 border-b border-[#E5E5E5] pb-2">Indikator Skor</h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#1E3A8A]"></div><div className="text-[10px] text-[#555]"><span className="font-bold text-[#1C1C1A]">≥ 90</span> : Sangat Direkomendasikan</div></div>
                                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#2F5D40]"></div><div className="text-[10px] text-[#555]"><span className="font-bold text-[#1C1C1A]">80-89</span> : Direkomendasikan</div></div>
                                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#B45309]"></div><div className="text-[10px] text-[#555]"><span className="font-bold text-[#1C1C1A]">70-79</span> : Dipertimbangkan</div></div>
                                <div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-[#6F0B0B]"></div><div className="text-[10px] text-[#555]"><span className="font-bold text-[#1C1C1A]">&lt; 60</span> : Sangat Tidak</div></div>
                            </div>
                        </div>
                    )}
                </th>

                <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5] w-[23%] text-center">Rekomendasi Sistem</th>
                <th className="p-5 text-[8px] font-bold text-[#8D8D8C] uppercase tracking-widest text-center w-[15%]">Keputusan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-[#8D8D8C] italic font-serif text-sm">
                    Tidak ada kandidat menunggu keputusan di jalur ini.
                  </td>
                </tr>
              ) : (
                paginatedData.map((mhs) => {
                  const actionState = getActionState(mhs);
                  const predikat = generateFinalPredicate(mhs);
                  const tesVal = mhs.tahapanSeleksi?.tesPengetahuan?.nilai;
                  const wawancaraVal = mhs.hasilWawancara?.skorTotalWawancara;
                  
                  // FIX: Prioritaskan 'catatanPewawancara' sesuai data JSON user
                  const catatanPewawancara = 
                    mhs.hasilWawancara?.catatanPewawancara || 
                    mhs.hasilWawancara?.catatan || 
                    mhs.hasilWawancara?.kesimpulan;

                  return (
                    <tr key={mhs.id} className="hover:bg-[#FAFAFA] transition-colors group">
                      
                      {/* 1. PROFIL */}
                      <td className="p-5 border-r border-[#E5E5E5] align-middle">
                        <div className="flex gap-4 items-center">
                          <img src={mhs.foto || "/placeholder.png"} className="w-10 h-10 object-cover border border-[#E5E5E5] shrink-0" alt="Foto" />
                          <div className="min-w-0">
                            <div className="font-serif text-lg text-[#6F0B0B] leading-none truncate mb-1">
                                {mhs.namaLengkap}
                            </div>
                            <div className="text-[10px] text-[#8D8D8C] font-sans uppercase tracking-wider">
                                {mhs.negaraAsal}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. PRODI */}
                      <td className="p-5 border-r border-[#E5E5E5] align-middle">
                         <span className="text-[10px] font-bold text-[#1C1C1A] font-sans block truncate">
                            {mhs.prodiPilihan}
                         </span>
                      </td>

                      {/* 3. SKOR & CATATAN */}
                      <td className="p-4 border-r border-[#E5E5E5] align-middle">
                        <div className="flex flex-col gap-3">
                            
                            {/* Row Atas: Skor Angka */}
                            <div className="flex justify-center items-center gap-0">
                                <div className="flex-1 text-center px-1">
                                    <span className={`block font-serif text-xl mb-1 ${getScoreColor(tesVal)}`}>{tesVal ?? "-"}</span>
                                    <span className="text-[7px] text-[#8D8D8C] uppercase tracking-widest">Tes Tulis</span>
                                </div>
                                <div className="w-px h-8 bg-[#E5E5E5]"></div>
                                <div className="flex-1 text-center px-1">
                                    {activeTab === "Beasiswa" ? (
                                        <>
                                            <span className={`block font-serif text-xl mb-1 ${getScoreColor(wawancaraVal)}`}>{wawancaraVal ?? "-"}</span>
                                            {wawancaraVal !== undefined && (
                                                <button onClick={() => showInterviewDetails(mhs)} className="text-[7px] text-[#6F0B0B] hover:underline uppercase tracking-widest font-bold">
                                                    TRANSKRIP
                                                </button>
                                            )}
                                            {wawancaraVal === undefined && <span className="text-[7px] text-[#8D8D8C] uppercase tracking-widest">Interview</span>}
                                        </>
                                    ) : (
                                        <span className="text-xl text-[#E5E5E5]">—</span>
                                    )}
                                </div>
                            </div>

                            {/* Row Bawah: Preview Catatan (Perbaikan) */}
                            {activeTab === "Beasiswa" && (
                                <div 
                                    onClick={() => catatanPewawancara && showNoteDetails(mhs.namaLengkap, catatanPewawancara)}
                                    className={`group/note relative p-2 border border-[#E5E5E5] bg-[#FCFCFC] transition-all ${
                                        catatanPewawancara ? "cursor-pointer hover:border-[#6F0B0B] hover:bg-white hover:shadow-sm" : "opacity-60 cursor-default"
                                    }`}
                                >
                                    <div className="flex gap-2 items-start">
                                        <MessageSquare className={`w-3 h-3 mt-0.5 shrink-0 transition-colors ${catatanPewawancara ? "text-[#8D8D8C] group-hover/note:text-[#6F0B0B]" : "text-[#E5E5E5]"}`} />
                                        <p className="text-[9px] text-[#555] italic leading-tight line-clamp-2 text-left font-serif">
                                            {catatanPewawancara 
                                                ? `"${catatanPewawancara}"` 
                                                : "Belum ada catatan."}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                      </td>

                      {/* 4. REKOMENDASI SISTEM */}
                      <td className="p-5 border-r border-[#E5E5E5] text-center align-middle">
                         <div className={`text-[10px] uppercase tracking-wide ${getPredikatColor(predikat)}`}>
                            {predikat || "Menunggu Data"}
                         </div>
                      </td>

                      {/* 5. KEPUTUSAN */}
                      <td className="p-5 text-center align-middle">
                        {mhs.statusAkhir === "Proses Seleksi" || mhs.statusAkhir === "Wawancara Terjadwal" ? (
                             mhs.statusAkhir === "Proses Seleksi" ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDecision(mhs.id, "Diterima", mhs.namaLengkap, mhs.prodiPilihan)}
                                            disabled={actionState.disabled}
                                            className={`w-8 h-8 flex items-center justify-center border transition-all ${
                                                actionState.disabled 
                                                ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#D4D4D4] cursor-not-allowed" 
                                                : "bg-white border-[#2F5D40] text-[#2F5D40] hover:bg-[#2F5D40] hover:text-white shadow-sm"
                                            }`}
                                            title="Terima"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>

                                        <button
                                            onClick={() => handleDecision(mhs.id, "Ditolak", mhs.namaLengkap, mhs.prodiPilihan)}
                                            disabled={actionState.disabled}
                                            className={`w-8 h-8 flex items-center justify-center border transition-all ${
                                                actionState.disabled 
                                                ? "bg-[#F5F5F5] border-[#E5E5E5] text-[#D4D4D4] cursor-not-allowed" 
                                                : "bg-white border-[#6F0B0B] text-[#6F0B0B] hover:bg-[#6F0B0B] hover:text-white shadow-sm"
                                            }`}
                                            title="Tolak"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {actionState.disabled && (
                                        <span className="text-[8px] text-[#6F0B0B] flex items-center gap-1">
                                            <AlertTriangle className="w-2 h-2" /> {actionState.reason}
                                        </span>
                                    )}
                                </div>
                             ) : (
                                <span className="text-[9px] text-[#8D8D8C] uppercase tracking-wider italic">Menunggu Proses</span>
                             )
                        ) : (
                            <div className="flex justify-center">
                                <span className={`w-28 py-2 text-[9px] font-bold uppercase tracking-widest border transition-all shadow-sm flex items-center justify-center ${
                                    mhs.statusAkhir === "Diterima" ? "bg-[#2F5D40] text-white border-[#2F5D40]" : "bg-[#6F0B0B] text-white border-[#6F0B0B]"
                                }`}>
                                    {mhs.statusAkhir}
                                </span>
                            </div>
                        )}
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
      </div>
    </div>
  );
}