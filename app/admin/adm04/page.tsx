"use client";

import { useState, useMemo } from "react"; // Hapus useEffect
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import {
  X,
  Copy,
  Video,
  AlertCircle,
  Search,
  // CalendarDays, // Dihapus karena tidak dipakai lagi
  // Clock, // Dihapus
  CheckCircle2
} from "lucide-react";
import db from "@/data/db.json";

// --- CONFIG & UTILS ---
const COLOR_PALETTE_WINE = [
  { main: "#6F0B0B", light: "#FAFAFA", text: "#6F0B0B" },
  { main: "#8B2E2E", light: "#FAFAFA", text: "#8B2E2E" },
  { main: "#4A0404", light: "#FAFAFA", text: "#4A0404" },
  { main: "#A84444", light: "#FAFAFA", text: "#A84444" },
  { main: "#1C1C1A", light: "#FAFAFA", text: "#1C1C1A" },
];

export default function Adm04Page() {
  // --- STATE ---
  const [schedules] = useState(db.jadwalWawancara);
  const [candidates] = useState(db.calonMahasiswa);

  // Filters
  const [filterProdi, setFilterProdi] = useState("");
  const [filterPewawancara, setFilterPewawancara] = useState("");
  const [filterStaff, setFilterStaff] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // UI State
  // Hapus state currentTime
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Hapus useEffect (Clock Tick)

  // --- LOGIC: COLORS ---
  const prodiColors = useMemo(() => {
    const prodis = Array.from(
      new Set(schedules.map((s: any) => s.prodi).filter(Boolean))
    ).sort();
    const colors: Record<string, any> = {};
    prodis.forEach(
      (p: any, i) =>
        (colors[p] = COLOR_PALETTE_WINE[i % COLOR_PALETTE_WINE.length])
    );
    return colors;
  }, [schedules]);

  // --- LOGIC: CONFLICTS ---
  const conflicts = useMemo(() => {
    const events = schedules.map((s: any) => ({
      id: s.id,
      start: new Date(s.waktu).getTime(),
      end: new Date(s.waktu).getTime() + (s.durasiMenit || 60) * 60000,
      pewawancara: s.pewawancara,
      staffAdmisi: s.staffAdmisi,
    }));

    const conflictMap: Record<string, string[]> = {};

    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        
        if (a.start < b.end && b.start < a.end) {
          if (a.pewawancara === b.pewawancara) {
            (conflictMap[a.id] = conflictMap[a.id] || []).push(
              `Bentrok Pewawancara: ${b.pewawancara}`
            );
            (conflictMap[b.id] = conflictMap[b.id] || []).push(
              `Bentrok Pewawancara: ${a.pewawancara}`
            );
          }
          if (a.staffAdmisi === b.staffAdmisi) {
             (conflictMap[a.id] = conflictMap[a.id] || []).push(
              `Bentrok Staff: ${b.staffAdmisi}`
            );
            (conflictMap[b.id] = conflictMap[b.id] || []).push(
              `Bentrok Staff: ${a.staffAdmisi}`
            );
          }
        }
      }
    }
    return conflictMap;
  }, [schedules]);

  // --- LOGIC: FILTERING ---
  const filteredData = useMemo(() => {
    return schedules.filter((s: any) => {
      if (filterProdi && s.prodi !== filterProdi) return false;
      if (filterPewawancara && s.pewawancara !== filterPewawancara)
        return false;
      if (filterStaff && s.staffAdmisi !== filterStaff) return false;
      if (searchQuery) {
        const participantNames = (s.pesertaIds || [])
          .map(
            (id: string) =>
              candidates.find((m: any) => m.id === id)?.namaLengkap || ""
          )
          .join(" ")
          .toLowerCase();
        if (!participantNames.includes(searchQuery.toLowerCase())) return false;
      }
      return true;
    });
  }, [
    schedules,
    filterProdi,
    filterPewawancara,
    filterStaff,
    searchQuery,
    candidates,
  ]);

  // --- LOGIC: SORTING ---
  const sortedSchedules = useMemo(() => {
    const now = new Date();
    return [...filteredData].sort((a: any, b: any) => {
      const timeA = new Date(a.waktu).getTime();
      const timeB = new Date(b.waktu).getTime();
      const nowTime = now.getTime();

      const isAFuture = timeA >= nowTime;
      const isBFuture = timeB >= nowTime;

      if (isAFuture && !isBFuture) return -1; 
      if (!isAFuture && isBFuture) return 1;

      if (isAFuture && isBFuture) {
        return timeA - timeB;
      }
      return timeB - timeA;
    });
  }, [filteredData]);

  // --- LOGIC: CALENDAR EVENTS ---
  const calendarEvents = useMemo(() => {
    const now = new Date();
    return filteredData.map((s: any) => {
      const startTime = new Date(s.waktu);
      const endTime = new Date(
        startTime.getTime() + (s.durasiMenit || 60) * 60000
      );
      const hasConflict = conflicts[s.id]?.length > 0;
      const hasPassed = endTime < now;
      const colorObj =
        prodiColors[s.prodi] || COLOR_PALETTE_WINE[0];

      const pesertaDetails = (s.pesertaIds || []).map(
        (id: string) =>
          candidates.find((x: any) => x.id === id)?.namaLengkap || `ID ${id}`
      );

      return {
        id: s.id,
        title: s.prodi,
        start: startTime,
        end: endTime,
        backgroundColor: hasConflict
          ? "#dc2626"
          : hasPassed
          ? "#e5e5e5"
          : colorObj.main,
        borderColor: hasConflict
          ? "#dc2626"
          : hasPassed
          ? "#d4d4d4"
          : colorObj.main,
        textColor: hasPassed ? "#737373" : "#ffffff",
        classNames: hasPassed ? ["fc-event-past"] : [],
        extendedProps: {
          fullData: s,
          pesertaNames: pesertaDetails,
          conflicts: conflicts[s.id] || [],
        },
      };
    });
  }, [filteredData, conflicts, prodiColors, candidates]);

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* --- HEADER (CLEAN VERSION) --- */}
      <div className="bg-white border-b border-[#E5E5E5] px-10 py-8 sticky top-0 z-30">
        {/* Hapus flex justify-between, biarkan default block agar simple */}
        <div>
          <h1 className="text-3xl font-serif text-[#1C1C1A] mb-2">
            Timeline Wawancara
          </h1>
          <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest mt-1">
            Manajemen jadwal & Deteksi Konflik
          </p>
        </div>
        {/* Jam Digital dihapus dari sini */}
      </div>

      <div className="p-8 max-w-full">
        {/* --- FILTER BAR --- */}
        <div className="mb-8 flex flex-wrap gap-8 items-end border-b border-[#E5E5E5] pb-8">
            <div className="flex-1 min-w-[200px]">
                <label className="block text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest mb-2">
                    Cari Peserta
                </label>
                <div className="relative border-b border-[#E5E5E5] focus-within:border-[#6F0B0B] transition-colors">
                    <Search className="absolute left-0 top-1.5 w-4 h-4 text-[#8D8D8C]" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Ketik nama kandidat..." 
                        className="pl-6 w-full bg-transparent py-1.5 text-base font-serif text-[#1C1C1A] outline-none placeholder:text-[#E5E5E5]"
                    />
                </div>
            </div>
            
            <div className="w-[200px]">
                <label className="block text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest mb-2">
                    Filter Prodi
                </label>
                <select
                    value={filterProdi}
                    onChange={(e) => setFilterProdi(e.target.value)}
                    className="w-full bg-transparent border-b border-[#E5E5E5] py-1.5 text-lg font-serif text-[#1C1C1A] focus:border-[#6F0B0B] outline-none cursor-pointer"
                >
                    <option value="">Semua Prodi</option>
                    {Object.keys(prodiColors).map((p) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            <div className="w-[200px]">
                <label className="block text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest mb-2">
                    Pewawancara
                </label>
                <select
                    value={filterPewawancara}
                    onChange={(e) => setFilterPewawancara(e.target.value)}
                    className="w-full bg-transparent border-b border-[#E5E5E5] py-1.5 text-lg font-serif text-[#1C1C1A] focus:border-[#6F0B0B] outline-none cursor-pointer"
                >
                    <option value="">Semua Pewawancara</option>
                    {Array.from(new Set(schedules.map((s:any) => s.pewawancara))).sort().map((p:any) => (
                        <option key={p} value={p}>{p}</option>
                    ))}
                </select>
            </div>

            <div className="w-[200px]">
                <label className="block text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest mb-2">
                    Staff Admisi
                </label>
                <select
                    value={filterStaff}
                    onChange={(e) => setFilterStaff(e.target.value)}
                    className="w-full bg-transparent border-b border-[#E5E5E5] py-1.5 text-lg font-serif text-[#1C1C1A] focus:border-[#6F0B0B] outline-none cursor-pointer"
                >
                    <option value="">Semua Staff</option>
                    {Array.from(new Set(schedules.map((s:any) => s.staffAdmisi))).sort().map((s:any) => (
                        <option key={s} value={s}>{s}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch h-[calc(100vh-280px)] min-h-[600px]">
          
          {/* LEFT: CALENDAR */}
          <div className="lg:col-span-8 xl:col-span-8 bg-white border border-[#E5E5E5] p-6 flex flex-col h-full overflow-hidden">
            <style jsx global>{`
              .fc-toolbar-title { font-size: 1.5em !important; font-family: serif !important; color: #1C1C1A; }
              .fc-button-primary { background-color: #6F0B0B !important; border-color: #6F0B0B !important; border-radius: 0 !important; font-size: 0.8rem !important; text-transform: uppercase; letter-spacing: 0.05em; }
              .fc-button-active { background-color: #4A0404 !important; border-color: #4A0404 !important; }
              .fc-col-header-cell-cushion { color: #6F0B0B; font-weight: bold; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; padding-top: 10px !important; padding-bottom: 10px !important; }
              .fc-daygrid-day-number { color: #1C1C1A; font-family: sans-serif; font-size: 0.9rem; margin: 4px; }
              .fc-event { border: none !important; border-radius: 2px !important; box-shadow: 0 1px 2px rgba(0,0,0,0.1); cursor: pointer; }
              .fc-day-today { background-color: #FAFAFA !important; }
              .fc-view-harness { height: 100% !important; }
              .fc .fc-scroller-liquid-absolute { overflow: hidden !important; }
            `}</style>
            
            <div className="flex-grow h-full">
                 <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: "prev,next today",
                    center: "title",
                    right: "dayGridMonth,timeGridWeek,listWeek",
                  }}
                  events={calendarEvents}
                  eventClick={(info) => {
                    setSelectedEvent({
                      ...info.event.extendedProps.fullData,
                      pesertaNames: info.event.extendedProps.pesertaNames,
                      conflicts: info.event.extendedProps.conflicts,
                      start: info.event.start,
                      end: info.event.end,
                    });
                  }}
                  height="100%"
                  locale="id"
                  dayMaxEvents={3}
                />
            </div>
          </div>

          {/* RIGHT: AGENDA LIST */}
          <aside className="lg:col-span-4 xl:col-span-4 flex flex-col h-full bg-white border border-[#E5E5E5]">
             {/* Header */}
            <div className="p-6 border-b border-[#E5E5E5] bg-[#FAFAFA] flex-shrink-0">
                <h3 className="font-serif text-xl text-[#1C1C1A]">Agenda Kegiatan</h3>
                <p className="text-[10px] text-[#8D8D8C] uppercase tracking-widest mt-1">
                    {sortedSchedules.length} Sesi (Upcoming First)
                </p>
            </div>
            
            {/* Scrollable List */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scroll relative bg-white">
                {sortedSchedules.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-[#8D8D8C] text-xs italic">
                        Tidak ada jadwal ditemukan.
                    </div>
                ) : (
                    sortedSchedules.map((s: any) => {
                        const now = new Date();
                        const startObj = new Date(s.waktu);
                        const endObj = new Date(startObj.getTime() + (s.durasiMenit || 60) * 60000);
                        
                        const hasPassed = endObj < now;
                        const hasConflict = conflicts[s.id]?.length > 0;
                        
                        // Data Peserta
                        const listPeserta = (s.pesertaIds || []).map((id:string) => 
                            candidates.find((c:any)=>c.id===id)?.namaLengkap || id
                        );
                        const candidateName = listPeserta[0] || "Belum ada peserta";
                        const extraCount = listPeserta.length > 1 ? ` +${listPeserta.length - 1}` : "";

                        return (
                            <div 
                                key={s.id}
                                onClick={() => setSelectedEvent({
                                    ...s,
                                    pesertaNames: listPeserta,
                                    conflicts: conflicts[s.id] || [],
                                    start: startObj,
                                    end: endObj
                                })}
                                className={`p-6 border-b border-[#E5E5E5] hover:bg-[#FAFAFA] cursor-pointer transition-colors group relative 
                                    ${hasPassed ? 'bg-gray-50 opacity-70' : 'bg-white'} 
                                    ${hasConflict ? 'bg-red-50/50' : ''}`}
                            >
                                <div className="flex items-center gap-6">
                                    
                                    {/* 1. Date Box */}
                                    <div className="flex flex-col items-center justify-center border-r border-[#E5E5E5] pr-6 w-16 flex-shrink-0">
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${hasPassed ? 'text-[#8D8D8C]' : 'text-[#1C1C1A]'}`}>
                                            {startObj.toLocaleDateString("id-ID", { month: "short" })}
                                        </span>
                                        <span className={`text-4xl font-serif leading-none mt-1 ${hasPassed ? 'text-[#8D8D8C]' : 'text-[#6F0B0B]'}`}>
                                            {startObj.getDate()}
                                        </span>
                                    </div>

                                    {/* 2. Middle Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h5 className={`text-[10px] font-bold uppercase tracking-widest leading-tight ${hasPassed ? 'text-[#8D8D8C]' : 'text-[#6F0B0B]'}`}>
                                                {s.prodi}
                                            </h5>
                                            {hasConflict && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 animate-pulse" />}
                                            {hasPassed && !hasConflict && <CheckCircle2 className="w-4 h-4 text-green-600/50 flex-shrink-0" />}
                                        </div>
                                        <p className="text-sm text-[#1C1C1A] font-serif italic whitespace-normal">
                                            {s.pewawancara}
                                        </p>
                                        <p className="text-[10px] text-[#8D8D8C] mt-0.5">
                                            <span className="font-semibold">Staff:</span> {s.staffAdmisi}
                                        </p>
                                    </div>

                                    {/* 3. Right Info */}
                                    <div className="text-right flex-shrink-0 flex flex-col items-end pl-2">
                                         <div className="text-[10px] font-bold text-[#1C1C1A] mb-1">
                                            {startObj.toLocaleTimeString("id-ID", { hour: '2-digit', minute:'2-digit' })}
                                         </div>
                                         
                                         <div className="flex items-center justify-end gap-2">
                                            <span className="text-[#E5E5E5] text-xs">|</span>
                                            <span className="font-serif text-sm text-[#1C1C1A] font-medium max-w-[120px] truncate">
                                                {candidateName}{extraCount}
                                            </span>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
          </aside>
        </div>
      </div>

      {/* --- MODAL DETAIL --- */}
      {selectedEvent && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedEvent(null)}
          ></div>
          <div className="relative bg-white shadow-2xl max-w-2xl w-full p-0 overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header Modal */}
            <div className={`border-b p-6 flex justify-between items-start ${selectedEvent.conflicts.length > 0 ? 'bg-red-50 border-red-100' : 'bg-[#FAFAFA] border-[#E5E5E5]'}`}>
                <div>
                    <h2 className={`text-2xl font-serif mb-1 ${selectedEvent.conflicts.length > 0 ? 'text-red-900' : 'text-[#1C1C1A]'}`}>
                        Detail Sesi Wawancara
                    </h2>
                    <p className="text-[10px] text-[#8D8D8C] uppercase tracking-widest">
                        {selectedEvent.prodi} — ID: {selectedEvent.id}
                    </p>
                </div>
                <button
                    onClick={() => setSelectedEvent(null)}
                    className="text-[#8D8D8C] hover:text-[#1C1C1A] transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>
            </div>

            <div className="p-8 max-h-[70vh] overflow-y-auto">
                {/* Conflict Alert Detail */}
                {selectedEvent.conflicts.length > 0 && (
                    <div className="mb-6 bg-red-100 border border-red-200 p-4 flex gap-3 items-start text-red-900 rounded-sm">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wide mb-1">Konflik Jadwal Terdeteksi</h4>
                            <ul className="list-disc list-inside text-xs space-y-1 opacity-90">
                                {selectedEvent.conflicts.map((c:string, i:number) => <li key={i}>{c}</li>)}
                            </ul>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 mb-8">
                    <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-1">Pewawancara</label>
                        <p className="font-serif text-lg text-[#1C1C1A]">{selectedEvent.pewawancara}</p>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-1">Staff Pendamping</label>
                        <p className="font-serif text-lg text-[#1C1C1A]">{selectedEvent.staffAdmisi}</p>
                    </div>
                    <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-1">Waktu Pelaksanaan</label>
                        <p className="font-serif text-lg text-[#1C1C1A]">
                            {new Date(selectedEvent.waktu).toLocaleDateString("id-ID", { dateStyle: 'full' })}
                        </p>
                        <p className="text-sm font-sans mt-1 text-[#6F0B0B] font-medium">
                            {new Date(selectedEvent.start).toLocaleTimeString("id-ID", {timeStyle: 'short'})} - {new Date(selectedEvent.end).toLocaleTimeString("id-ID", {timeStyle: 'short'})} WIB
                        </p>
                    </div>
                     <div>
                        <label className="text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest block mb-2">Peserta ({selectedEvent.pesertaNames.length})</label>
                        <ul className="text-sm text-[#1C1C1A] space-y-1.5 border-l-2 border-[#E5E5E5] pl-3">
                            {selectedEvent.pesertaNames.map((name:string, idx:number) => (
                                <li key={idx}>{name}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="flex gap-3 pt-6 border-t border-[#E5E5E5]">
                    <a
                        href={selectedEvent.linkZoom}
                        target="_blank"
                        className="flex-1 bg-[#6F0B0B] text-white h-12 flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#500808] transition-colors"
                    >
                        <Video className="w-4 h-4" /> Buka Zoom
                    </a>
                    <button
                        onClick={() => handleCopyLink(selectedEvent.linkZoom)}
                        className="px-6 border border-[#E5E5E5] h-12 flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:bg-[#FAFAFA] text-[#1C1C1A] transition-colors"
                    >
                        <Copy className="w-4 h-4" /> {copyFeedback ? "Disalin!" : "Salin Link"}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}