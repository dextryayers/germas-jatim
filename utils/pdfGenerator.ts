import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Cluster, LaporanTemplate } from './formStore';

// --- CONFIG ---
const COLORS = {
  primary: [22, 163, 74], // green-600
  primaryDark: [20, 83, 45], // green-900
  secondary: [240, 253, 244], // green-50
  text: [30, 41, 59], // slate-800
  textLight: [100, 116, 139], // slate-500
  white: [255, 255, 255],
  grayBg: [248, 250, 252], // slate-50
  border: [226, 232, 240], // slate-200
};

// --- FILENAME HELPERS ---

// Normalize text to be safe for filenames: remove accents, keep alnum/_/-, collapse spaces
const normalizeForFilename = (text: string): string => {
  if (!text) return '';

  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-zA-Z0-9-_]+/g, '_') // replace non-safe chars with underscore
    .replace(/_+/g, '_') // collapse multiple underscores
    .replace(/^_+|_+$/g, ''); // trim underscores at ends
};

const buildOriginLabelForFilename = (
  originRegencyName?: string | null,
  originDistrictName?: string | null,
  originVillageName?: string | null,
): string | null => {
  const parts: string[] = [];

  if (originRegencyName) {
    parts.push(`KabKota_${originRegencyName}`);
  }
  if (originDistrictName) {
    parts.push(`Kec_${originDistrictName}`);
  }
  if (originVillageName) {
    parts.push(`DesaKel_${originVillageName}`);
  }

  if (parts.length === 0) return null;

  return normalizeForFilename(parts.join('_')) || null;
};

const buildEvaluasiFilename = (instansiData: any): string => {
  const namaInstansiRaw = instansiData?.nama || 'Instansi';

  const originLabel = buildOriginLabelForFilename(
    instansiData?.originRegencyName,
    instansiData?.originDistrictName,
    instansiData?.originVillageName,
  );

  const instansiPart = normalizeForFilename(String(namaInstansiRaw)).substring(0, 40) || 'Instansi';

  // Jika asal wilayah ada, pakai sebagai bagian utama nama file; jika tidak, fallback ke tingkat
  const tingkatRaw = instansiData?.tingkat || null;
  const tingkatPart = normalizeForFilename(String(tingkatRaw ?? '')) || null;

  const locationPart = originLabel || tingkatPart || 'Lokasi_Tidak_Diketahui';

  return `Evaluasi_${instansiPart}_${locationPart}.pdf`;
};

const buildLaporanFilename = (
  template: LaporanTemplate,
  originRegencyName: string | undefined,
  year: string,
): string => {
  const namaInstansiRaw = (template as any)?.instansiName || 'Instansi';
  const instansiPart = normalizeForFilename(String(namaInstansiRaw)).substring(0, 40) || 'Instansi';

  const originPart = originRegencyName
    ? normalizeForFilename(`KabKota_${originRegencyName}`)
    : null;

  const yearPart = normalizeForFilename(String(year)) || new Date().getFullYear().toString();

  return `Laporan_${instansiPart}_${originPart || 'Lokasi_Tidak_Diketahui'}_${yearPart}.pdf`;
};

// Helper: Header Banner sederhana tanpa logo (hanya background hijau + judul + subtitle)
const addHeader = async (doc: jsPDF, title: string, subtitle: string) => {
  const pageWidth = doc.internal.pageSize.width;

  // Latar belakang hijau
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), pageWidth / 2, 18, { align: 'center' });

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, pageWidth / 2, 26, { align: 'center' });
};

// Helper: Footer with Page Number
const addFooter = (doc: jsPDF) => {
  const pageCount = doc.getNumberOfPages();
  const width = doc.internal.pageSize.width;
  const height = doc.internal.pageSize.height;
  
  doc.setFontSize(8);
  doc.setTextColor(150);
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const text = `Halaman ${i} dari ${pageCount} | Dicetak pada: ${new Date().toLocaleString('id-ID')}`;
    doc.text(text, width / 2, height - 10, { align: 'center' });
  }
};

// Helper: Section Title with Text Wrapping
const addSectionTitle = (doc: jsPDF, text: string, y: number) => {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primaryDark[0], COLORS.primaryDark[1], COLORS.primaryDark[2]);
  
  const pageWidth = doc.internal.pageSize.width;
  const maxWidth = pageWidth - 40; // Allow margins
  const textLines = doc.splitTextToSize(text, maxWidth);
  const lineHeight = 6;
  const blockHeight = textLines.length * lineHeight;

  // Small colored rect marker (adjust height based on text lines)
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(14, y - 4, 3, blockHeight - 2, 'F');
  
  doc.text(textLines, 20, y);
  return y + blockHeight + 6; // Return new Y position with padding
};

