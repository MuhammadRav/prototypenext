"use client";

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { 
  CheckCircle, FileText, ChevronDown, User, 
  Star, UserCheck, Award, FileBadge, 
  ChevronLeft, ChevronRight, X, 
  LayoutTemplate, Search, 
  PanelLeftClose, PanelLeftOpen, Eye,
  Loader2, FileWarning, Filter, ArrowLeft,
  Mail, Phone, MapPin, Briefcase, CreditCard, Users
} from 'lucide-react';
import db from '@/data/db.json';
import { showLuxuryToast } from '@/lib/luxuryToast';

const MySwal = withReactContent(Swal);

// --- CONFIG ---
const PRODI_MAP: Record<string, string> = {
  'IF': 'Teknik Informatika',
  'SI': 'Sistem Informasi',
  'HI': 'Hubungan Internasional',
  'DKV': 'Desain Komunikasi Visual',
  'SP': 'Sastra Prancis'
};

const DOC_CONFIG = [
  { id: 'rapot', label: 'Rapor Terakhir', category: 'wajib', icon: FileText },
  { id: 'kemampuanBahasaInggris', label: 'Bukti Inggris', category: 'wajib', icon: Star },
  { id: 'paspor', label: 'Paspor', category: 'wajib', icon: User },
  { id: 'motivationLetter', label: 'Motivation Letter', category: 'beasiswa', icon: FileText },
  { id: 'suratRekomendasi', label: 'Srt. Rekomendasi', category: 'beasiswa', icon: UserCheck },
  { id: 'sertifikatPrestasi', label: 'Sert. Prestasi', category: 'tambahan', icon: Award },
  { id: 'sertifikatKompetensi', label: 'Sert. Kompetensi', category: 'tambahan', icon: FileBadge },
  { id: 'dokumenPendukung', label: 'Dok. Lainnya', category: 'tambahan', icon: FileText },
];

// UPDATED: Logic Predikat Murni dari Skor Wawancara (ADM07)
const calcPred = (score: number) => {
  if (score >= 90) return 'Sangat Direkomendasikan';
  if (score >= 80) return 'Direkomendasikan';
  if (score >= 70) return 'Dipertimbangkan';
  if (score >= 60) return 'Tidak Direkomendasikan';
  return 'Sangat Tidak Direkomendasikan';
};

const calculateAge = (dob: string) => {
  if (!dob) return '-';
  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  return isNaN(age) ? '-' : age;
};

// --- HELPER COMPONENTS ---
const InfoLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[9px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-0.5">
        {children}
    </span>
);

const InfoValue = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <span className={`font-serif text-[#1C1C1A] text-sm leading-snug block ${className}`}>
        {children || '-'}
    </span>
);

const SectionHeader = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#E5E5E5] mt-6 first:mt-0">
        <Icon className="w-3.5 h-3.5 text-[#6F0B0B]" />
        <h3 className="text-xs font-bold text-[#1C1C1A] uppercase tracking-wider">{title}</h3>
    </div>
);

