"use client";

import { useState, useMemo, useEffect } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Filter,
  X,            // Icon Close
  FileText,     // Icon Label
  ChevronLeft,  // Icon <
  ChevronRight, // Icon >
  FileWarning,  // Icon Error
  Loader2       // Icon Loading
} from "lucide-react";
import db from "@/data/db.json"; 
import { showLuxuryToast } from "@/lib/luxuryToast";

// --- KONFIGURASI SWEETALERT ---
const MySwal = withReactContent(Swal);
const swalConfig = {
  heightAuto: false, 
  customClass: {
    popup: "rounded-none font-sans",
    input: "rounded-none border-stone-light focus:ring-0 focus:border-primary",
  },
};

// --- TIPE DATA ---
type Mahasiswa = typeof db.calonMahasiswa[0];

// --- KONFIGURASI DOKUMEN ---
const DOCUMENT_RULES = [
  { key: "rapot", label: "Rapor", type: "wajib" },
  { key: "kemampuanBahasaInggris", label: "Bhs. Inggris", type: "wajib" },
  { key: "paspor", label: "Paspor", type: "wajib" },
  { key: "motivationLetter", label: "Motivation Letter", type: "wajib_beasiswa" },
  { key: "suratRekomendasi", label: "Surat Rekomendasi", type: "wajib_beasiswa" },
  { key: "sertifikatPrestasi", label: "Sert. Prestasi", type: "opsional" },
  { key: "sertifikatKompetensi", label: "Sert. Kompetensi", type: "opsional" },
];