// --- GENERATOR PDF EVALUASI ---
export const generateEvaluasiPDF = async (
  instansiData: any,
  score: number,
  category: any,
  clusters: Cluster[],
  answers: Record<number, number>,
  remarks: Record<number, string>
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // 1. Header
  const evalYear =
    (instansiData && (instansiData.reportYear || instansiData.report_year)) ||
    new Date().getFullYear().toString();
  await addHeader(
    doc,
    "Hasil Evaluasi Germas",
    `Tatanan Tempat Kerja - Provinsi Jawa Timur - Tahun ${String(evalYear)}`,
  );

  let currentY = 50;

  // 2. Info Instansi (Box Style)
  doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
  doc.setFillColor(COLORS.grayBg[0], COLORS.grayBg[1], COLORS.grayBg[2]);
  // Sedikit diperbesar agar teks Asal Wilayah yang panjang tetap nyaman terbaca
  doc.roundedRect(14, 42, pageWidth - 28, 65, 3, 3, 'FD');

  currentY = 50;
  
  // Title inside box
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("IDENTITAS INSTANSI", 20, currentY);
  doc.line(20, currentY + 2, pageWidth - 20, currentY + 2); // Underline
  
  currentY += 10;
  
  const addInfoRow = (label: string, value: string, xOffset: number = 0, yOverride?: number) => {
      const yPos = yOverride || currentY;
      const xPos = 20 + xOffset;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.text[0], COLORS.text[1], COLORS.text[2]);
      doc.text(label, xPos, yPos);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      // Handle multiline text for long values
      const splitText = doc.splitTextToSize(value || '-', 80);
      doc.text(splitText, xPos, yPos + 5);
      
      return splitText.length * 4; // Return height used
  };

  // Left Column
  addInfoRow("Nama Instansi", instansiData.nama);
  addInfoRow("Alamat", instansiData.alamat, 0, currentY + 12);
  addInfoRow("Tingkat", instansiData.tingkat, 0, currentY + 24);

  // Origin (if available, use names only; do not expose numeric IDs)
  const originParts: string[] = [];
  if (instansiData.originRegencyName) {
    originParts.push(`Kab/Kota: ${instansiData.originRegencyName}`);
  }
  if (instansiData.originDistrictName) {
    originParts.push(`Kecamatan: ${instansiData.originDistrictName}`);
  }
  if (instansiData.originVillageName) {
    originParts.push(`Desa/Kel: ${instansiData.originVillageName}`);
  }

  if (originParts.length > 0) {
    addInfoRow("Asal Wilayah", originParts.join(' | '), 0, currentY + 36);
  }

  // Right Column
  addInfoRow("Pejabat/Pengelola", instansiData.pejabat, 100);
  addInfoRow("Jumlah Pegawai", `L: ${instansiData.jmlLaki} / P: ${instansiData.jmlPerempuan}`, 100, currentY + 12);
  addInfoRow("Tanggal Evaluasi", instansiData.tanggal || new Date().toLocaleDateString('id-ID'), 100, currentY + 24);

  // Geser anchor setelah card identitas sedikit ke bawah mengikuti tinggi box baru
  currentY = 120;

  // 3. Score Section
  // Background Box for Score
  doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 115, pageWidth - 28, 25, 3, 3, 'FD');

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.text("TOTAL SKOR:", 25, 132);

  doc.setFontSize(24);
  doc.setTextColor(0, 0, 0);
  doc.text(score.toString(), 70, 133);

  // Category Badge representation
  let badgeColor = [22, 163, 74]; // Green
  if (category.label === 'Cukup') badgeColor = [202, 138, 4]; // Yellow
  if (category.label === 'Kurang') badgeColor = [220, 38, 38]; // Red

  doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
  doc.roundedRect(140, 120, 50, 15, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.text(category.label || '', 165, 130, { align: 'center' });

  currentY = 155;

  // 4. Tables per Cluster
  clusters.forEach(cluster => {
      // Check page break
      if (currentY > 250) {
          doc.addPage();
          currentY = 20; 
      }
      
      currentY = addSectionTitle(doc, cluster.title, currentY);

      const tableBody = cluster.questions.map((q, idx) => {
          const ans = answers[q.id];
          const ansText = ans === 1 ? 'Ya' : (ans === 0 ? 'Tidak' : '-');
          return [
              (idx + 1).toString(),
              q.text,
              ansText,
              remarks[q.id] || ''
          ];
      });

      autoTable(doc, {
          startY: currentY,
          head: [['No', 'Indikator', 'Hasil', 'Keterangan']],
          body: tableBody,
          theme: 'grid',
          headStyles: { 
              fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]], 
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center'
          },
          columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 'auto' },
              2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
              3: { cellWidth: 40 }
          },
          styles: {
              fontSize: 9,
              cellPadding: 3,
              lineColor: [200, 200, 200],
              lineWidth: 0.1
          },
          alternateRowStyles: {
              fillColor: [248, 250, 252]
          },
          margin: { left: 14, right: 14 }
      });

      // @ts-ignore
      currentY = doc.lastAutoTable.finalY + 15;
  });

  addFooter(doc);
  const filename = buildEvaluasiFilename(instansiData);
  doc.save(filename);
};