export default function Adm02Page() {
  const searchParams = useSearchParams();
  
  // -- STATE UI --
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [leftPanelMode, setLeftPanelMode] = useState<'profil' | 'preview'>('profil');
  
  // -- STATE FILTER --
  const [statusFilter, setStatusFilter] = useState('belum'); // 'belum', 'sudah', 'semua'
  const [interviewerFilter, setInterviewerFilter] = useState('semua');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  
  // -- STATE PREVIEW --
  const [activeDocIndex, setActiveDocIndex] = useState(0);
  const [isFileValid, setIsFileValid] = useState(true);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // -- STATE FORM --
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formScores, setFormScores] = useState<Record<string, number>>({});
  const [formAnswers, setFormAnswers] = useState<Record<string, string>>({});
  const [formNote, setFormNote] = useState('');

  // -- STATE DATA --
  const [schedules, setSchedules] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [template, setTemplate] = useState<any>(null);
  const [currentProdiName, setCurrentProdiName] = useState('');

  // --- INITIAL LOAD ---
  useEffect(() => {
    const prodiId = searchParams.get('prodi_id') || 'IF';
    const prodiName = PRODI_MAP[prodiId] || 'Teknik Informatika';
    setCurrentProdiName(prodiName);

    setCandidates(db.calonMahasiswa);
    setResults(db.hasilPenilaianWawancara);
    
    const prodiSchedules = db.jadwalWawancara.filter(s => s.prodi === prodiName);
    setSchedules(prodiSchedules);
    
    const activeTpl = db.templatePenilaian.find(t => t.isAktif);
    setTemplate(activeTpl);

    const urlId = searchParams.get('candidate_id');
    if (urlId) {
      setSelectedCandidateId(urlId);
      setStatusFilter('semua');
    }
  }, [searchParams]);

  // --- FILTER LOGIC ---
  const uniqueInterviewers = useMemo(() => {
    const names = new Set(schedules.map(s => s.pewawancara));
    return Array.from(names);
  }, [schedules]);

  const filteredCandidates = useMemo(() => {
    let list: any[] = [];
    schedules.forEach(sch => {
      if (interviewerFilter !== 'semua' && sch.pewawancara !== interviewerFilter) return;

      sch.pesertaIds.forEach((pid: string) => {
        const c = candidates.find(x => x.id === pid);
        if (c) {
          const isAssessed = results.some(r => r.calonMahasiswaId === pid);
          
          // Filter Logic
          if (statusFilter === 'belum' && isAssessed) return;
          if (statusFilter === 'sudah' && !isAssessed) return;
          
          if (searchQuery && !c.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase())) return;
          list.push({ ...c, scheduleInfo: sch, isAssessed });
        }
      });
    });
    // Sort: Belum dinilai first, then alphabetical
    return list.sort((a, b) => {
        if (a.isAssessed === b.isAssessed) return a.namaLengkap.localeCompare(b.namaLengkap);
        return a.isAssessed ? 1 : -1;
    });
  }, [schedules, candidates, results, statusFilter, interviewerFilter, searchQuery]);

  const selectedCandidate = useMemo(() => {
    return filteredCandidates.find(c => c.id === selectedCandidateId) || 
           candidates.find(c => c.id === selectedCandidateId); // Fallback lookup if filtered out
  }, [filteredCandidates, candidates, selectedCandidateId]);

  // --- RESET STATE ON CHANGE ---
  useEffect(() => {
    setLeftPanelMode('profil');
    setFormScores({});
    setFormAnswers({});
    setFormNote('');
  }, [selectedCandidateId]);

  // --- DOC LOGIC ---
  const availableDocs = useMemo(() => {
    if (!selectedCandidate) return [];
    return DOC_CONFIG
      // @ts-ignore
      .map(conf => ({ ...conf, url: selectedCandidate.berkas?.[conf.id] }))
      .filter(item => item.url && item.url.trim() !== "") 
      .map(item => ({
        ...item,
        type: item.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
      }));
  }, [selectedCandidate]);

  useEffect(() => {
    if (leftPanelMode === 'preview' && availableDocs[activeDocIndex]) {
        setIsLoadingFile(true);
        setIsFileValid(true);
        const currentUrl = availableDocs[activeDocIndex].url;
        fetch(currentUrl, { method: "HEAD" })
            .then((res) => setIsFileValid(res.ok))
            .catch(() => setIsFileValid(false)) 
            .finally(() => setTimeout(() => setIsLoadingFile(false), 500)); 
    }
  }, [activeDocIndex, leftPanelMode, availableDocs]);

  // --- CALCULATION (UPDATED LOGIC ADM07) ---
  const calculation = useMemo(() => {
    if (!template || !template.poinPenilaian || template.poinPenilaian.length === 0 || !selectedCandidate) {
        return { avgWawancara: 0, tesScore: 0, pred: 'Menunggu Input...' };
    }
    const scores = Object.values(formScores);
    const totalWawancara = scores.reduce((a, b) => a + (b || 0), 0);
    const divisor = template.poinPenilaian.length;
    // Rata-rata MURNI dari hasil wawancara
    const avgWawancara = divisor > 0 ? Math.round(totalWawancara / divisor) : 0;
    
    // @ts-ignore - Ambil nilai tes hanya untuk referensi
    const tesScore = selectedCandidate.tahapanSeleksi?.tesPengetahuan?.nilai || 0;
    const allFilled = template.poinPenilaian.every((p:any) => formScores[p.poinId] !== undefined && formScores[p.poinId] >= 0);
    
    // LOGIC FIX: Rekomendasi hanya berdasarkan performa wawancara
    return { 
        avgWawancara, 
        tesScore,
        pred: allFilled ? calcPred(avgWawancara) : 'Menunggu Input...' 
    };
  }, [formScores, template, selectedCandidate]);

  // --- ACTIONS ---
  const handleOpenDoc = (idx: number) => {
    setActiveDocIndex(idx);
    setLeftPanelMode('preview');
    if (window.innerWidth < 1024) setSidebarOpen(false);
  };

  const handleClosePreview = () => {
    setLeftPanelMode('profil');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (calculation.pred === 'Menunggu Input...') return showLuxuryToast({ type: "error", title: "Harap lengkapi nilai." });
    
    const confirm = await MySwal.fire({
      title: <span className="font-serif text-[#1C1C1A] text-xl">Simpan Penilaian?</span>,
      html: `<p class="text-sm font-sans text-gray-600">Nilai untuk <b>${selectedCandidate?.namaLengkap}</b> akan disimpan permanen.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      confirmButtonColor: '#6F0B0B',
      cancelButtonColor: '#E5E5E5',
      customClass: { popup: 'rounded-none', confirmButton: 'rounded-none font-sans uppercase', cancelButton: 'rounded-none text-gray-600 font-sans uppercase' }
    });

    if (confirm.isConfirmed) {
      setIsSubmitting(true);
      setTimeout(() => { 
        // @ts-ignore
        setResults(prev => [...prev, { calonMahasiswaId: selectedCandidate.id, skorTotalWawancara: calculation.avgWawancara, rekomendasiPredikat: calculation.pred, jawaban: [], catatanPewawancara: formNote }]); 
        setFormScores({}); setFormAnswers({}); setFormNote(''); setIsSubmitting(false);
        showLuxuryToast({ type: "success", title: "Berhasil disimpan." });
      }, 800);
    }
  };

  const currentDoc = availableDocs[activeDocIndex];

  return (
    <div className="flex h-screen bg-[#FFFFFF] font-sans overflow-hidden text-[#1C1C1A]">
      
      {/* 1. SIDEBAR (Collapsible) */}
      <aside 
        className={`bg-white border-r border-[#E5E5E5] flex flex-col flex-shrink-0 z-30 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? 'w-[320px] translate-x-0' : 'w-0 -translate-x-full opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-6 pb-4 border-b border-[#E5E5E5] bg-white min-w-[320px]">
          <h2 className="text-xl font-serif text-[#6F0B0B] mb-1">Antrian Wawancara</h2>
          <p className="text-[10px] text-[#A3A3A3] uppercase tracking-widest mb-4">Total: {filteredCandidates.length} Peserta</p>
          
          <div className="space-y-3">
             <div className="relative">
                <Search className="absolute left-0 top-2 w-4 h-4 text-[#A3A3A3]" />
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari Nama..." className="w-full pl-6 py-1.5 border-b border-[#E5E5E5] text-sm focus:border-[#6F0B0B] outline-none bg-transparent placeholder:text-[#D4D4D4] uppercase tracking-wide"/>
             </div>
             
             {/* Filter Pewawancara */}
             <div className="relative">
                <Filter className="absolute left-0 top-2 w-3.5 h-3.5 text-[#A3A3A3]" />
                <select value={interviewerFilter} onChange={(e) => setInterviewerFilter(e.target.value)} className="w-full pl-6 py-1.5 border-b border-[#E5E5E5] text-xs font-bold uppercase tracking-widest bg-transparent outline-none cursor-pointer appearance-none">
                    <option value="semua">Semua Pewawancara</option>
                    {uniqueInterviewers.map((name, idx) => (<option key={idx} value={name}>{name}</option>))}
                </select>
                <ChevronDown className="absolute right-0 top-2 w-3.5 h-3.5 text-[#A3A3A3] pointer-events-none"/>
            </div>

            {/* Filter Status */}
            <div className="relative">
                <div className={`w-3.5 h-3.5 absolute left-0 top-2 rounded-full border border-current ${statusFilter === 'semua' ? 'text-gray-400' : statusFilter === 'sudah' ? 'bg-[#2F5D40] text-[#2F5D40]' : 'bg-transparent text-[#6F0B0B]'}`}></div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full pl-6 py-1.5 border-b border-[#E5E5E5] text-xs font-bold uppercase tracking-widest bg-transparent outline-none cursor-pointer appearance-none">
                    <option value="belum">Belum Dinilai</option>
                    <option value="sudah">Sudah Dinilai</option>
                    <option value="semua">Semua Status</option>
                </select>
                <ChevronDown className="absolute right-0 top-2 w-3.5 h-3.5 text-[#A3A3A3] pointer-events-none"/>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scroll min-w-[320px]">
          {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center">
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest">Tidak ada data</p>
              </div>
          ) : (
            filteredCandidates.map((c, index) => {
                const isActive = selectedCandidateId === c.id;
                // @ts-ignore
                const isSelectedAssessed = results.some(r => r.calonMahasiswaId === c.id);
                return (
                <div key={index} onClick={() => setSelectedCandidateId(c.id)} className={`group p-5 border-b border-[#E5E5E5] cursor-pointer transition-all relative ${isActive ? 'bg-[#FAFAFA]' : 'bg-white hover:bg-[#FAFAFA]'}`}>
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#6F0B0B]"></div>}
                    <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold tracking-widest uppercase text-[#A3A3A3]">{c.scheduleInfo?.waktu ? new Date(c.scheduleInfo.waktu).toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'}) : '-'} WIB</span>
                    {isSelectedAssessed && <CheckCircle className="w-3.5 h-3.5 text-[#2F5D40]"/>}
                    </div>
                    <h4 className={`text-sm font-serif font-medium ${isActive ? 'text-[#6F0B0B]' : 'text-[#1C1C1A]'}`}>{c.namaLengkap}</h4>
                    <div className="mt-2 text-[10px] text-[#A3A3A3] uppercase tracking-wide truncate">
                        Oleh: <span className="text-[#1C1C1A]">{c.scheduleInfo?.pewawancara}</span>
                    </div>
                </div>
                );
            })
          )}
        </div>
      </aside>

      {/* 2. MAIN AREA (Flexible) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F5F5F5] relative transition-all duration-300">
        {!selectedCandidate ? (
           <div className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50">
             <LayoutTemplate className="w-12 h-12 text-[#A3A3A3] mb-4"/>
             <h3 className="text-xl font-serif text-[#1C1C1A]">Panel Penilaian</h3>
             <p className="text-[10px] uppercase tracking-widest text-[#A3A3A3]">Pilih kandidat untuk memulai</p>
           </div>
        ) : (
          <>
            {/* GLOBAL HEADER */}
            <header className="h-16 bg-white border-b border-[#E5E5E5] flex items-center justify-between px-6 shrink-0 z-20 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="text-[#A3A3A3] hover:text-[#1C1C1A] transition-colors focus:outline-none">
                        {isSidebarOpen ? <PanelLeftClose className="w-5 h-5"/> : <PanelLeftOpen className="w-5 h-5"/>}
                    </button>
                    <div className="w-px h-6 bg-[#E5E5E5]"></div>
                    <h1 className="text-lg font-serif text-[#1C1C1A] tracking-tight">{selectedCandidate.namaLengkap}</h1>
                    <span className="px-2 py-0.5 border border-[#E5E5E5] text-[9px] font-bold uppercase tracking-widest text-[#6F0B0B] bg-[#FAFAFA]">{currentProdiName}</span>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#A3A3A3]">
                    Pewawancara: <span className="text-[#1C1C1A]">{selectedCandidate.scheduleInfo?.pewawancara}</span>
                </div>
            </header>

            {/* SPLIT CONTENT */}
            <div className="flex-1 flex overflow-hidden w-full">
                
                {/* --- LEFT PANEL: PROFIL / PREVIEW --- */}
                <div className={`transition-all duration-300 ease-in-out border-r border-[#E5E5E5] flex flex-col relative bg-white ${isSidebarOpen ? 'w-5/12' : 'w-1/2'} min-w-0`}>
                    
                    {/* MODE 1: PROFIL KANDIDAT LENGKAP */}
                    <div className={`absolute inset-0 flex flex-col bg-white transition-opacity duration-300 ${leftPanelMode === 'profil' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                        <div className="p-8 overflow-y-auto custom-scroll h-full">
                            
                            {/* Header Image & Basic Info */}
                            <div className="flex items-start gap-6 mb-8 border-b border-[#E5E5E5] pb-6">
                                <img src={selectedCandidate.foto || "/placeholder.png"} className="w-24 h-32 object-cover border border-[#E5E5E5] shadow-md bg-gray-50" />
                                <div className="space-y-4 flex-1 min-w-0">
                                    <div>
                                        <InfoLabel>Nama Lengkap</InfoLabel>
                                        <p className="font-serif text-xl text-[#1C1C1A] truncate">{selectedCandidate.namaLengkap}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><InfoLabel>ID Pendaftaran</InfoLabel><InfoValue className="font-mono">{selectedCandidate.id}</InfoValue></div>
                                        <div><InfoLabel>Tanggal Lahir</InfoLabel><InfoValue>{selectedCandidate.tanggalLahir}</InfoValue></div>
                                        <div><InfoLabel>Usia</InfoLabel><InfoValue>{calculateAge(selectedCandidate.tanggalLahir)} Tahun</InfoValue></div>
                                        <div><InfoLabel>Negara</InfoLabel><InfoValue>{selectedCandidate.negaraAsal}</InfoValue></div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Kontak Pribadi */}
                            <SectionHeader title="Kontak Pribadi & Identitas" icon={User} />
                            <div className="grid grid-cols-1 gap-y-4 mb-8 pl-2">
                                <div className="flex items-start gap-3">
                                    <Mail className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0"/>
                                    <div className="flex-1 min-w-0">
                                        <InfoLabel>Alamat Email</InfoLabel>
                                        <InfoValue className="truncate">{selectedCandidate.email}</InfoValue>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex items-start gap-3">
                                        <CreditCard className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0"/>
                                        <div className="flex-1 min-w-0">
                                            <InfoLabel>Nomor Paspor</InfoLabel>
                                            <InfoValue>{selectedCandidate.nomorPaspor || selectedCandidate.nik || '-'}</InfoValue>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Phone className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0"/>
                                        <div className="flex-1 min-w-0">
                                            <InfoLabel>Nomor HP</InfoLabel>
                                            <InfoValue>{selectedCandidate.telepon || '-'}</InfoValue>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Orang Tua / Wali */}
                            <SectionHeader title="Data Administratif & Wali" icon={Users} />
                            <div className="grid grid-cols-1 gap-y-4 mb-8 pl-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <InfoLabel>Nama Ayah/Wali</InfoLabel>
                                        {/* @ts-ignore */}
                                        <InfoValue>{selectedCandidate.dataWali?.nama || selectedCandidate.namaAyah || 'Franky Franklin'}</InfoValue>
                                    </div>
                                    <div>
                                        <InfoLabel>Pekerjaan</InfoLabel>
                                        {/* @ts-ignore */}
                                        <InfoValue>{selectedCandidate.dataWali?.pekerjaan || 'Informant'}</InfoValue>
                                    </div>
                                </div>
                                <div>
                                    <InfoLabel>Kontak Wali</InfoLabel>
                                    {/* @ts-ignore */}
                                    <InfoValue>{selectedCandidate.dataWali?.telepon || '+49 123 456 7892'}</InfoValue>
                                </div>
                            </div>

                            {/* Section: Domisili */}
                            <SectionHeader title="Domisili" icon={MapPin} />
                            <div className="flex items-start gap-3 mb-8 pl-2">
                                <MapPin className="w-4 h-4 text-gray-300 mt-1 flex-shrink-0"/>
                                <div className="flex-1 min-w-0">
                                    <InfoLabel>Alamat Lengkap</InfoLabel>
                                    <InfoValue className="leading-relaxed">
                                        {selectedCandidate.profilLengkap?.alamat || '123 Ostania Street, Berlint'}
                                    </InfoValue>
                                </div>
                            </div>

                            {/* Section: Documents */}
                            <SectionHeader title="Berkas Penunjang" icon={FileText} />
                            <div className="grid grid-cols-1 gap-2 mt-4">
                                {DOC_CONFIG.map((doc) => {
                                    // @ts-ignore
                                    const url = selectedCandidate.berkas?.[doc.id];
                                    const docIdx = availableDocs.findIndex(d => d.id === doc.id);
                                    return (
                                        <div key={doc.id} className="flex items-center justify-between p-3 border border-[#E5E5E5] hover:border-[#6F0B0B] transition-colors group bg-white rounded-sm">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-sm ${url ? 'bg-[#FAFAFA] text-[#1C1C1A]' : 'bg-gray-100 text-gray-300'}`}>
                                                    <doc.icon className="w-3.5 h-3.5"/>
                                                </div>
                                                <span className={`text-xs font-serif ${!url && 'text-gray-400'}`}>{doc.label}</span>
                                            </div>
                                            {url && (
                                                <button 
                                                    onClick={() => handleOpenDoc(docIdx)}
                                                    className="text-[9px] font-bold uppercase tracking-widest text-[#6F0B0B] border border-[#6F0B0B] px-3 py-1 hover:bg-[#6F0B0B] hover:text-white transition-all flex items-center gap-1"
                                                >
                                                    <Eye className="w-2.5 h-2.5"/> Lihat
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* MODE 2: PREVIEW DOKUMEN */}
                    <div className={`absolute inset-0 flex flex-col bg-[#1A1A1A] transition-transform duration-500 ${leftPanelMode === 'preview' ? 'translate-x-0 z-20' : '-translate-x-full z-0'}`}>
                        {/* Header Preview */}
                        <div className="h-12 bg-black flex items-center justify-between px-4 border-b border-[#333] shrink-0">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <button onClick={handleClosePreview} className="text-white hover:text-[#EF4444] transition-colors p-1" title="Kembali ke Profil">
                                    <X className="w-5 h-5"/>
                                </button>
                                <span className="w-px h-4 bg-[#333]"></span>
                                <span className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider truncate max-w-[150px]">{currentDoc?.label || 'Dokumen'}</span>
                            </div>
                            <div className="flex items-center">
                                <button onClick={() => setActiveDocIndex(i => Math.max(0, i - 1))} disabled={activeDocIndex === 0} className="p-2 text-[#666] hover:text-white disabled:opacity-20"><ChevronLeft className="w-4 h-4"/></button>
                                <span className="text-[10px] text-[#444] font-mono px-2">{activeDocIndex+1}/{availableDocs.length}</span>
                                <button onClick={() => setActiveDocIndex(i => Math.min(availableDocs.length-1, i + 1))} disabled={activeDocIndex === availableDocs.length - 1} className="p-2 text-[#666] hover:text-white disabled:opacity-20"><ChevronRight className="w-4 h-4"/></button>
                            </div>
                        </div>

                        {/* Viewer Area */}
                        <div className="flex-1 relative bg-[#222] flex items-center justify-center overflow-hidden">
                            {isLoadingFile && <Loader2 className="w-8 h-8 text-[#6F0B0B] animate-spin" />}
                            {!isLoadingFile && !isFileValid && <div className="text-center"><FileWarning className="w-8 h-8 text-[#EF4444] mx-auto mb-2"/><p className="text-xs text-[#888]">Gagal memuat file</p></div>}
                            {!isLoadingFile && isFileValid && currentDoc && (
                                <div key={currentDoc.url} className="w-full h-full flex items-center justify-center">
                                    {currentDoc.type === 'pdf' 
                                    ? <iframe src={`${currentDoc.url}#toolbar=0&navpanes=0`} className="w-full h-full border-none bg-white"/>
                                    : <div className="w-full h-full overflow-auto p-4 flex items-center justify-center"><img src={currentDoc.url} className="max-w-full shadow-2xl border-4 border-white" alt="Doc"/></div>}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* --- RIGHT PANEL: FORM PENILAIAN --- */}
                <div className={`flex-1 bg-[#FAFAFA] flex flex-col overflow-hidden relative transition-all duration-300 ease-in-out min-w-0`}>
                    {/* @ts-ignore */}
                    {results.some(r => r.calonMahasiswaId === selectedCandidate.id) ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12">
                            <div className="w-20 h-20 bg-[#F0FDF4] rounded-full flex items-center justify-center mb-6 border border-[#2F5D40]"><CheckCircle className="w-10 h-10 text-[#2F5D40]"/></div>
                            <h2 className="text-2xl font-serif text-[#1C1C1A] mb-2">Penilaian Selesai</h2>
                            <p className="text-sm text-[#4A4A48] max-w-md mx-auto mb-8">Kandidat ini telah dinilai oleh <b>{results.find(r => r.calonMahasiswaId === selectedCandidateId)?.pewawancara || 'Anda'}</b>.</p>
                            <div className="bg-white p-6 border border-[#E5E5E5] flex gap-12 shadow-sm">
                                <div><span className="text-[10px] uppercase text-[#A3A3A3] tracking-widest block mb-1">Skor Wawancara</span><span className="text-3xl font-serif font-bold text-[#6F0B0B]">{results.find(r => r.calonMahasiswaId === selectedCandidate.id)?.skorTotalWawancara}</span></div>
                                <div><span className="text-[10px] uppercase text-[#A3A3A3] tracking-widest block mb-1">Predikat</span><span className="text-xl font-serif font-bold text-[#1C1C1A] mt-1">{results.find(r => r.calonMahasiswaId === selectedCandidate.id)?.rekomendasiPredikat}</span></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full">
                            <div className="flex-1 overflow-y-auto custom-scroll p-8">
                                <div className="max-w-3xl mx-auto space-y-10">
                                    {template?.poinPenilaian.map((p: any, idx: number) => (
                                        <div key={p.poinId} className="bg-white p-6 border border-[#E5E5E5] shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:border-[#D4D4D4] transition-colors">
                                            <div className="flex gap-4 mb-4">
                                                <span className="text-lg font-serif font-bold text-[#E5E5E5]">0{idx+1}</span>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-serif text-[#1C1C1A] text-lg leading-snug mb-4 break-words">{p.pertanyaan}</p>
                                                    
                                                    {/* Control Area */}
                                                    <div className="grid grid-cols-12 gap-4">
                                                        {/* Score */}
                                                        <div className="col-span-3">
                                                            <div className="relative">
                                                                <label className="absolute -top-2 left-2 px-1 bg-white text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">Skor (0-100)</label>
                                                                <input 
                                                                    type="number" min="0" max="100" placeholder="0"
                                                                    value={formScores[p.poinId] || ''} 
                                                                    onChange={(e) => setFormScores({...formScores, [p.poinId]: parseInt(e.target.value)})} 
                                                                    className="w-full h-12 border border-[#E5E5E5] text-center font-serif text-xl focus:border-[#6F0B0B] outline-none transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                        {/* Answer */}
                                                        <div className="col-span-9">
                                                             <div className="relative h-full">
                                                                <label className="absolute -top-2 left-2 px-1 bg-white text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">Catatan / Jawaban</label>
                                                                {p.tipe === 'essay' ? (
                                                                    <textarea 
                                                                            rows={2}
                                                                            value={formAnswers[p.poinId] || ''} 
                                                                            onChange={(e) => setFormAnswers({...formAnswers, [p.poinId]: e.target.value})} 
                                                                            className="w-full h-full border border-[#E5E5E5] p-3 text-sm font-serif focus:border-[#6F0B0B] outline-none resize-none transition-colors"
                                                                            placeholder="Ketik catatan..."
                                                                    />
                                                                ) : (
                                                                    <div className="h-full border border-[#E5E5E5] px-3 flex items-center relative">
                                                                             <select 
                                                                                value={formAnswers[p.poinId] || ''} 
                                                                                onChange={(e) => setFormAnswers({...formAnswers, [p.poinId]: e.target.value})}
                                                                                className="w-full bg-transparent outline-none text-sm font-serif appearance-none z-10 cursor-pointer"
                                                                             >
                                                                                <option value="" disabled>Pilih Opsi</option>
                                                                                {p.pilihan?.map((opt:string, i:number) => <option key={i} value={opt}>{opt}</option>)}
                                                                             </select>
                                                                             <ChevronDown className="absolute right-3 w-4 h-4 text-[#A3A3A3]"/>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Final Note */}
                                    <div className="bg-[#FAFAFA] border-t border-[#E5E5E5] pt-6">
                                            <label className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest block mb-3">Catatan Umum (Opsional)</label>
                                            <textarea 
                                                value={formNote} onChange={(e) => setFormNote(e.target.value)}
                                                className="w-full p-4 border border-[#E5E5E5] bg-white text-sm font-serif outline-none focus:border-[#6F0B0B] h-24 resize-none"
                                                placeholder="Kesimpulan pewawancara..."
                                            />
                                    </div>
                                </div>
                            </div>

                            {/* Sticky Footer Action */}
                            <div className="p-6 bg-white border-t border-[#E5E5E5] shadow-[0_-5px_20px_rgba(0,0,0,0.03)] z-20 shrink-0">
                                <div className="max-w-3xl mx-auto flex items-center justify-between">
                                    <div className="flex gap-8">
                                        <div><span className="block text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">Tes Tulis (Info)</span><span className="font-serif text-lg">{calculation.tesScore || '-'}</span></div>
                                        <div className="w-px bg-[#E5E5E5]"></div>
                                        <div><span className="block text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">Skor Wawancara</span><span className="font-serif text-lg font-bold text-[#6F0B0B]">{calculation.avgWawancara}</span></div>
                                        <div className="w-px bg-[#E5E5E5]"></div>
                                        <div><span className="block text-[8px] font-bold text-[#A3A3A3] uppercase tracking-widest">Rekomendasi</span><span className="font-serif text-lg text-[#1C1C1A]">{calculation.pred}</span></div>
                                    </div>
                                    <button 
                                        onClick={handleSubmit} 
                                        disabled={isSubmitting || calculation.pred === 'Menunggu Input...'}
                                        className="bg-[#6F0B0B] text-white px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-[#500808] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSubmitting && <Loader2 className="w-3 h-3 animate-spin"/>}
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Permanen'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}