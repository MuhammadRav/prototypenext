"use client";

import React, { useEffect, useState } from "react";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Printer, Loader2 } from "lucide-react";
import { RekapPdfDocument } from "@/components/RekapPdfDocument";

interface PdfButtonProps {
  data: any[];
  filterProdi: string;
  filterStatus: string;
}

const PdfDownloadButton = ({ data, filterProdi, filterStatus }: PdfButtonProps) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 1. Cegah render di server (SSR)
  if (!isClient) {
    return (
      <button disabled className="flex items-center gap-2 bg-[#F5F5F5] text-[#8D8D8C] px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#E5E5E5] cursor-wait">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Memuat PDF Engine...</span>
      </button>
    );
  }

  // 2. Cegah render jika data kosong (menghindari crash saat mapping di PDF)
  if (!data || data.length === 0) {
    return (
      <button disabled className="flex items-center gap-2 bg-[#F5F5F5] text-[#8D8D8C] px-6 py-3 text-[10px] font-bold uppercase tracking-widest border border-[#E5E5E5] cursor-not-allowed">
        <Printer className="w-3 h-3" />
        <span>Data Kosong</span>
      </button>
    );
  }

  return (
    <PDFDownloadLink
      document={
        <RekapPdfDocument 
          data={data} 
          filterProdi={filterProdi} 
          filterStatus={filterStatus} 
        />
      }
      fileName={`Laporan_Beasiswa_${new Date().toISOString().slice(0, 10)}.pdf`}
    >
      {/* @ts-ignore - properti loading ada di render props react-pdf */}
      {({ blob, url, loading, error }) => {
        // 3. Tangani Error Render PDF
        if (error) {
            console.error("PDF Generation Error:", error);
            return <span className="text-red-500 text-[10px]">Gagal Render PDF</span>;
        }

        return (
          <button 
            disabled={loading}
            className="flex items-center gap-2 bg-[#1C1C1A] text-white px-6 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#6F0B0B] transition-all disabled:opacity-70 disabled:cursor-wait border border-transparent"
          >
            {loading ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5" /> 
                <span>Download Laporan</span>
              </>
            )}
          </button>
        );
      }}
    </PDFDownloadLink>
  );
};

export default PdfDownloadButton;