// --- GENERATOR PDF LAPORAN ---
export const generateLaporanPDF = async (
  template: LaporanTemplate,
  originLabel: string | undefined,
  laporanInputs: Record<string, any>,
  year: string = new Date().getFullYear().toString(),
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // 1. Header — sertakan asal wilayah di judul jika tersedia
  const locationTitle = originLabel || 'Provinsi Jawa Timur';
  await addHeader(doc, "Laporan Kegiatan Germas", `${locationTitle} - Tahun ${year} - ${template.instansiName}`);

  let currentY = 50;

  // 2. Metadata Simple
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');

  const isKabKota = !!originLabel && !originLabel.toUpperCase().includes('PROVINSI');
  doc.text(`Tingkat: ${isKabKota ? 'Kabupaten/Kota' : 'Provinsi Jawa Timur'}`, 14, 45);

  // Asal wilayah (jika tersedia)
  if (originLabel) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Asal Wilayah Instansi: ${originLabel}`, 14, 50);
  }
  
  template.sections.forEach((section, idx) => {
      if (currentY > 230) {
          doc.addPage();
          currentY = 20;
      }

      // Section Container style
      doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
      
      // Section Title with Letter Numbering (A, B, C...)
      const letter = String.fromCharCode(65 + idx);
      currentY = addSectionTitle(doc, `${letter}. ${section.title}`, currentY);

      // Indicator - Increased Font Size
      doc.setFontSize(11); // Increased from 9
      doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
      doc.setFont('helvetica', 'italic');
      
      const indicatorText = `Indikator: ${section.indicator}`;
      const splitIndicator = doc.splitTextToSize(indicatorText, pageWidth - 28);
      doc.text(splitIndicator, 14, currentY);
      
      // Adjust vertical space based on indicator length (approx 6 units per line for size 11)
      currentY += (splitIndicator.length * 6) + 4;

      // Prepare Table Data
      const tableHead = [];
      const tableBodyRow = [];

      if (section.hasTarget) {
          tableHead.push(`Target Thn ${year}`, 'Capaian Sem 1', 'Capaian Sem 2');
          tableBodyRow.push(
              laporanInputs[`${section.id}-target-year`] || '-',
              laporanInputs[`${section.id}-target-sem1`] || '-',
              laporanInputs[`${section.id}-target-sem2`] || '-'
          );
      }
      
      if (section.hasBudget) {
          tableHead.push(`Anggaran Thn ${year}`, 'Realisasi Sem 1', 'Realisasi Sem 2');
          tableBodyRow.push(
              laporanInputs[`${section.id}-budget-year`] || '-',
              laporanInputs[`${section.id}-budget-sem1`] || '-',
              laporanInputs[`${section.id}-budget-sem2`] || '-'
          );
      }

      if (tableHead.length > 0) {
          autoTable(doc, {
              startY: currentY,
              head: [tableHead],
              body: [tableBodyRow],
              theme: 'grid',
              headStyles: { 
                  fillColor: [COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]], 
                  textColor: 255, 
                  fontStyle: 'bold',
                  halign: 'center'
              },
              styles: { 
                  fontSize: 10, 
                  cellPadding: 4, 
                  halign: 'center',
                  lineColor: [200, 200, 200],
                  lineWidth: 0.1
              },
              margin: { left: 14, right: 14 }
          });
          // @ts-ignore
          currentY = doc.lastAutoTable.finalY + 15;
      } else {
          currentY += 5;
      }
  });

  addFooter(doc);
  const filename = buildLaporanFilename(template, originLabel, year);
  doc.save(filename);
};