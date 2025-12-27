"use client";

import { useState, useEffect, useMemo } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
  ArrowRight,
} from "lucide-react";

import { showLuxuryToast } from "@/lib/luxuryToast";

const MySwal = withReactContent(Swal);
const API_BASE = "/api";
const DURATION_PER_CANDIDATE = 20;
const MIN_SCHEDULE_OFFSET_MINUTES = 15;

// --- CONFIG AGAR LAYOUT TIDAK GOYANG SAAT MODAL MUNCUL ---
const swalConfig = {
  heightAuto: false,
  customClass: {
    popup: "rounded-none font-sans",
    input: "rounded-none border-stone-light focus:ring-0 focus:border-primary",
  },
};

const COUNTRY_TIMEZONE_MAP: Record<string, string> = {
  Jerman: "Europe/Berlin",
  Jepang: "Asia/Tokyo",
  Inggris: "Europe/London",
  "Amerika Serikat": "America/New_York",
  Malaysia: "Asia/Kuala_Lumpur",
  Perancis: "Europe/Paris",
  Indonesia: "Asia/Jakarta",
  Italia: "Europe/Rome",
  Cina: "Asia/Shanghai",
  DEFAULT: "Asia/Jakarta",
};

export default function Adm03Page() {
  // State Data
  const [interviewers, setInterviewers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [existingSchedules, setExistingSchedules] = useState<any[]>([]);
  const [eligibleCandidates, setEligibleCandidates] = useState<any[]>([]);

  // State Form
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedInterviewerId, setSelectedInterviewerId] = useState("");
  const [selectedStaffName, setSelectedStaffName] = useState("");
  const [zoomSuffix, setZoomSuffix] = useState("");

  // State Filter & Selection
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>(
    []
  );
  const [filterCountry, setFilterCountry] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [pRes, sRes, schRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/pewawancara`),
          fetch(`${API_BASE}/staffAdmisi`),
          fetch(`${API_BASE}/jadwalWawancara`),
          // Fetch hanya kandidat yang Lolos Berkas & Belum punya jadwal
          fetch(
            `${API_BASE}/calonMahasiswa?jalurPendaftaran=Beasiswa&statusBerkas=Lengkap&jadwalWawancaraId=null`
          ),
        ]);
        setInterviewers(await pRes.json());
        setStaffList(await sRes.json());
        setExistingSchedules(await schRes.json());
        setEligibleCandidates(await cRes.json());
      } catch (e) {
        showLuxuryToast({ type: "error", title: "Gagal memuat data server" });
      }
    };
    loadData();
  }, []);

  const convertToCountryTime = (iso: string, country: string) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: COUNTRY_TIMEZONE_MAP[country] || "Asia/Jakarta",
        timeZoneName: "short",
      });
    } catch {
      return "Error";
    }
  };

  const checkAvailability = (name: string) => {
    if (!selectedDate) return { isAvailable: true, availableAt: null };
    const selectedStart = new Date(selectedDate).getTime();
    const conflict = existingSchedules.find((s) => {
      const sStart = new Date(s.waktu).getTime();
      const sEnd = sStart + s.durasiMenit * 60000;
      return (
        (s.pewawancara === name || s.staffAdmisi === name) &&
        selectedStart >= sStart &&
        selectedStart < sEnd
      );
    });
    return {
      isAvailable: !conflict,
      availableAt: conflict
        ? new Date(
            new Date(conflict.waktu).getTime() + conflict.durasiMenit * 60000
          )
        : null,
    };
  };

  const filteredCandidates = useMemo(() => {
    if (!selectedInterviewerId) return [];
    const interviewer = interviewers.find(
      (i) => i.id === selectedInterviewerId
    );
    if (!interviewer) return [];
    return eligibleCandidates.filter((c) => {
      return (
        c.prodiPilihan === interviewer.prodi &&
        (!filterCountry || c.negaraAsal === filterCountry) &&
        (!searchQuery ||
          c.namaLengkap.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });
  }, [
    selectedInterviewerId,
    eligibleCandidates,
    filterCountry,
    searchQuery,
    interviewers,
  ]);

  const countries = useMemo(
    () =>
      Array.from(new Set(eligibleCandidates.map((c) => c.negaraAsal))).sort(),
    [eligibleCandidates]
  );
  const getMinDateTime = () =>
    new Date(
      Date.now() +
        MIN_SCHEDULE_OFFSET_MINUTES * 60000 -
        new Date().getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !selectedInterviewerId ||
      !selectedStaffName ||
      selectedCandidateIds.length === 0 ||
      !selectedDate ||
      !zoomSuffix
    ) {
      return showLuxuryToast({
        type: "warning",
        title: "Lengkapi semua form & Link Zoom",
      });
    }

    const interviewer = interviewers.find(
      (i) => i.id === selectedInterviewerId
    );
    const selectedCands = eligibleCandidates.filter((c) =>
      selectedCandidateIds.includes(c.id)
    );
    const fullZoomLink = `https://zoom.us/j/${zoomSuffix}`;

    const result = await MySwal.fire({
      ...swalConfig, // Gunakan config ini agar tidak naik
      title: (
        <div className="font-serif text-2xl text-charcoal">
          Konfirmasi Jadwal
        </div>
      ),
      html: (
        <div className="text-left text-sm font-sans text-stone space-y-2 mt-4 border-t border-stone-light pt-4">
          <p>
            <b>Pewawancara:</b> {interviewer?.nama}
          </p>
          <p>
            <b>Staff:</b> {selectedStaffName}
          </p>
          <p>
            <b>Waktu:</b> {new Date(selectedDate).toLocaleString("id-ID")}
          </p>
          <p>
            <b>Link Zoom:</b> {fullZoomLink}
          </p>
          <p>
            <b>Peserta ({selectedCandidateIds.length}):</b>
          </p>
          <ul className="list-disc text-xs max-h-24 overflow-y-auto custom-scroll pl-4">
            {selectedCands.map((c) => (
              <li key={c.id}>{c.namaLengkap}</li>
            ))}
          </ul>
        </div>
      ),
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      confirmButtonColor: "#6F0B0B",
      cancelButtonColor: "#8C8C8C",
    });

    if (result.isConfirmed) {
      const newSchedule = {
        id: `W-${Date.now()}`,
        prodi: interviewer?.prodi,
        pewawancara: interviewer?.nama,
        staffAdmisi: selectedStaffName,
        waktu: selectedDate,
        durasiMenit: selectedCandidateIds.length * DURATION_PER_CANDIDATE,
        linkZoom: fullZoomLink,
        pesertaIds: selectedCandidateIds,
      };

      try {
        // --- 1. KIRIM DATA KE BACKEND ---
        const response = await fetch(`${API_BASE}/jadwalWawancara`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newSchedule),
        });

        if (!response.ok) throw new Error("Gagal menyimpan ke server");

        // --- 2. UPDATE STATE LOKAL JIKA BERHASIL ---
        setExistingSchedules((prev) => [...prev, newSchedule]);
        
        // Hapus kandidat yang terpilih dari daftar agar tidak bisa dipilih lagi
        setEligibleCandidates((prev) =>
          prev.filter((c) => !selectedCandidateIds.includes(c.id))
        );

        setSelectedCandidateIds([]);
        setZoomSuffix("");
        setSelectedDate(""); // Reset tanggal agar form bersih

        showLuxuryToast({ type: "success", title: "Jadwal berhasil disimpan ke database!" });
      } catch (error) {
        console.error(error);
        showLuxuryToast({ type: "error", title: "Terjadi kesalahan saat menyimpan." });
      }
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans pb-20">
      {/* HEADER */}
      <div className="px-10 py-8 border-b border-[#E5E5E5] bg-white sticky top-0 z-20">
        <h1 className="text-3xl font-serif text-[#1C1C1A] mb-2">
          Penjadwalan Wawancara
        </h1>
        <p className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-widest">
          Atur jadwal sesi wawancara untuk jalur beasiswa
        </p>
      </div>

      <div className="px-10 py-10 max-w-full mx-auto">
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* KOLOM KIRI: FORM INPUT */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. INPUT WAKTU */}
            <div className="border-b border-[#E5E5E5] pb-6">
              <h3 className="font-serif text-xl text-[#1C1C1A] mb-4 flex items-center gap-3">
                <span className="w-6 h-6 border border-[#8D8D8C] text-[#8D8D8C] flex items-center justify-center text-xs font-sans">
                  1
                </span>
                Waktu Pelaksanaan
              </h3>
              <div className="relative">
                <input
                  type="datetime-local"
                  value={selectedDate}
                  min={getMinDateTime()}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedInterviewerId("");
                    setSelectedStaffName("");
                  }}
                  required
                  className="clean-input w-full text-lg font-serif text-[#6F0B0B] border-b border-[#E5E5E5] focus:border-[#6F0B0B]"
                />
              </div>
              <p className="text-[10px] text-[#8D8D8C] mt-2 flex items-center gap-1 font-sans">
                <AlertCircle className="w-3 h-3" /> Waktu dalam WIB (Minimal 15
                menit dari sekarang)
              </p>
            </div>

            {/* 2. PILIH PEWAWANCARA */}
            <div className="border-b border-[#E5E5E5] pb-6">
              <h3 className="font-serif text-xl text-[#1C1C1A] mb-4 flex items-center gap-3">
                <span className="w-6 h-6 border border-[#8D8D8C] text-[#8D8D8C] flex items-center justify-center text-xs font-sans">
                  2
                </span>
                Pewawancara
              </h3>
              {!selectedDate ? (
                <div className="text-center py-8 text-[#8D8D8C] italic font-serif text-sm bg-[#FAFAFA] border border-[#E5E5E5]">
                  Silakan tentukan waktu terlebih dahulu.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                  {interviewers.map((p) => {
                    const status = checkAvailability(p.nama);
                    return (
                      <label
                        key={p.id}
                        className={`flex justify-between items-center p-4 border transition-all cursor-pointer group ${
                          selectedInterviewerId === p.id
                            ? "border-[#6F0B0B] bg-[#6F0B0B]/5"
                            : "border-[#E5E5E5] hover:bg-[#FAFAFA]"
                        } ${
                          !status.isAvailable
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <input
                            type="radio"
                            name="pewawancara"
                            value={p.id}
                            disabled={!status.isAvailable}
                            checked={selectedInterviewerId === p.id}
                            onChange={() => setSelectedInterviewerId(p.id)}
                            className="accent-[#6F0B0B] w-4 h-4"
                          />
                          <div>
                            <div
                              className={`font-serif text-base ${
                                selectedInterviewerId === p.id
                                  ? "text-[#6F0B0B]"
                                  : "text-[#1C1C1A]"
                              }`}
                            >
                              {p.nama}
                            </div>
                            <div className="text-[10px] text-[#8D8D8C] uppercase tracking-wider font-sans">
                              {p.prodi}
                            </div>
                          </div>
                        </div>
                        {status.isAvailable ? (
                          <UserCheck className="w-4 h-4 text-[#2E7D32]" />
                        ) : (
                          <UserX className="w-4 h-4 text-[#C62828]" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 3. PILIH STAFF */}
            <div className="border-b border-[#E5E5E5] pb-6">
              <h3 className="font-serif text-xl text-[#1C1C1A] mb-4 flex items-center gap-3">
                <span className="w-6 h-6 border border-[#8D8D8C] text-[#8D8D8C] flex items-center justify-center text-xs font-sans">
                  3
                </span>
                Staff Pendamping
              </h3>
              {!selectedDate ? (
                <div className="text-center py-8 text-[#8D8D8C] italic font-serif text-sm bg-[#FAFAFA] border border-[#E5E5E5]">
                  Silakan tentukan waktu terlebih dahulu.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto pr-2 custom-scrollbar space-y-1">
                  {staffList.map((s) => {
                    const status = checkAvailability(s.nama);
                    return (
                      <label
                        key={s.id}
                        className={`flex justify-between items-center p-4 border transition-all cursor-pointer group ${
                          selectedStaffName === s.nama
                            ? "border-[#6F0B0B] bg-[#6F0B0B]/5"
                            : "border-[#E5E5E5] hover:bg-[#FAFAFA]"
                        } ${
                          !status.isAvailable
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <div className="flex gap-4 items-center">
                          <input
                            type="radio"
                            name="staff"
                            value={s.nama}
                            disabled={!status.isAvailable}
                            checked={selectedStaffName === s.nama}
                            onChange={() => setSelectedStaffName(s.nama)}
                            className="accent-[#6F0B0B] w-4 h-4"
                          />
                          <div
                            className={`font-serif text-base ${
                              selectedStaffName === s.nama
                                ? "text-[#6F0B0B]"
                                : "text-[#1C1C1A]"
                            }`}
                          >
                            {s.nama}
                          </div>
                        </div>
                        {status.isAvailable ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" />
                        ) : (
                          <UserX className="w-4 h-4 text-[#C62828]" />
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. DETAILS (ZOOM) */}
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest mb-2 block">
                  Durasi Total
                </label>
                <div className="flex items-center gap-2 text-[#1C1C1A] font-serif text-xl border-b border-[#E5E5E5] pb-2">
                  <Clock className="w-5 h-5 text-[#6F0B0B]" />
                  {selectedCandidateIds.length * DURATION_PER_CANDIDATE} Menit
                </div>
              </div>
              <div>
                <label className="text-[10px] font-sans font-bold text-[#8D8D8C] uppercase tracking-widest mb-2 block">
                  Meeting ID / Link
                </label>
                <div className="flex items-center border-b border-[#E5E5E5] pb-1 focus-within:border-[#6F0B0B] transition-colors">
                  <span className="text-[#8D8D8C] font-serif mr-2">
                    zoom.us/j/
                  </span>
                  <input
                    type="text"
                    value={zoomSuffix}
                    onChange={(e) => setZoomSuffix(e.target.value)}
                    placeholder="Masukkan ID Rapat..."
                    required
                    className="flex-1 bg-transparent outline-none font-serif text-lg text-[#1C1C1A] placeholder:text-[#E5E5E5]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* KOLOM KANAN: TABLE MAHASISWA */}
          <div className="lg:col-span-1 flex flex-col h-full">
            <div className="pb-6 mb-4">
              <h3 className="font-serif text-xl text-[#1C1C1A] mb-6 flex items-center gap-3">
                <span className="w-6 h-6 border border-[#8D8D8C] text-[#8D8D8C] flex items-center justify-center text-xs font-sans">
                  4
                </span>
                Pilih Kandidat
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <select
                    value={filterCountry}
                    onChange={(e) => setFilterCountry(e.target.value)}
                    className="clean-input w-full text-xs font-medium cursor-pointer"
                  >
                    <option value="">Semua Negara</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama..."
                    className="clean-input w-full text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto max-h-[500px] border border-[#E5E5E5]">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] sticky top-0 z-10">
                  <tr>
                    <th className="p-4 w-12 text-center border-r border-[#E5E5E5]">
                      <input
                        type="checkbox"
                        className="accent-[#6F0B0B] cursor-pointer"
                        onChange={(e) =>
                          e.target.checked
                            ? setSelectedCandidateIds(
                                filteredCandidates.map((c) => c.id)
                              )
                            : setSelectedCandidateIds([])
                        }
                        checked={
                          filteredCandidates.length > 0 &&
                          selectedCandidateIds.length ===
                            filteredCandidates.length
                        }
                        disabled={filteredCandidates.length === 0}
                      />
                    </th>
                    <th className="p-4 text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5]">
                      Kandidat
                    </th>
                    <th className="p-4 text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest border-r border-[#E5E5E5]">
                      Asal
                    </th>
                    <th className="p-4 text-[9px] font-bold text-[#8D8D8C] uppercase tracking-widest text-right">
                      Waktu Lokal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] bg-white">
                  {!selectedInterviewerId ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-[#8D8D8C] italic font-serif text-sm"
                      >
                        Pilih pewawancara terlebih dahulu.
                      </td>
                    </tr>
                  ) : filteredCandidates.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-12 text-center text-[#8D8D8C] italic font-serif text-sm"
                      >
                        Tidak ada kandidat yang tersedia.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-[#FAFAFA] transition-colors group"
                      >
                        <td className="p-4 text-center border-r border-[#E5E5E5]">
                          <input
                            type="checkbox"
                            className="accent-[#6F0B0B] cursor-pointer"
                            checked={selectedCandidateIds.includes(c.id)}
                            onChange={() =>
                              setSelectedCandidateIds((p) =>
                                p.includes(c.id)
                                  ? p.filter((x) => x !== c.id)
                                  : [...p, c.id]
                              )
                            }
                          />
                        </td>
                        <td className="p-4 border-r border-[#E5E5E5]">
                          <div className="font-serif text-lg text-[#1C1C1A] group-hover:text-[#6F0B0B] transition-colors">
                            {c.namaLengkap}
                          </div>
                          <div className="text-[10px] font-sans text-[#8D8D8C] uppercase tracking-wider">
                            {c.prodiPilihan}
                          </div>
                        </td>
                        <td className="p-4 border-r border-[#E5E5E5] text-xs text-[#1C1C1A] font-sans">
                          {c.negaraAsal}
                        </td>
                        <td className="p-4 text-right text-xs font-sans text-[#6F0B0B] font-medium">
                          {convertToCountryTime(selectedDate, c.negaraAsal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-6 mt-6 border-t border-[#E5E5E5] flex justify-between items-center">
              <div className="text-sm font-serif text-[#1C1C1A]">
                Terpilih:{" "}
                <span className="text-[#6F0B0B] font-bold text-xl ml-2">
                  {selectedCandidateIds.length}
                </span>
              </div>
              <button
                type="submit"
                disabled={selectedCandidateIds.length === 0}
                className="bg-[#6F0B0B] text-white px-8 py-3 rounded-none font-sans text-xs font-bold uppercase tracking-widest hover:bg-[#8B0D0D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 group"
              >
                Simpan Jadwal{" "}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}