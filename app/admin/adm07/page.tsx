"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { 
  Trash2, Plus, X, AlertTriangle, 
  Calendar, Clock, Lock, CheckCircle2, FileEdit 
} from "lucide-react";
import { showLuxuryToast } from "@/lib/luxuryToast";

const MySwal = withReactContent(Swal);

// --- KONFIGURASI MODAL ---
const swalConfig = {
  position: "center" as const, 
  heightAuto: false,
  backdrop: true,
  customClass: {
    popup: "rounded-none font-sans shadow-2xl border border-[#E5E5E5] p-6",
    confirmButton: "bg-[#6F0B0B] text-white rounded-none font-bold uppercase tracking-widest px-6 py-3 text-xs",
    cancelButton: "bg-white text-[#8D8D8C] border border-[#E5E5E5] rounded-none font-bold uppercase tracking-widest px-6 py-3 text-xs hover:bg-[#FAFAFA]",
    actions: "gap-4 mt-4"
  },
  buttonsStyling: false
};

// --- TYPES ---
interface PoinPenilaian {
  poinId: string;
  pertanyaan: string;
  tipe: "essay" | "multiple_choice";
  pilihan: string[];
}

interface Template {
  id: string;
  namaTemplate: string;
  startDate: string | null; // Boleh null
  endDate: string | null;   // Boleh null
  poinPenilaian: PoinPenilaian[];
}

// --- HELPER DATE & STATUS ---
const getStatus = (start: string | null, end: string | null) => {
  if (!start || !end) return "NONAKTIF"; // Jika tanggal kosong

  const now = new Date();
  const s = new Date(start);
  const e = new Date(end);
  e.setHours(23, 59, 59); 

  if (now >= s && now <= e) return "AKTIF";
  if (now < s) return "TERJADWAL";
  return "SELESAI";
};

const formatDateIndo = (dateStr: string | null) => {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric"
  });
};

