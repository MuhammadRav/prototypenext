/* components/RekapPdfDocument.tsx */
import React from 'react';
import { Page, Text, View, Document, StyleSheet } from '@react-pdf/renderer';

// --- STYLES ---
const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    color: '#1C1C1A',
  },
  
  // Header
  headerContainer: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#1C1C1A',
    textAlign: 'center',
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 16,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    color: '#000000',
  },
  subtitle: {
    fontSize: 9,
    fontFamily: 'Times-Roman',
    color: '#555',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  
  // Summary (Tanpa GAP - Gunakan Margin manual)
  summarySection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5E5',
  },
  summaryItem: {
    flexDirection: 'column',
    alignItems: 'center',
    marginHorizontal: 15, // Pengganti gap
  },
  summaryLabel: {
    fontSize: 7,
    fontFamily: 'Times-Bold',
    color: '#8D8D8C',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 11,
    fontFamily: 'Times-Roman',
    color: '#1C1C1A',
  },
  verticalLine: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E5E5',
  },
  
  // Table
  table: {
    display: 'flex',
    width: '100%',
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: '#000000',
    minHeight: 25,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#F0F0F0',
    minHeight: 25,
    alignItems: 'center',
    paddingVertical: 4,
  },
  
  // Columns
  colNo:        { width: '5%',  textAlign: 'center' },
  colNama:      { width: '22%', textAlign: 'left', paddingLeft: 5 },
  colGender:    { width: '8%',  textAlign: 'center' },
  colNegara:    { width: '13%', textAlign: 'center' },
  colProdi:     { width: '20%', textAlign: 'left', paddingLeft: 5 },
  colNilai:     { width: '10%', textAlign: 'center' },
  colWawancara: { width: '10%', textAlign: 'center' },
  colStatus:    { width: '12%', textAlign: 'center' },

  // Utils
  headerText: { 
    fontSize: 7, 
    fontFamily: 'Times-Bold', 
    letterSpacing: 1, 
  },
  cellText: { 
    fontSize: 9, 
    fontFamily: 'Times-Roman',
  },
  statusText: { 
    fontSize: 7, 
    fontFamily: 'Times-Bold', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  
  // Footer
  footer: {
    position: 'absolute', 
    bottom: 30, 
    left: 40, 
    right: 40, 
    borderTopWidth: 0.5,
    borderTopColor: '#1C1C1A',
    paddingTop: 10,
    fontSize: 8, 
    color: '#555', 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    fontFamily: 'Times-Italic'
  }
});

interface RekapPdfProps {
  data: any[];
  filterProdi: string;
  filterStatus: string;
}

export const RekapPdfDocument = ({ data = [], filterProdi, filterStatus }: RekapPdfProps) => {
  // Safe logic jika data kosong
  const safeData = Array.isArray(data) ? data : [];
  const total = safeData.length;
  
  const gender = safeData.reduce(
    (acc, c) => {
      if (c.jenisKelamin === "Pria") acc.p++;
      else if (c.jenisKelamin === "Wanita") acc.w++;
      return acc;
    },
    { p: 0, w: 0 }
  );

  const countries = safeData.reduce((acc: any, c) => {
    if (c.negaraAsal) {
      acc[c.negaraAsal] = (acc[c.negaraAsal] || 0) + 1;
    }
    return acc;
  }, {});

  const topCountries = Object.entries(countries)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 3)
    .map(([n, c]) => `${n} (${c})`)
    .join(", ");

  return (
    <Document>
      <Page size="A4" orientation="portrait" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Rekapitulasi Penerimaan</Text>
          <Text style={styles.subtitle}>
            JALUR BEASISWA  •  {filterProdi === 'semua' ? 'SEMUA PRODI' : filterProdi.toUpperCase()}  •  TAHUN 2025
          </Text>
        </View>

        {/* Summary (Tanpa Gap) */}
        <View style={styles.summarySection}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Kandidat</Text>
            <Text style={styles.summaryValue}>{total}</Text>
          </View>
          
          <View style={styles.verticalLine} /> 

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ratio Gender</Text>
            <Text style={styles.summaryValue}>
              {gender.p} Pria <Text style={{color: '#E5E5E5'}}>|</Text> {gender.w} Wanita
            </Text>
          </View>

          <View style={styles.verticalLine} />

          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Dominasi Negara</Text>
            <Text style={styles.summaryValue}>{topCountries || "-"}</Text>
          </View>
        </View>

        {/* Table */}
        <View style={styles.table}>
          <View style={styles.tableHeaderRow} fixed>
            <View style={styles.colNo}><Text style={styles.headerText}>NO</Text></View>
            <View style={styles.colNama}><Text style={styles.headerText}>KANDIDAT</Text></View>
            <View style={styles.colGender}><Text style={styles.headerText}>L/P</Text></View>
            <View style={styles.colNegara}><Text style={styles.headerText}>NEGARA</Text></View>
            <View style={styles.colProdi}><Text style={styles.headerText}>PROGRAM STUDI</Text></View>
            <View style={styles.colNilai}><Text style={styles.headerText}>TES</Text></View>
            <View style={styles.colWawancara}><Text style={styles.headerText}>IVW</Text></View>
            <View style={styles.colStatus}><Text style={styles.headerText}>STATUS</Text></View>
          </View>
          
          {safeData.map((mhs, index) => {
             // Safe access properties
             const nilaiTes = mhs.tahapanSeleksi?.tesPengetahuan?.nilai ?? "-";
             const nilaiWawancara = mhs.hasilWawancara?.skorTotalWawancara ?? "-";

             return (
              <View 
                style={styles.tableRow} 
                key={index}
                wrap={false}
              >
                <View style={styles.colNo}><Text style={styles.cellText}>{index + 1}</Text></View>
                <View style={styles.colNama}><Text style={styles.cellText}>{mhs.namaLengkap}</Text></View>
                <View style={styles.colGender}><Text style={styles.cellText}>{mhs.jenisKelamin === 'Pria' ? 'L' : 'P'}</Text></View>
                <View style={styles.colNegara}><Text style={styles.cellText}>{mhs.negaraAsal}</Text></View>
                <View style={styles.colProdi}><Text style={styles.cellText}>{mhs.prodiPilihan}</Text></View>
                <View style={styles.colNilai}><Text style={styles.cellText}>{nilaiTes}</Text></View>
                <View style={styles.colWawancara}><Text style={styles.cellText}>{nilaiWawancara}</Text></View>
                <View style={styles.colStatus}>
                  <Text style={{
                      ...styles.statusText,
                      color: mhs.statusAkhir === 'Diterima' ? '#1E3A8A' : 
                             mhs.statusAkhir === 'Ditolak' ? '#6F0B0B' : '#555'
                  }}>
                    {mhs.statusAkhir || "PROSES"}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Dicetak: {new Date().toLocaleString('id-ID')}</Text>
          <Text render={({ pageNumber, totalPages }) => `Halaman ${pageNumber} / ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
};