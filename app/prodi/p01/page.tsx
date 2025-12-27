"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import db from "@/data/db.json";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  ArrowRight,
  Search,
} from "lucide-react";

const MySwal = withReactContent(Swal);

// Mapping ID ke Nama Prodi
const PRODI_MAP: Record<string, string> = {
  IF: "Teknik Informatika",
  SI: "Sistem Informasi",
  HI: "Hubungan Internasional",
  DKV: "Desain Komunikasi Visual",
  SP: "Sastra Prancis",
};

export default function P01Page() {
  const searchParams = useSearchParams();
  const [now, setNow] = useState<Date | null>(null);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(
    null
  );
  
  // Filter Pewawancara
  const [searchInterviewer, setSearchInterviewer] = useState("");

  // 1. Tentukan Prodi Aktif
  const currentProdiId = searchParams.get("prodi_id") || "IF";
  const currentProdiName = PRODI_MAP[currentProdiId] || "Teknik Informatika";

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const { calendarEvents, listSchedules, datesWithEvents } = useMemo(() => {
    if (!now) return { calendarEvents: [], listSchedules: [], datesWithEvents: new Set() };

    // Filter Prodi
    let schedules = db.jadwalWawancara.filter(
      (s) => s.prodi === currentProdiName
    );

    // FILTER TAMBAHAN: Pencarian Pewawancara
    if (searchInterviewer) {
      const q = searchInterviewer.toLowerCase();
      schedules = schedules.filter((s) => 
        s.pewawancara.toLowerCase().includes(q)
      );
    }

    // Logic Sort (Upcoming First)
    const sortedList = [...schedules].sort((a, b) => {
      const timeA = new Date(a.waktu);
      const timeB = new Date(b.waktu);
      const endA = new Date(timeA.getTime() + (a.durasiMenit || 30) * 60000);
      const endB = new Date(timeB.getTime() + (b.durasiMenit || 30) * 60000);
      const aHasPassed = endA <= now;
      const bHasPassed = endB <= now;

      if (!aHasPassed && bHasPassed) return -1;
      if (aHasPassed && !bHasPassed) return 1;
      return aHasPassed
        ? timeB.getTime() - timeA.getTime()
        : timeA.getTime() - timeB.getTime();
    });

    // Set tanggal yang memiliki event (untuk styling background abu)
    const eventDates = new Set<string>();

    // Calendar Events
    const events = schedules.map((schedule) => {
      const start = new Date(schedule.waktu);
      const end = new Date(start.getTime() + schedule.durasiMenit * 60000);
      const hasPassed = end < now;
      
      const dateString = start.toLocaleDateString('en-CA'); 
      eventDates.add(dateString);

      const timeStr = start.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      const title = `${timeStr} ${schedule.pewawancara}`;
      
      return {
        id: schedule.id,
        title: title,
        start: start,
        end: end,
        backgroundColor: hasPassed ? "#E5E5E5" : "#6F0B0B",
        borderColor: hasPassed ? "#E5E5E5" : "#6F0B0B",
        textColor: hasPassed ? "#8C8C8C" : "#FFFFFF",
        classNames: [
          "font-sans",
          "text-xs",
          "uppercase",
          "tracking-wide",
          "px-1",
        ],
        extendedProps: { scheduleData: schedule },
      };
    });

    return { calendarEvents: events, listSchedules: sortedList, datesWithEvents: eventDates };
  }, [currentProdiName, now, searchInterviewer]);

  // --- DETAIL MODAL (DENGAN FOTO) ---
  const handleShowDetail = (schedule: any) => {
    setSelectedScheduleId(schedule.id);
    const dateObj = new Date(schedule.waktu);
    const timeStr = dateObj.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Generate HTML untuk Daftar Kandidat + FOTO
    const candidateListHtml = schedule.pesertaIds
      .map((id: string) => {
        const mhs = db.calonMahasiswa.find((c: any) => c.id === id);
        
        // Default avatar jika foto null/kosong
        const fotoUrl = mhs?.foto || "/placeholder.png"; 

        return mhs
          ? `<div class="flex justify-between items-center py-4 border-b border-[#E5E5E5] last:border-0 group animate-in fade-in duration-300">
             <div class="flex items-center gap-4">
                
                <div class="relative w-12 h-12 shrink-0">
                    <img 
                        src="${fotoUrl}" 
                        alt="${mhs.namaLengkap}" 
                        class="w-12 h-12 rounded-full object-cover border border-[#E5E5E5] shadow-sm"
                        onerror="this.src='/placeholder.png'"
                    />
                </div>

                <div>
                    <span class="block font-serif text-[#1C1C1A] text-lg leading-none mb-1 group-hover:text-[#6F0B0B] transition-colors">${mhs.namaLengkap}</span>
                    <span class="text-[10px] text-[#8D8D8C] uppercase tracking-widest font-sans flex items-center gap-1">
                        ${mhs.negaraAsal}
                        <span class="text-[#E5E5E5]">•</span>
                        ${mhs.jenisKelamin}
                    </span>
                </div>
             </div>
             
             <a href="/prodi/p02?candidate_id=${id}&prodi_id=${currentProdiId}" class="px-4 py-2 bg-white border border-[#E5E5E5] text-[9px] uppercase tracking-widest font-bold text-[#6F0B0B] hover:bg-[#6F0B0B] hover:text-white transition-all rounded-sm shadow-sm">
                Nilai Sekarang
             </a>
           </div>`
          : `<div class="text-[#8D8D8C] italic text-sm py-2">Data kandidat tidak ditemukan</div>`;
      })
      .join("");

    MySwal.fire({
      title: (
        <div className="font-serif text-3xl text-[#1C1C1A] mb-1 font-normal border-b border-[#E5E5E5] pb-6 text-left">
          Detail Sesi Wawancara
        </div>
      ),
      html: (
        <div className="text-left pt-2 font-sans">
          {/* Header Info */}
          <div className="flex items-center gap-3 mb-8 text-xs text-[#8D8D8C] uppercase tracking-widest border-b border-[#E5E5E5] pb-4">
            <span className="text-[#6F0B0B] font-bold">{schedule.prodi}</span>
            <span className="text-[#E5E5E5]">|</span>
            <span>
              {dateObj.toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          {/* Grid Pewawancara */}
          <div className="grid grid-cols-2 gap-8 mb-8 mt-4">
            <div className="bg-[#FAFAFA] p-4 border border-[#E5E5E5]">
              <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-2 font-bold">
                Pewawancara
              </p>
              <p className="font-serif text-lg text-[#1C1C1A] leading-tight">
                {schedule.pewawancara}
              </p>
            </div>
            <div className="bg-[#FAFAFA] p-4 border border-[#E5E5E5]">
              <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-2 font-bold">
                Staff Admisi
              </p>
              <p className="font-serif text-lg text-[#1C1C1A] leading-tight">
                {schedule.staffAdmisi}
              </p>
            </div>
          </div>

          {/* Waktu Blok */}
          <div className="bg-[#6F0B0B] text-white p-6 mb-8 shadow-md">
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-5 h-5 text-white/80" />
              <span className="font-serif text-xl">
                {dateObj.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm font-sans pl-8 opacity-90 font-medium">
              {timeStr} WIB
              <span className="mx-2 text-white/50">|</span>
              {schedule.durasiMenit} Menit
            </div>
          </div>

          {/* Daftar Kandidat */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-4">
                <p className="text-[10px] text-[#8D8D8C] uppercase tracking-widest font-bold">
                Daftar Kandidat ({schedule.pesertaIds.length})
                </p>
            </div>
            <div
              className="bg-white max-h-60 overflow-y-auto custom-scroll border-t border-[#E5E5E5]"
              dangerouslySetInnerHTML={{ __html: candidateListHtml }}
            />
          </div>

          {/* Tombol Zoom */}
          <div className="text-center pt-6 border-t border-[#E5E5E5]">
            <a
              href={schedule.linkZoom}
              target="_blank"
              className="inline-flex items-center gap-3 bg-[#1C1C1A] text-white font-sans text-xs font-bold py-4 px-8 uppercase tracking-widest hover:bg-[#3E3E3C] transition-colors w-full justify-center group"
            >
              <div className="p-1 bg-white/10 rounded-full"><Users className="w-3 h-3"/></div>
              Gabung Zoom Meeting
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform ml-2" />
            </a>
          </div>
        </div>
      ),
      showConfirmButton: false,
      showCloseButton: true,
      width: "600px",
      customClass: {
        popup: "rounded-none font-sans bg-white p-8",
        closeButton: "text-[#8D8D8C] hover:text-[#1C1C1A] focus:outline-none",
      },
    });
  };

  if (!now)
    return (
      <div className="flex h-screen items-center justify-center text-[#8D8D8C] font-serif italic text-lg">
        Memuat data jadwal...
      </div>
    );

  return (
    <div className="flex flex-row h-screen bg-white font-sans overflow-hidden">
      {/* ================= LEFT SIDEBAR (LIST JADWAL) ================= */}
      <aside className="w-[340px] bg-white border-r border-[#E5E5E5] flex flex-col overflow-hidden flex-shrink-0 z-20">
        
        {/* Header List */}
        <div className="p-8 pb-4 border-b border-[#E5E5E5] bg-white z-10">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl font-serif text-[#6F0B0B] mb-2">
                Jadwal
              </h2>
              <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
                {currentProdiName}
              </p>
            </div>
            <span className="text-4xl font-serif text-[#6F0B0B] leading-none">
              {listSchedules.length}
            </span>
          </div>

          {/* INPUT PENCARIAN */}
          <div className="relative">
            <Search className="absolute left-0 top-2 w-4 h-4 text-[#8D8D8C]" />
            <input
              type="text"
              value={searchInterviewer}
              onChange={(e) => setSearchInterviewer(e.target.value)}
              placeholder="Cari Pewawancara..."
              className="w-full pl-6 pr-2 py-1.5 border-b border-[#E5E5E5] text-sm font-sans focus:border-[#6F0B0B] outline-none bg-transparent placeholder:text-[#E5E5E5] transition-colors"
            />
          </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto custom-scroll">
          {listSchedules.length === 0 && (
            <div className="p-12 text-center text-[#8D8D8C] font-serif italic text-sm opacity-50">
              {searchInterviewer ? "Pewawancara tidak ditemukan." : "Tidak ada jadwal."}
            </div>
          )}

          {listSchedules.map((schedule) => {
            const dateObj = new Date(schedule.waktu);
            const isPast =
              new Date(dateObj.getTime() + schedule.durasiMenit * 60000) < now;
            const isSelected = selectedScheduleId === schedule.id;
            const timeStr = dateObj.toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });

            return (
              <div
                key={schedule.id}
                onClick={() => handleShowDetail(schedule)}
                className={`
                  group p-6 border-b border-[#E5E5E5] cursor-pointer transition-all duration-500 relative flex flex-col gap-4
                  ${isSelected ? "bg-[#FAFAFA]" : "hover:bg-[#FAFAFA]"}
                  ${isPast ? "opacity-50 grayscale" : ""}
                `}
              >
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#6F0B0B]"></div>
                )}

                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-serif text-2xl text-[#6F0B0B] leading-none">
                      {dateObj.toLocaleDateString("id-ID", { day: "2-digit" })}
                    </span>
                    <span className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-wider mt-1">
                      {dateObj.toLocaleDateString("id-ID", { month: "short" })}
                    </span>
                  </div>

                  {isPast ? (
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-[#8D8D8C] border border-[#E5E5E5] px-2 py-1">
                      Selesai
                    </span>
                  ) : (
                    <span className="text-[9px] font-sans font-bold uppercase tracking-widest text-white bg-[#6F0B0B] px-2 py-1 border border-[#6F0B0B]">
                      Aktif
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-[9px] text-[#8D8D8C] uppercase tracking-widest mb-1 font-sans">
                    Jam & Pewawancara
                  </p>
                  <h4
                    className={`text-base font-serif leading-snug transition-colors duration-300 ${
                      isSelected
                        ? "text-[#6F0B0B]"
                        : "text-[#1C1C1A] group-hover:text-[#6F0B0B]"
                    }`}
                  >
                    {timeStr} {schedule.pewawancara}
                  </h4>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-sans text-[#4A4A48] uppercase tracking-wider pt-2 border-t border-[#E5E5E5]/50">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-[#8D8D8C]" />
                    {schedule.durasiMenit} Menit
                  </div>
                  <div className="w-px h-3 bg-[#E5E5E5]"></div>
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-[#8D8D8C]" />
                    {schedule.pesertaIds.length} Kandidat
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* ================= RIGHT MAIN (CALENDAR) ================= */}
      <main className="flex-1 flex flex-col relative bg-[#FAFAFA]/30 min-w-0">
        {/* Header Calendar */}
        <div className="px-12 py-8 border-b border-[#E5E5E5] flex justify-between items-end bg-white sticky top-0 z-20">
          <div>
            <h1 className="text-3xl font-serif text-[#1C1C1A] mb-2">
              Kalender Akademik
            </h1>
            <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
              Agenda Wawancara Penerimaan Mahasiswa Baru
            </p>
          </div>
          <div className="flex gap-8 text-[10px] font-sans uppercase tracking-widest text-[#8D8D8C]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#6F0B0B] rounded-full"></span>{" "}
              Terjadwal
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-[#E5E5E5] rounded-full"></span>{" "}
              Selesai
            </div>
          </div>
        </div>

        {/* Calendar Area */}
        <div className="flex-1 overflow-y-auto custom-scroll p-12 bg-white">
          <style jsx global>{`
            .fc .fc-toolbar-title {
              font-family: var(--font-serif);
              font-size: 1.5rem;
              color: #1c1c1a;
            }
            
            /* TOMBOL HEADER KALENDER */
            .fc .fc-button {
              background-color: transparent;
              border: 1px solid #e5e5e5;
              color: #1c1c1a;
              font-family: var(--font-sans);
              font-size: 0.75rem;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 0;
              box-shadow: none !important;
              padding: 0.5rem 1rem;
            }
            .fc .fc-button:hover {
              background-color: #fafafa;
              border-color: #8d8d8c;
              color: #6f0b0b;
            }
            .fc .fc-button-primary:not(:disabled).fc-button-active {
              background-color: #6f0b0b;
              border-color: #6f0b0b;
              color: white;
            }

            /* --- 1. TOMBOL TODAY MERAH SOLID TEXT PUTIH --- */
            .fc .fc-today-button:disabled, 
            .fc .fc-today-button {
                background-color: #6F0B0B !important;
                border-color: #6F0B0B !important;
                color: #FFFFFF !important;
                opacity: 1 !important;
                font-weight: bold;
            }

            /* --- 2. HEADER HARI (MIN-SAB) ABU MUDA --- */
            .fc-col-header-cell {
              background-color: #FAFAFA !important;
              font-family: var(--font-sans);
              text-transform: uppercase;
              font-size: 0.7rem;
              letter-spacing: 0.1em;
              color: #8d8d8c;
              padding: 10px 0;
            }
            .fc-col-header-cell-cushion {
              color: #8d8d8c;
            }

            .fc-theme-standard td,
            .fc-theme-standard th {
              border-color: #e5e5e5;
            }
            
            /* --- 3. BACKGROUND HARI INI MERAH SOLID --- */
            .fc .fc-day-today {
              background-color: #6F0B0B !important;
            }

            /* --- 4. PAKSA SEMUA TEXT DI DALAM KOTAK HARI INI JADI PUTIH --- */
            /* Angka Tanggal (Pojok Kanan Atas) */
            .fc .fc-day-today .fc-daygrid-day-number {
              color: #FFFFFF !important;
              font-weight: bold;
            }

            /* Container Event */
            .fc .fc-day-today .fc-event {
              color: #FFFFFF !important;
              border-color: rgba(255,255,255,0.3) !important;
            }

            /* Isi Text Event (Jam, Judul) */
            .fc .fc-day-today .fc-event-main,
            .fc .fc-day-today .fc-event-title,
            .fc .fc-day-today .fc-event-time {
              color: #FFFFFF !important;
            }

            /* Dot event (jika ada) */
            .fc .fc-day-today .fc-daygrid-event-dot {
              border-color: #FFFFFF !important;
            }

            /* Style Event Global (Selain hari ini) */
            .fc-event {
              border: none;
              border-radius: 0;
              padding: 4px 8px;
              font-family: var(--font-sans);
              font-size: 0.75rem;
              letter-spacing: 0.05em;
              font-weight: 500;
              cursor: pointer;
            }

            .fc-list-day-cushion {
              background-color: #fafafa !important;
            }
            .fc-list-event:hover td {
              background-color: white !important;
            }
          `}</style>

          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek",
            }}
            events={calendarEvents}
            
            /* Logic background abu untuk hari yang punya jadwal */
            dayCellClassNames={(arg) => {
              const dateStr = arg.date.toLocaleDateString('en-CA');
              if (datesWithEvents.has(dateStr)) {
                return ['bg-gray-50']; 
              }
              return [];
            }}

            eventClick={(info) =>
              handleShowDetail(info.event.extendedProps.scheduleData)
            }
            height="auto"
            contentHeight="auto"
            aspectRatio={1.8}
            locale="id"
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              meridiem: false,
              hour12: false,
            }}
          />
        </div>
      </main>
    </div>
  );
}