export default function Adm07Page() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // State Form
  const [isEditing, setIsEditing] = useState(false);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formPoints, setFormPoints] = useState<PoinPenilaian[]>([]);

  // State Modal Detail
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  // --- 1. LOAD DATA ---
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/templatePenilaian");
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      
      // Sort logic: Aktif paling atas, lalu Terjadwal, lalu Nonaktif, lalu Selesai
      const sorted = data.sort((a: Template, b: Template) => {
        const statA = getStatus(a.startDate, a.endDate);
        const statB = getStatus(b.startDate, b.endDate);
        const order = { "AKTIF": 1, "TERJADWAL": 2, "NONAKTIF": 3, "SELESAI": 4 };
        // @ts-ignore
        return order[statA] - order[statB];
      });

      setTemplates(sorted);
    } catch (error) {
      showLuxuryToast({ type: "error", title: "Gagal memuat template." });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    resetForm();
  }, []);

  // --- 2. FORM LOGIC ---
  const resetForm = () => {
    setIsEditing(false);
    setFormId("");
    setFormName("");
    setFormStartDate("");
    setFormEndDate("");
    setFormPoints([{ poinId: `new-${Date.now()}`, pertanyaan: "", tipe: "essay", pilihan: [] }]);
  };

  const addPoint = () => {
    setFormPoints([...formPoints, { poinId: `new-${Date.now()}`, pertanyaan: "", tipe: "essay", pilihan: [] }]);
  };

  const removePoint = (index: number) => {
    const newPoints = [...formPoints];
    newPoints.splice(index, 1);
    setFormPoints(newPoints);
  };

  const updatePoint = (index: number, field: keyof PoinPenilaian, value: any) => {
    const newPoints = [...formPoints];
    // @ts-ignore
    newPoints[index][field] = value;
    setFormPoints(newPoints);
  };

  const handleOptionChange = (pointIndex: number, optionIndex: number, value: string) => {
    const currentPoints = [...formPoints];
    currentPoints[pointIndex].pilihan[optionIndex] = value;
    setFormPoints(currentPoints);
  };

  const handleAddOption = (pointIndex: number) => {
    const currentPoints = [...formPoints];
    currentPoints[pointIndex].pilihan.push(""); 
    setFormPoints(currentPoints);
  };

  const handleRemoveOption = (pointIndex: number, optionIndex: number) => {
    const currentPoints = [...formPoints];
    currentPoints[pointIndex].pilihan.splice(optionIndex, 1);
    setFormPoints(currentPoints);
  };

  // --- 3. CRUD ACTIONS ---
  
  const handleEditClick = (tpl: Template) => {
    const status = getStatus(tpl.startDate, tpl.endDate);
    
    // PROTEKSI: Tidak boleh edit jika SEDANG AKTIF (harus menunggu selesai atau nonaktifkan manual via db jika darurat)
    if (status === "AKTIF") {
      return MySwal.fire({
        ...swalConfig,
        icon: 'warning',
        title: <span className="font-serif text-xl text-[#1C1C1A]">Akses Ditolak</span>,
        html: <p className="font-sans text-sm text-[#4A4A48]">Template ini sedang <b>AKTIF</b> digunakan. Untuk menjaga integritas data penilaian, template tidak dapat diubah saat sesi berlangsung.</p>,
      });
    }

    setIsEditing(true);
    setFormId(tpl.id);
    setFormName(tpl.namaTemplate);
    setFormStartDate(tpl.startDate || "");
    setFormEndDate(tpl.endDate || "");
    setFormPoints(JSON.parse(JSON.stringify(tpl.poinPenilaian)));
    setSelectedTemplate(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string, start: string | null, end: string | null) => {
    const status = getStatus(start, end);
    if (status === "AKTIF") {
       return showLuxuryToast({ type: 'error', title: 'Gagal: Template sedang aktif berjalan.' });
    }

    const result = await MySwal.fire({
      ...swalConfig,
      title: `<div class="font-serif text-2xl text-[#1C1C1A]">Hapus Template?</div>`,
      html: `<p class="font-sans text-sm text-[#4A4A48]">Template "Nonaktif" atau "Selesai" akan dihapus permanen.</p>`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        const res = await fetch(`/api/templatePenilaian?id=${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Gagal menghapus");
        showLuxuryToast({ type: "success", title: "Template berhasil dihapus." });
        fetchTemplates();
        setSelectedTemplate(null);
      } catch (error: any) {
        showLuxuryToast({ type: "error", title: error.message });
      }
    }
  };

  // --- VALIDASI OVERLAP TANGGAL ---
  const checkDateOverlap = (start: string, end: string, excludeId?: string) => {
    // Jika user tidak mengisi tanggal, tidak perlu cek overlap (Status akan jadi NONAKTIF)
    if (!start || !end) return null;

    const newStart = new Date(start);
    const newEnd = new Date(end);

    // 1. Validasi Tanggal Dasar
    if (newStart > newEnd) return "Tanggal Selesai tidak boleh lebih awal dari Tanggal Mulai.";

    // 2. Cek Overlap dengan Template Lain
    for (const tpl of templates) {
      if (tpl.id === excludeId) continue; // Skip diri sendiri saat edit
      if (!tpl.startDate || !tpl.endDate) continue; // Skip template Nonaktif

      const existingStart = new Date(tpl.startDate);
      const existingEnd = new Date(tpl.endDate);

      // Logika Overlap: (StartA <= EndB) and (EndA >= StartB)
      if (newStart <= existingEnd && newEnd >= existingStart) {
        const stat = getStatus(tpl.startDate, tpl.endDate);
        if (stat === "AKTIF") {
            return `Konflik dengan Template AKTIF "${tpl.namaTemplate}". Jadwal baru harus dimulai SETELAH tanggal ${formatDateIndo(tpl.endDate)}.`;
        }
        return `Tabrakan jadwal dengan "${tpl.namaTemplate}" (${formatDateIndo(tpl.startDate)} - ${formatDateIndo(tpl.endDate)}).`;
      }
    }
    return null; // Tidak ada error
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validasi Poin
    if (formPoints.length === 0) return showLuxuryToast({ type: "error", title: "Minimal 1 poin penilaian." });
    
    // 2. Validasi Tanggal & Overlap
    const overlapError = checkDateOverlap(formStartDate, formEndDate, formId);
    if (overlapError) {
      return MySwal.fire({
        ...swalConfig,
        icon: 'error',
        title: <span className="font-serif text-xl text-[#6F0B0B]">Jadwal Konflik</span>,
        html: <p className="font-sans text-sm text-[#4A4A48]">{overlapError}</p>,
      });
    }

    const hasDates = formStartDate && formEndDate;
    const actionText = isEditing ? "memperbarui" : "membuat";
    const statusText = hasDates ? "TERJADWAL/AKTIF" : "NONAKTIF (Draft)";

    const confirmSave = await MySwal.fire({
      ...swalConfig,
      title: `<div class="font-serif text-2xl text-[#1C1C1A]">Konfirmasi Simpan</div>`,
      html: `
        <div class="font-sans text-sm text-[#4A4A48] text-left">
          <p class="mb-2">Anda akan ${actionText} template dengan status <b>${statusText}</b>.</p>
          ${hasDates ? `
            <ul class="list-disc pl-4 space-y-1 mb-2">
              <li>Template: <b>${formName}</b></li>
              <li>Periode: <b>${formatDateIndo(formStartDate)}</b> s/d <b>${formatDateIndo(formEndDate)}</b></li>
            </ul>
          ` : `
            <p class="text-xs italic bg-gray-50 p-2 border border-gray-200">
              Karena tanggal tidak diisi, template ini tidak akan muncul di sesi penilaian sampai Anda mengeditnya dan memberikan tanggal.
            </p>
          `}
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      cancelButtonText: "Batal",
    });

    if (!confirmSave.isConfirmed) return;

    const finalPoints = formPoints.map((p, idx) => ({
        ...p,
        poinId: p.poinId.startsWith("new-") ? `q${idx + 1}-${Date.now()}` : p.poinId,
        pilihan: p.tipe === "multiple_choice" ? p.pilihan.filter(opt => opt.trim() !== "") : []
    }));

    // Payload: Jika string kosong, kirim null
    const payload = { 
      id: formId, 
      namaTemplate: formName, 
      startDate: formStartDate || null,
      endDate: formEndDate || null,
      poinPenilaian: finalPoints 
    };

    try {
      const url = "/api/templatePenilaian";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      
      if (!res.ok) throw new Error("Gagal menyimpan");

      showLuxuryToast({ type: "success", title: "Berhasil disimpan." });
      resetForm();
      fetchTemplates();
    } catch (error: any) {
      showLuxuryToast({ type: "error", title: error.message || "Gagal menyimpan." });
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* HEADER */}
      <div className="bg-white border-b border-[#E5E5E5] px-10 py-8 sticky top-0 z-20 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
        <h1 className="text-3xl font-serif text-[#1C1C1A] mb-2">Kelola Template Penilaian</h1>
        <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
          Atur pertanyaan dan periode aktif seleksi wawancara
        </p>
      </div>

      <div className="px-10 py-10 max-w-full grid grid-cols-1 lg:grid-cols-2 gap-10 relative">
        {/* KOLOM KIRI: LIST TEMPLATE */}
        <div className={`border border-[#E5E5E5] p-8 transition-all ${isEditing ? "opacity-40 pointer-events-none blur-[1px]" : "opacity-100"}`}>
          <div className="flex justify-between items-center mb-6 border-b border-[#E5E5E5] pb-4">
             <h2 className="text-lg font-serif text-[#1C1C1A]">Daftar Template</h2>
          </div>

          <div className="space-y-4">
            {isLoading ? (
                <p className="text-center text-xs text-[#8D8D8C] animate-pulse">Memuat data...</p>
            ) : templates.length === 0 ? (
              <p className="text-[#8D8D8C] italic text-center py-6 text-sm">Belum ada template.</p>
            ) : (
              templates.map((tpl) => {
                const status = getStatus(tpl.startDate, tpl.endDate);
                const isAktif = status === "AKTIF";
                
                return (
                  <div key={tpl.id} className={`p-5 border-l-4 transition cursor-pointer relative group ${isAktif ? "border-[#2F5D40] bg-[#F3F8F5] shadow-sm" : status === "NONAKTIF" ? "border-dashed border-[#E5E5E5] bg-white opacity-80 hover:opacity-100" : "border-[#1C1C1A] bg-white hover:bg-[#FAFAFA]"}`}>
                    
                    {/* Badge Status */}
                    <div className="absolute top-4 right-4">
                        {isAktif && <span className="flex items-center gap-1 bg-[#2F5D40] text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest"><CheckCircle2 className="w-3 h-3"/> Aktif</span>}
                        {status === "TERJADWAL" && <span className="bg-[#1C1C1A] text-white text-[9px] font-bold px-2 py-1 uppercase tracking-widest">Terjadwal</span>}
                        {status === "SELESAI" && <span className="bg-[#E5E5E5] text-[#8D8D8C] text-[9px] font-bold px-2 py-1 uppercase tracking-widest">Selesai</span>}
                        {status === "NONAKTIF" && <span className="bg-[#F5F5F5] text-[#8D8D8C] border border-[#E5E5E5] text-[9px] font-bold px-2 py-1 uppercase tracking-widest">Nonaktif (Draft)</span>}
                    </div>

                    <div className="pr-20">
                      <h3 className={`font-serif text-lg font-medium mb-1 ${status === 'SELESAI' || status === 'NONAKTIF' ? 'text-[#8D8D8C]' : 'text-[#1C1C1A]'}`}>{tpl.namaTemplate}</h3>
                      
                      <div className="flex items-center gap-4 text-xs mt-3 text-[#4A4A48]">
                         <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-[#8D8D8C]" />
                            <span className="font-mono">
                                {tpl.startDate ? `${formatDateIndo(tpl.startDate)} — ${formatDateIndo(tpl.endDate)}` : <span className="italic text-[#8D8D8C]">Belum diatur</span>}
                            </span>
                         </div>
                      </div>
                    </div>

                    <button onClick={() => setSelectedTemplate(tpl)} className={`mt-4 w-full py-2 border text-xs font-bold uppercase tracking-widest transition ${isAktif ? "border-[#2F5D40] text-[#2F5D40] hover:bg-[#2F5D40] hover:text-white" : "border-[#1C1C1A] text-[#1C1C1A] hover:bg-[#1C1C1A] hover:text-white"}`}>
                        {status === 'NONAKTIF' ? 'Edit / Aktifkan' : 'Lihat Detail'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
          
          {isEditing && (
            <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
              <span className="text-[#6F0B0B] font-bold text-sm bg-white px-4 py-2 border border-[#6F0B0B] shadow-sm uppercase tracking-widest animate-pulse">Sedang Mengedit...</span>
            </div>
          )}
        </div>

        {/* KOLOM KANAN: FORM BUILDER */}
        <div className={`border border-[#E5E5E5] p-8 transition-all ${isEditing ? "bg-[#FAFAFA] shadow-lg border-[#6F0B0B]/30" : "bg-white"}`}>
          <div className="flex justify-between items-center mb-6 border-b border-[#E5E5E5] pb-4">
            <h2 className="text-lg font-serif text-[#1C1C1A]">{isEditing ? "Mode Edit Template" : "Buat Template Baru"}</h2>
            {isEditing && <button onClick={resetForm} className="text-xs font-sans text-[#6F0B0B] hover:underline font-medium uppercase tracking-wide">Batal</button>}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Nama Template */}
            <div>
              <label className="text-[10px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2">Nama Batch / Template <span className="text-red-500">*</span></label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} required className="clean-input w-full text-xs font-medium border-b border-[#E5E5E5] bg-transparent outline-none py-2 focus:border-[#6F0B0B] transition" placeholder="Contoh: Seleksi Gelombang 1 - 2024" />
            </div>

            {/* Tanggal Periode (Opsional) */}
            <div className="p-4 border border-dashed border-[#E5E5E5] bg-[#F9F9F9]">
                <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-[#6F0B0B]" />
                    <span className="text-[10px] font-bold text-[#1C1C1A] uppercase tracking-widest">Pengaturan Jadwal (Opsional)</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2">Mulai</label>
                        <input type="date" value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="clean-input w-full text-xs font-medium border-b border-[#E5E5E5] bg-transparent outline-none py-2 focus:border-[#6F0B0B] transition cursor-pointer text-[#1C1C1A]" />
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2">Selesai</label>
                        <input type="date" value={formEndDate} onChange={(e) => setFormEndDate(e.target.value)} className="clean-input w-full text-xs font-medium border-b border-[#E5E5E5] bg-transparent outline-none py-2 focus:border-[#6F0B0B] transition cursor-pointer text-[#1C1C1A]" />
                    </div>
                </div>
                
                <div className="mt-3 text-[10px] text-[#8D8D8C] leading-relaxed">
                    * Kosongkan tanggal jika ingin menyimpan sebagai <b>NONAKTIF (Draft)</b>.<br/>
                    * Isi tanggal untuk mengaktifkan (Status: <b>TERJADWAL/AKTIF</b>).<br/>
                    * Hanya <b>SATU</b> template yang boleh Aktif dalam satu waktu.
                </div>
            </div>

            {/* Form Poin Penilaian */}
            <div className="bg-white p-4 border border-[#E5E5E5] space-y-3 max-h-[500px] overflow-y-auto custom-scroll">
              <h3 className="text-[10px] font-bold text-[#8D8D8C] uppercase tracking-widest mb-3">Daftar Pertanyaan</h3>
              {formPoints.map((poin, idx) => (
                <div key={idx} className="bg-[#FAFAFA] p-4 border border-[#E5E5E5] relative group transition-all hover:shadow-sm">
                  <button type="button" onClick={() => removePoint(idx)} className="absolute top-3 right-3 text-[#E5E5E5] hover:text-[#6F0B0B] transition"><Trash2 className="w-4 h-4" /></button>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-white text-[#6F0B0B] w-6 h-6 flex items-center justify-center text-[10px] font-bold border border-[#6F0B0B] shadow-sm">{idx + 1}</span>
                    <select value={poin.tipe} onChange={(e) => {
                          const newType = e.target.value;
                          const newPoints = [...formPoints];
                          // @ts-ignore
                          newPoints[idx].tipe = newType;
                          if(newType === 'multiple_choice' && newPoints[idx].pilihan.length === 0) newPoints[idx].pilihan = ["", ""];
                          setFormPoints(newPoints);
                      }} className="text-[10px] border-none bg-transparent font-bold text-[#1C1C1A] uppercase tracking-widest cursor-pointer focus:ring-0">
                      <option value="essay">Essay (Isian)</option>
                      <option value="multiple_choice">Pilihan Ganda</option>
                    </select>
                  </div>
                  <input type="text" value={poin.pertanyaan} onChange={(e) => updatePoint(idx, "pertanyaan", e.target.value)} placeholder="Tulis pertanyaan disini..." required className="w-full text-sm font-serif border-b border-[#E5E5E5] bg-transparent outline-none pb-2 mb-4 focus:border-[#6F0B0B] transition placeholder:italic placeholder:text-gray-300 text-[#1C1C1A]" />
                  
                  {poin.tipe === "multiple_choice" && (
                    <div className="ml-8 border-l-2 border-[#E5E5E5] pl-4 py-1 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2">Opsi Jawaban</label>
                      {poin.pilihan.map((opsi, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 group/opt">
                          <div className="w-5 flex justify-center text-[10px] font-bold text-[#8D8D8C]">{String.fromCharCode(65 + optIdx)}.</div>
                          <input type="text" value={opsi} onChange={(e) => handleOptionChange(idx, optIdx, e.target.value)} placeholder={`Opsi ${String.fromCharCode(65 + optIdx)}`} className="flex-1 text-xs border border-[#E5E5E5] bg-white px-3 py-2 outline-none focus:border-[#6F0B0B] focus:shadow-sm transition" />
                          <button type="button" onClick={() => handleRemoveOption(idx, optIdx)} className="text-[#E5E5E5] hover:text-[#6F0B0B] p-1 opacity-0 group-hover/opt:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => handleAddOption(idx)} className="mt-2 text-[10px] font-bold text-[#6F0B0B] hover:underline uppercase tracking-widest flex items-center gap-1 pl-7"><Plus className="w-3 h-3" /> Tambah Opsi</button>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addPoint} className="w-full py-3 border-2 border-dashed border-[#E5E5E5] text-[#8D8D8C] text-xs font-bold uppercase tracking-widest hover:border-[#6F0B0B] hover:text-[#6F0B0B] hover:bg-[#FAFAFA] transition flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Tambah Pertanyaan Baru</button>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="submit" className="flex-1 bg-[#6F0B0B] text-white font-bold py-3 text-xs uppercase tracking-widest hover:bg-[#8B0D0D] transition shadow-sm">
                {isEditing ? "Simpan Perubahan" : "Simpan Template"}
              </button>
              <button type="button" onClick={resetForm} className="px-6 py-3 bg-white border border-[#E5E5E5] text-[#8D8D8C] font-bold text-xs uppercase tracking-widest hover:bg-[#FAFAFA] transition">Reset</button>
            </div>
          </form>
        </div>
      </div>

      {/* MODAL DETAIL (READ ONLY) */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white border border-[#E5E5E5] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#E5E5E5] flex justify-between items-start bg-white">
              <div>
                <h2 className="text-2xl font-serif text-[#1C1C1A]">{selectedTemplate.namaTemplate}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] text-[#8D8D8C] font-sans uppercase tracking-widest bg-[#FAFAFA] px-2 py-1 border border-[#E5E5E5]">ID: {selectedTemplate.id}</span>
                </div>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="text-[#8D8D8C] hover:text-[#1C1C1A]"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-8 overflow-y-auto custom-scroll">
              <div className="mb-6 pb-6 border-b border-[#E5E5E5] flex items-center justify-between">
                <div>
                    <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-1">Periode Aktif</label>
                    <div className="font-serif text-[#1C1C1A] text-lg">
                        {selectedTemplate.startDate ? (
                            `${formatDateIndo(selectedTemplate.startDate)} — ${formatDateIndo(selectedTemplate.endDate)}`
                        ) : (
                            <span className="text-[#8D8D8C] italic text-base">Tidak dijadwalkan (Nonaktif)</span>
                        )}
                    </div>
                </div>
                
                {(() => {
                    const st = getStatus(selectedTemplate.startDate, selectedTemplate.endDate);
                    if(st === 'AKTIF') return <span className="bg-[#2F5D40] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Sedang Berjalan</span>;
                    if(st === 'SELESAI') return <span className="bg-[#E5E5E5] text-[#8D8D8C] px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Berakhir</span>;
                    if(st === 'TERJADWAL') return <span className="bg-[#1C1C1A] text-white px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Akan Datang</span>;
                    return <span className="border border-[#E5E5E5] text-[#8D8D8C] px-3 py-1 text-[10px] font-bold uppercase tracking-widest">Draft</span>;
                })()}
              </div>
              
              <div className="space-y-6">
                {selectedTemplate.poinPenilaian.map((p, idx) => (
                  <div key={idx} className="border-b border-[#E5E5E5] pb-5 last:border-0">
                    <div className="flex gap-3">
                        <div className="w-6 h-6 rounded-full bg-[#FAFAFA] border border-[#E5E5E5] flex items-center justify-center text-[10px] font-bold text-[#1C1C1A] shrink-0">{idx + 1}</div>
                        <div className="w-full">
                            <p className="font-serif text-[#1C1C1A] font-medium text-base mb-2">{p.pertanyaan}</p>
                            {p.tipe === "multiple_choice" ? (
                                <div className="space-y-1.5 ml-1">
                                    {p.pilihan.map((opt, i) => (
                                        <div key={i} className="flex items-center gap-2 text-sm text-[#4A4A48]">
                                            <div className="w-4 h-4 rounded-full border border-[#8D8D8C] flex items-center justify-center"><div className="w-1.5 h-1.5 bg-transparent rounded-full"></div></div>
                                            <span>{opt}</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="w-full h-8 border-b border-dashed border-[#E5E5E5] bg-[#FAFAFA/50]"></div>
                            )}
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* FOOTER MODAL */}
            <div className="p-6 border-t border-[#E5E5E5] bg-[#FAFAFA] flex justify-end gap-3">
              {getStatus(selectedTemplate.startDate, selectedTemplate.endDate) === "AKTIF" ? (
                  <div className="w-full flex items-center justify-center gap-2 text-[#6F0B0B] text-xs font-bold uppercase tracking-widest opacity-80 py-2">
                      <Lock className="w-3 h-3"/> Template dikunci selama periode aktif
                  </div>
              ) : (
                  <>
                    <button onClick={() => handleDelete(selectedTemplate.id, selectedTemplate.startDate, selectedTemplate.endDate)} className="px-6 py-2 border border-[#6F0B0B] text-[#6F0B0B] hover:bg-[#FFEBEE] text-xs font-bold uppercase tracking-widest transition">
                        Hapus
                    </button>
                    
                    <button onClick={() => handleEditClick(selectedTemplate)} className="flex items-center gap-2 px-6 py-2 bg-white border border-[#1C1C1A] text-[#1C1C1A] hover:bg-[#1C1C1A] hover:text-white text-xs font-bold uppercase tracking-widest transition">
                        <FileEdit className="w-3.5 h-3.5" />
                        Edit / Jadwalkan
                    </button>
                  </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}