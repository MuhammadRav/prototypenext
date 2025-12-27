'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { 
  FileCheck, CalendarDays, Clock, FileBarChart, Gavel, ClipboardList, 
  UserCheck, ChevronUp, Check
} from 'lucide-react';

// Mapping Prodi ID ke Nama
const PRODI_MAP: Record<string, string> = {
  'IF': 'Teknik Informatika',
  'SI': 'Sistem Informasi',
  'HI': 'Hubungan Internasional',
  'DKV': 'Desain Komunikasi Visual',
  'SP': 'Sastra Prancis'
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // --- 1. LOGIC USER ---
  const isProdiRoute = pathname.startsWith('/prodi');
  const currentProdiId = searchParams.get('prodi_id') || 'IF'; 

  let currentUser;
  if (isProdiRoute) {
    const prodiName = PRODI_MAP[currentProdiId] || 'Teknik Informatika';
    const shortName = prodiName.replace('Teknik ', '').replace('Desain Komunikasi Visual', 'DKV');
    
    currentUser = {
      role: 'prodi',
      name: `Prodi ${shortName}`, 
      department: prodiName,
      initial: shortName.charAt(0),
      id: currentProdiId
    };
  } else {
    currentUser = {
      role: 'admin',
      name: 'Super Admin',
      department: 'Pusat Admisi',
      initial: 'S',
      id: 'ADMIN'
    };
  }

  // --- 2. LIST USER SWITCHER ---
  const availableUsers = useMemo(() => {
    const prodiUsers = Object.entries(PRODI_MAP).map(([id, name]) => ({
      type: 'prodi',
      label: `Prodi ${name.replace('Teknik ', '').replace('Desain Komunikasi Visual', 'DKV')}`,
      sub: name,
      id: id,
      path: `/prodi/p01?prodi_id=${id}`
    }));

    return [
      { type: 'admin', label: 'Super Admin', sub: 'Pusat', id: 'ADMIN', path: '/admin/adm02' },
      { type: 'header', label: '--- Akun Prodi ---' },
      ...prodiUsers
    ];
  }, []);

  // --- 3. NAVIGASI ---
  const handleSwitchUser = (user: any) => {
    setIsUserMenuOpen(false);
    if (user.type === 'header') return;
    
    if (user.type === 'prodi') {
        const targetPage = pathname.includes('/prodi') ? pathname : '/prodi/p01';
        router.push(`${targetPage}?prodi_id=${user.id}`);
    } else {
        router.push(user.path);
    }
  };

  const isActive = (path: string) => pathname.startsWith(path);
  const prodiLink = (path: string) => `${path}?prodi_id=${currentUser.id}`;

  const navItemClass = (path: string) => `
    flex items-center gap-4 px-6 py-3.5 transition-all duration-300 group relative
    ${isActive(path) 
      ? 'text-[#6f0b0b] font-medium' // Active: Burgundy
      : 'text-[#8d8d8c] hover:text-[#1c1c1a] hover:bg-[#fafafa]'} // Inactive: Stone to Charcoal
  `;

  return (
    <aside 
      className={`
        h-full bg-white border-r border-[#e5e5e5] flex flex-col relative z-30 
        flex-shrink-0 transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1.0)] overflow-hidden
        ${isCollapsed ? 'w-[80px]' : 'w-[280px]'} 
      `}
    >
      
      {/* HEADER LOGO */}
      <div className={`h-24 flex items-center border-b border-[#e5e5e5] px-6 transition-all ${isCollapsed ? 'justify-center px-0' : ''}`}>
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)} 
          className="flex items-center gap-4 cursor-pointer group w-full"
          title="Toggle Menu"
        >
          {/* Logo Box: Primary Color Background */}
          <div className="w-10 h-10 min-w-[2.5rem] bg-[#6f0b0b] text-white flex items-center justify-center font-serif text-xl shadow-sm group-hover:scale-105 transition-transform duration-300">
            U
          </div>
          
          <div className={`overflow-hidden transition-all duration-500 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 block'}`}>
            <h1 className="text-xl font-serif text-[#1c1c1a] tracking-wide leading-none">UBN<span className="text-[#6f0b0b]">.</span></h1>
            <p className="text-[9px] font-sans text-[#8d8d8c] uppercase tracking-[0.2em] mt-1">Admisi Internasional</p>
          </div>
        </div>
      </div>

      {/* NAVIGATION SCROLL AREA */}
      <nav className="flex-1 py-8 overflow-y-auto custom-scroll space-y-1">
        
        {!isCollapsed && (
          <div className="px-6 mb-4 mt-2">
            <p className="text-[9px] font-sans text-[#8d8d8c] uppercase tracking-[0.15em] border-b border-[#e5e5e5] pb-2">
              {currentUser.role === 'admin' ? 'Pusat Admisi' : 'Program Studi'}
            </p>
          </div>
        )}

        {/* ADMIN MENU */}
        {!isProdiRoute && (
          <>
            <Link href="/admin/adm02" className={navItemClass('/admin/adm02')}>
              {isActive('/admin/adm02') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <FileCheck className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Verifikasi</span>
            </Link>
            <Link href="/admin/adm03" className={navItemClass('/admin/adm03')}>
              {isActive('/admin/adm03') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <CalendarDays className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Penjadwalan</span>
            </Link>
            <Link href="/admin/adm04" className={navItemClass('/admin/adm04')}>
              {isActive('/admin/adm04') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <Clock className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Timeline</span>
            </Link>
            <Link href="/admin/adm05" className={navItemClass('/admin/adm05')}>
              {isActive('/admin/adm05') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <FileBarChart className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Rekap Data</span>
            </Link>
            <Link href="/admin/adm06" className={navItemClass('/admin/adm06')}>
              {isActive('/admin/adm06') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <Gavel className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Keputusan</span>
            </Link>
            <Link href="/admin/adm07" className={navItemClass('/admin/adm07')}>
              {isActive('/admin/adm07') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <ClipboardList className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Template</span>
            </Link>
          </>
        )}

        {/* PRODI MENU */}
        {isProdiRoute && (
          <>
            <Link href={prodiLink('/prodi/p01')} className={navItemClass('/prodi/p01')}>
              {isActive('/prodi/p01') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <CalendarDays className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Jadwal</span>
            </Link>
            <Link href={prodiLink('/prodi/p02')} className={navItemClass('/prodi/p02')}>
              {isActive('/prodi/p02') && <div className="absolute right-0 top-0 bottom-0 w-[3px] bg-[#6f0b0b]"></div>}
              <UserCheck className="w-5 h-5 flex-shrink-0 stroke-[1.5]" />
              <span className={`text-sm font-serif tracking-wide ${isCollapsed ? 'hidden' : 'block'}`}>Penilaian</span>
            </Link>
          </>
        )}
      </nav>

      {/* FOOTER PROFILE */}
      <div className="p-6 mt-auto border-t border-[#e5e5e5] bg-white relative">
        
        {/* Pop-up Menu */}
        {isUserMenuOpen && (
          <div className="absolute bottom-full left-4 right-4 mb-4 bg-white border border-[#e5e5e5] shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300 z-50">
            <div className="p-4 border-b border-[#e5e5e5] bg-[#fafafa]">
              <p className="text-[10px] font-sans text-[#8d8d8c] uppercase tracking-widest">Ganti Akun</p>
            </div>
            <div className="max-h-64 overflow-y-auto custom-scroll">
              {availableUsers.map((u, idx) => (
                u.type === 'header' ? (
                  <div key={idx} className="px-4 py-2 mt-2 text-[9px] font-bold text-[#8d8d8c] uppercase tracking-widest border-t border-[#e5e5e5]/50 bg-[#fafafa]">{u.label}</div>
                ) : (
                  <button 
                    key={idx}
                    onClick={() => handleSwitchUser(u)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between text-sm transition-colors
                      ${currentUser.id === u.id ? 'bg-[#fafafa] text-[#6f0b0b]' : 'text-[#1c1c1a] hover:bg-[#fafafa]'}`}
                  >
                    <div>
                      <div className="font-serif text-sm">{u.label}</div>
                      <div className="text-[10px] font-sans text-[#8d8d8c] uppercase tracking-wide mt-0.5">{u.sub}</div>
                    </div>
                    {currentUser.id === u.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                )
              ))}
            </div>
          </div>
        )}

        {/* Trigger Button */}
        <button 
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={`flex items-center w-full group transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}
        >
          {/* Avatar Box: BG Merah, Text Putih */}
          <div className="w-10 h-10 min-w-[2.5rem] bg-[#6f0b0b] text-white flex items-center justify-center font-serif text-sm shadow-sm group-hover:scale-105 transition-transform duration-300">
            {currentUser.initial}
          </div>
          
          <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex-1 text-left'}`}>
            <p className="text-sm font-serif text-[#1c1c1a] font-medium leading-none truncate mt-0.5">{currentUser.name}</p>
            
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1.5">
                {/* Status Dot: Merah */}
                <span className="w-1.5 h-1.5 rounded-full bg-[#6f0b0b]"></span>
                <span className="text-[10px] font-sans text-[#8d8d8c] uppercase tracking-wide leading-none">Aktif</span>
              </div>
              <ChevronUp className={`w-3 h-3 text-[#8d8d8c] transition-transform duration-300 ${isUserMenuOpen ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </button>
      </div>

    </aside>
  );
}