export default function Adm02Page() {
  const [candidates, setCandidates] = useState<Mahasiswa[]>(db.calonMahasiswa);

  // State Filter & Pagination
  const [filterStatus, setFilterStatus] = useState("belum");
  const [filterProdi, setFilterProdi] = useState("");
  const [filterJalur, setFilterJalur] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // --- STATE PREVIEW SIDEBAR ---
  const [previewState, setPreviewState] = useState<{
    isOpen: boolean;
    docs: { url: string; label: string; type: string }[];
    currentIndex: number;
    candidateName: string;
  } | null>(null);

  // State untuk Validasi File (Loading / Error)
  const [isFileValid, setIsFileValid] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // --- GENERATE OPTIONS UNTUK FILTER (DYNAMIC) ---
  const prodiOptions = useMemo(() => {
      const prodis = new Set(candidates.map(c => c.prodiPilihan).filter(Boolean));
      return Array.from(prodis).sort();
  }, [candidates]);

  const jalurOptions = useMemo(() => {
      const jalurs = new Set(candidates.map(c => c.jalurPendaftaran).filter(Boolean));
      return Array.from(jalurs).sort();
  }, [candidates]);

  // --- EFEK: CEK KETERSEDIAAN FILE SAAT GANTI SLIDE ---
  useEffect(() => {
    if (previewState && previewState.isOpen) {
        const currentDoc = previewState.docs[previewState.currentIndex];
        
        // Reset state
        setIsLoadingFile(true);
        setIsFileValid(true);

        // Cek URL (Head Request)
        fetch(currentDoc.url, { method: "HEAD" })
            .then((res) => {
                if (res.ok) {
                    setIsFileValid(true);
                } else {
                    setIsFileValid(false);
                }
            })
            .catch(() => {
                setIsFileValid(false);
            })
            .finally(() => {
                setTimeout(() => setIsLoadingFile(false), 500);
            });
    }
  }, [previewState?.currentIndex, previewState?.candidateName]);

  // --- LOGIC CEK KELENGKAPAN ---
  const checkCompleteness = (mhs: Mahasiswa) => {
    // @ts-ignore
    const berkas = mhs.berkas || {};
    const requiredRules = DOCUMENT_RULES.filter(
      (r) =>
        r.type === "wajib" ||
        (r.type === "wajib_beasiswa" && mhs.jalurPendaftaran === "Beasiswa")
    );
    // @ts-ignore
    const missing = requiredRules.filter((r) => !berkas[r.key]);
    const optionalCount = DOCUMENT_RULES.filter(
      // @ts-ignore
      (r) => r.type === "opsional" && berkas[r.key]
    ).length;

    return {
      isLengkap: missing.length === 0,
      missingLabels: missing.map((r) => r.label),
      optionalCount,
    };
  };

  // --- FILTERING & MAPPING DATA ---
  const processedData = useMemo(() => {
    let mapped = candidates.map((c) => {
      const check = checkCompleteness(c);
      return {
        ...c,
        _isComplete: check.isLengkap,
        _optionalFileCount: check.optionalCount,
        _checkResult: check 
      };
    });

    let filtered = mapped.filter((c) => {
      // Filter Status
      if (filterStatus === "belum" && c.statusBerkas !== "Menunggu Pemeriksaan") return false;
      if (filterStatus === "sudah" && c.statusBerkas === "Menunggu Pemeriksaan") return false;
      
      // Filter Prodi & Jalur (Fix: sekarang variabel ini dihubungkan ke UI)
      if (filterProdi && c.prodiPilihan !== filterProdi) return false;
      if (filterJalur && c.jalurPendaftaran !== filterJalur) return false;
      
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          c.namaLengkap.toLowerCase().includes(q) ||
          c.negaraAsal.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      }
      return true;
    });

    return filtered.sort((a, b) => {
      // @ts-ignore
      if (a._isComplete !== b._isComplete) return b._isComplete - a._isComplete;
      // @ts-ignore
      if (a._optionalFileCount !== b._optionalFileCount) return b._optionalFileCount - a._optionalFileCount;
      return a.namaLengkap.localeCompare(b.namaLengkap);
    });
  }, [candidates, filterStatus, filterProdi, filterJalur, searchQuery]);

  const totalPages = Math.ceil(processedData.length / perPage);
  const paginatedData = processedData.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage
  );

  // --- ACTION HANDLERS ---
  const updateLocalState = (id: string, decision: "Lolos" | "Ditolak") => {
    setCandidates((prev) => 
      prev.map((c) => {
        if (c.id !== id) return c;
        const isLolos = decision === "Lolos";
        return {
            ...c,
            statusBerkas: isLolos ? "Lengkap" : "Ditolak",
            statusAkhir: isLolos ? "Proses Seleksi" : "Ditolak",
            tanggalVerifikasi: new Date().toISOString(),
            tahapanSeleksi: {
                ...c.tahapanSeleksi,
                seleksiBerkas: {
                    ...c.tahapanSeleksi.seleksiBerkas,
                    status: isLolos ? "Lolos" : "Gagal"
                }
            }
        };
      })
    );
  };

  const handleDecision = async (id: string, decision: "Lolos" | "Ditolak", name: string) => {
    const isLolos = decision === "Lolos";
    const result = await MySwal.fire({
      ...swalConfig,
      title: <div className="font-serif text-2xl text-charcoal">Konfirmasi Tindakan</div>,
      text: `Ubah status ${name} menjadi "${isLolos ? "Lolos" : "Ditolak"}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Lanjutkan",
      cancelButtonText: "Batal",
      confirmButtonColor: isLolos ? "#2F5D40" : "#8B0000",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch("/api/calonMahasiswa", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, decision }),
        });
        if (!res.ok) throw new Error("Gagal");
        updateLocalState(id, decision);
        showLuxuryToast({ type: "success", title: "Status berhasil disimpan." });
      } catch (error) {
        showLuxuryToast({ type: "error", title: "Gagal update data." });
      }
    }
  };

  const handleBulkAction = async (decision: "Lolos" | "Ditolak") => {
    if (selectedIds.length === 0) return showLuxuryToast({ type: "info", title: "Pilih data dulu." });
    const isLolos = decision === "Lolos";
    const result = await MySwal.fire({
      ...swalConfig,
      title: "Konfirmasi Massal",
      text: `Proses ${selectedIds.length} data terpilih?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Proses",
      cancelButtonColor: "#1C1C1A",
      confirmButtonColor: "#6F0B0B",
    });

    if (result.isConfirmed) {
      for (const id of selectedIds) {
        const c = candidates.find(x => x.id === id);
        if (c && c.statusBerkas === "Menunggu Pemeriksaan") {
            const check = checkCompleteness(c);
            if(isLolos && !check.isLengkap) continue; 
            
            try {
                await fetch("/api/calonMahasiswa", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id, decision }),
                });
                updateLocalState(id, decision);
            } catch(e) {}
        }
      }
      setSelectedIds([]);
      showLuxuryToast({ type: "success", title: "Proses massal selesai." });
    }
  };

  const handleFeedback = async (id: string, name: string) => {
    const { value: comment } = await MySwal.fire({
      ...swalConfig,
      title: "Kirim Catatan",
      input: "textarea",
      inputPlaceholder: "Isi catatan...",
      showCancelButton: true,
      confirmButtonText: "Kirim",
      confirmButtonColor: "#1C1C1A",
    });
    if (comment) showLuxuryToast({ type: "success", title: "Catatan terkirim." });
  };

  // --- LOGIC PREVIEW FIX ---
  const openPreview = (candidate: Mahasiswa, targetKey: string) => {
      const mappedDocs = DOCUMENT_RULES.map(rule => ({
            key: rule.key, 
            label: rule.label,
            // @ts-ignore
            url: candidate.berkas?.[rule.key],
            // @ts-ignore
            type: candidate.berkas?.[rule.key]?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
      }));

      const availableDocs = mappedDocs.filter(d => d.url && d.url.trim() !== "");
      const targetDoc = availableDocs.find(d => d.key === targetKey);
      
      if (!targetDoc) return; 

      const index = availableDocs.indexOf(targetDoc);

      setPreviewState({
          isOpen: true,
          docs: availableDocs, 
          currentIndex: index, 
          candidateName: candidate.namaLengkap
      });
  };

  const closePreview = () => setPreviewState(null);
  
  const nextDoc = () => {
    if (previewState && previewState.currentIndex < previewState.docs.length - 1) {
        setPreviewState({ ...previewState, currentIndex: previewState.currentIndex + 1 });
    }
  };

  const prevDoc = () => {
    if (previewState && previewState.currentIndex > 0) {
        setPreviewState({ ...previewState, currentIndex: previewState.currentIndex - 1 });
    }
  };

  // --- RENDER HELPERS ---
  const renderDocItem = (mhs: Mahasiswa, rule: any) => {
    // @ts-ignore
    const docPath = mhs.berkas?.[rule.key];
    const isPresent = docPath && docPath.trim() !== "";

    return (
      <div key={rule.key} className={`flex items-center gap-2 ${isPresent ? "text-success" : "text-danger"}`}>
        {isPresent ? <CheckCircle2 className="w-3.5 h-3.5 text-success" /> : <XCircle className="w-3.5 h-3.5 text-danger" />}
        {isPresent ? (
          <button
            onClick={() => openPreview(mhs, rule.key)}
            className="hover:underline hover:text-primary transition-colors font-medium text-left outline-none focus:outline-none"
          >
            {rule.label}
          </button>
        ) : (
          <span className="font-medium text-stone/50 italic cursor-not-allowed">{rule.label} (Nihil)</span>
        )}
      </div>
    );
  };

  const renderRequiredDocs = (mhs: Mahasiswa) => {
    const rules = DOCUMENT_RULES.filter(r => r.type === "wajib" || (r.type === "wajib_beasiswa" && mhs.jalurPendaftaran === "Beasiswa"));
    return <div className="flex flex-col gap-2 text-[10px] font-sans">{rules.map(r => renderDocItem(mhs, r))}</div>;
  };

  const renderOptionalDocs = (mhs: Mahasiswa) => {
    const rules = DOCUMENT_RULES.filter(r => r.type === "opsional");
    return <div className="flex flex-col gap-2 text-[10px] font-sans">{rules.map(r => renderDocItem(mhs, r))}</div>;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-white font-sans text-charcoal">
      
      {/* LEFT PANE */}
      <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${previewState?.isOpen ? 'w-1/2 border-r border-stone-light' : 'w-full'}`}>
          <div className="px-10 py-8 border-b border-stone-light bg-bg-white shrink-0">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-serif text-charcoal mb-2">Verifikasi Berkas</h1>
                <p className="text-[10px] font-sans text-stone uppercase tracking-widest">Tinjau kelengkapan berkas kandidat.</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-sans text-stone uppercase tracking-widest mb-1">Total Kandidat</p>
                <p className="text-2xl font-serif text-primary">{processedData.length}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll px-10 py-8">
            <div className="flex flex-wrap gap-6 mb-8 items-end">
              
              {/* FILTER STATUS */}
              <div className="w-48">
                <label className="block text-[9px] uppercase tracking-widest text-stone mb-2">Filter Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="clean-input w-full text-xs font-medium cursor-pointer border-b border-stone-light pb-2 focus:outline-none focus:border-primary">
                  <option value="belum">Belum Diverifikasi</option>
                  <option value="sudah">Sudah Diverifikasi</option>
                  <option value="semua">Tampilkan Semua</option>
                </select>
              </div>

              {/* FILTER PRODI (NEW) */}
              <div className="w-48">
                <label className="block text-[9px] uppercase tracking-widest text-stone mb-2">Filter Prodi</label>
                <select value={filterProdi} onChange={(e) => setFilterProdi(e.target.value)} className="clean-input w-full text-xs font-medium cursor-pointer border-b border-stone-light pb-2 focus:outline-none focus:border-primary">
                  <option value="">Semua Program Studi</option>
                  {prodiOptions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* FILTER JALUR (NEW) */}
              <div className="w-48">
                <label className="block text-[9px] uppercase tracking-widest text-stone mb-2">Filter Jalur</label>
                <select value={filterJalur} onChange={(e) => setFilterJalur(e.target.value)} className="clean-input w-full text-xs font-medium cursor-pointer border-b border-stone-light pb-2 focus:outline-none focus:border-primary">
                  <option value="">Semua Jalur</option>
                  {jalurOptions.map(j => (
                    <option key={j} value={j}>{j}</option>
                  ))}
                </select>
              </div>

              {/* SEARCH BOX */}
               <div className="flex-1 min-w-[200px]">
                <label className="block text-[9px] uppercase tracking-widest text-stone mb-2">Cari</label>
                <input type="search" placeholder="Nama, Negara, atau Email..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="clean-input w-full text-xs border-b border-stone-light pb-2 focus:outline-none focus:border-primary"/>
              </div>
            </div>

            <div className="flex justify-between items-center mb-6 pt-4 border-t border-stone-light/50">
              <div className="flex items-center gap-2 text-xs font-sans text-stone">
                <Filter className="w-4 h-4" /> <span>{paginatedData.length} Data</span>
              </div>
              <div className="flex gap-4">
                <button onClick={() => handleBulkAction("Lolos")} className="bg-success text-white px-6 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-[#254a33] transition">Loloskan Terpilih</button>
                <button onClick={() => handleBulkAction("Ditolak")} className="bg-danger text-white px-6 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest hover:bg-[#6b0000] transition">Tolak Terpilih</button>
              </div>
            </div>

            <div className="border border-stone-light overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-bg-subtle border-b border-stone-light sticky top-0 z-10">
                  <tr>
                    <th className="p-4 w-12 text-center border-r border-stone-light bg-bg-subtle">
                      <input type="checkbox" className="accent-primary cursor-pointer rounded-none" onChange={(e) => e.target.checked ? setSelectedIds(paginatedData.map((c) => c.id)) : setSelectedIds([])} checked={selectedIds.length > 0 && selectedIds.length === paginatedData.length}/>
                    </th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest border-r border-stone-light bg-bg-subtle">Nama & Prodi</th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest border-r border-stone-light bg-bg-subtle">Jalur</th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest border-r border-stone-light bg-bg-subtle">Berkas Wajib</th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest border-r border-stone-light bg-bg-subtle">Berkas Tambahan</th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest border-r border-stone-light bg-bg-subtle text-center">Status</th>
                    <th className="p-4 text-[9px] font-bold text-stone uppercase tracking-widest text-center bg-bg-subtle">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-light bg-white">
                  {paginatedData.length === 0 ? <tr><td colSpan={7} className="p-12 text-center italic text-stone">Kosong.</td></tr> : paginatedData.map((mhs) => {
                      const check = mhs._checkResult;
                      return (
                        <tr key={mhs.id} className="hover:bg-bg-subtle transition-colors group bg-white align-top">
                          <td className="p-4 text-center border-r border-stone-light">
                            <input type="checkbox" className="accent-primary cursor-pointer rounded-none" checked={selectedIds.includes(mhs.id)} onChange={() => setSelectedIds(p => p.includes(mhs.id) ? p.filter(x => x !== mhs.id) : [...p, mhs.id])}/>
                          </td>
                          <td className="p-4 border-r border-stone-light">
                            <div className="font-serif text-lg text-primary leading-tight mb-1 font-medium">{mhs.namaLengkap}</div>
                            <div className="text-[10px] font-sans text-stone uppercase tracking-wider">{mhs.prodiPilihan}</div>
                          </td>
                          <td className="p-4 border-r border-stone-light">
                            <div className="text-[13px] font-bold capitalize text-primary font-serif">{mhs.jalurPendaftaran}</div>
                            <div className="text-[11px] text-stone font-sans mt-0.5">{mhs.negaraAsal}</div>
                          </td>
                          <td className="p-4 border-r border-stone-light">{renderRequiredDocs(mhs)}</td>
                          <td className="p-4 border-r border-stone-light">{renderOptionalDocs(mhs)}</td>
                          <td className="p-4 border-r border-stone-light text-center align-top">
                             <div className={`font-bold uppercase tracking-widest text-[10px] mb-2 ${mhs.statusBerkas === "Lengkap" || check.isLengkap ? "text-success" : "text-danger"}`}>
                                 {mhs.statusBerkas === "Lengkap" ? "LOLOS" : mhs.statusBerkas === "Ditolak" ? "GAGAL" : check.isLengkap ? "LENGKAP" : "KURANG"}
                             </div>
                             <button onClick={() => handleFeedback(mhs.id, mhs.namaLengkap)} className="inline-flex items-center gap-1 text-[9px] font-bold uppercase text-stone hover:text-charcoal border border-transparent hover:border-stone-light px-2 py-1"><MessageSquare className="w-3 h-3"/> Catatan</button>
                          </td>
                          
                          <td className="p-4 text-center w-40">
                            {mhs.statusBerkas === "Menunggu Pemeriksaan" ? (
                              <div className="flex flex-col gap-2 items-center justify-center mx-auto w-full">
                                <button onClick={() => handleDecision(mhs.id, "Lolos", mhs.namaLengkap)} disabled={!check.isLengkap} className={`w-24 px-3 py-1 text-[10px] font-bold uppercase text-white rounded-none ${check.isLengkap ? "bg-success hover:bg-[#254a33]" : "bg-gray-300 cursor-not-allowed"}`}>Loloskan</button>
                                <button onClick={() => handleDecision(mhs.id, "Ditolak", mhs.namaLengkap)} className="w-24 px-3 py-1 text-[10px] font-bold uppercase text-white bg-danger hover:bg-[#6b0000] rounded-none">Tolak</button>
                              </div>
                            ) : (
                                <div className={`w-24 py-2 mx-auto text-white text-[10px] font-bold uppercase text-center rounded-none ${mhs.statusBerkas === "Lengkap" ? "bg-success" : "bg-danger"}`}>
                                    {mhs.statusBerkas === "Lengkap" ? "SELESAI" : "DITOLAK"}
                                </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            <div className="py-6 flex justify-between items-center text-xs font-sans text-stone">
                <div className="flex items-center gap-4">
                    <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="hover:text-primary disabled:opacity-30 font-bold uppercase bg-gray-100 px-3 py-1 rounded-none">Prev</button>
                    <span>Hal {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages} className="hover:text-primary disabled:opacity-30 font-bold uppercase bg-gray-100 px-3 py-1 rounded-none">Next</button>
                </div>
            </div>
          </div>
      </div>

      {/* RIGHT PANE: PREVIEW SIDEBAR */}
      {previewState && previewState.isOpen && (
          <div className="w-1/2 bg-[#1A1A1A] border-l border-stone-light flex flex-col animate-in slide-in-from-right duration-300 z-30 shadow-2xl relative">
              
              {/* Header Preview */}
              <div className="h-14 bg-[#000] border-b border-[#333] flex items-center justify-between px-4 shrink-0">
                  <div className="flex flex-col justify-center min-w-0 flex-1 mr-4">
                      <span className="text-[10px] text-[#666] uppercase tracking-wider truncate">
                         {previewState.candidateName}
                      </span>
                      <div className="flex items-center gap-2 text-white font-bold uppercase tracking-widest text-xs truncate">
                          <FileText className="w-3.5 h-3.5 text-[#888]" />
                          <span>{previewState.docs[previewState.currentIndex].label}</span>
                          <span className="text-[#444] font-mono text-[10px] ml-2">
                             {previewState.currentIndex + 1}/{previewState.docs.length}
                          </span>
                      </div>
                  </div>

                  <div className="flex items-center gap-1">
                      <button 
                          onClick={prevDoc} 
                          disabled={previewState.currentIndex === 0}
                          className="p-2 text-white hover:bg-white/10 disabled:opacity-20 rounded transition-colors"
                      >
                          <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button 
                          onClick={nextDoc} 
                          disabled={previewState.currentIndex === previewState.docs.length - 1}
                          className="p-2 text-white hover:bg-white/10 disabled:opacity-20 rounded transition-colors"
                      >
                          <ChevronRight className="w-5 h-5" />
                      </button>

                      <div className="w-px h-6 bg-[#333] mx-2"></div>

                      <button 
                          onClick={closePreview} 
                          className="p-2 text-[#888] hover:text-red-500 hover:bg-white/10 transition-all rounded-full"
                      >
                          <X className="w-5 h-5" />
                      </button>
                  </div>
              </div>

              {/* Content Preview */}
              <div className="flex-1 bg-[#222] relative overflow-hidden flex items-center justify-center">
                  
                  {/* Kondisi 1: Loading */}
                  {isLoadingFile && (
                      <div className="flex flex-col items-center gap-3 animate-pulse">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <span className="text-stone text-xs uppercase tracking-widest">Memuat dokumen...</span>
                      </div>
                  )}

                  {/* Kondisi 2: Error / File Tidak Ada (404) */}
                  {!isLoadingFile && !isFileValid && (
                      <div className="flex flex-col items-center gap-4 text-center p-10">
                          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                              <FileWarning className="w-8 h-8 text-danger" />
                          </div>
                          <div>
                              <h3 className="text-white font-serif text-xl mb-1">Dokumen Tidak Ditemukan</h3>
                              <p className="text-[#666] text-xs font-sans max-w-xs mx-auto">
                                  File fisik untuk <strong>{previewState.docs[previewState.currentIndex].label}</strong> tidak tersedia di server atau tautan rusak.
                              </p>
                          </div>
                          <div className="text-[10px] text-[#444] font-mono border border-[#333] px-3 py-1 rounded">
                              ERR_FILE_NOT_FOUND (404)
                          </div>
                      </div>
                  )}

                  {/* Kondisi 3: Sukses Tampil */}
                  {!isLoadingFile && isFileValid && (
                      previewState.docs[previewState.currentIndex].type === 'pdf' ? (
                          <iframe 
                              key={previewState.docs[previewState.currentIndex].url}
                              src={`${previewState.docs[previewState.currentIndex].url}#toolbar=0&navpanes=0`} 
                              className="w-full h-full border-none bg-white"
                              title="Preview Dokumen"
                          />
                      ) : (
                          <div className="w-full h-full overflow-auto flex items-center justify-center p-8">
                              <img 
                                  src={previewState.docs[previewState.currentIndex].url} 
                                  className="max-w-full shadow-2xl border-4 border-white" 
                                  alt="Preview Dokumen" 
                                  onError={() => setIsFileValid(false)} 
                              />
                          </div>
                      )
                  )}

              </div>
          </div>
      )}

    </div>
  );
}