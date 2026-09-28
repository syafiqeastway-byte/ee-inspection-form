import { jsPDF } from 'jspdf';
import { SavedInspectionRecord } from '../types/inspection';
import { batterySections, engineSections, batteryPictureFieldsConfig, enginePictureFieldsConfig } from '../data/inspectionConfig';

/**
 * Generates a clean, professional vector PDF document of the inspection form.
 * Returns Base64 string suitable for upload and downloading.
 */
export async function generateInspectionPdf(record: SavedInspectionRecord): Promise<{ base64: string; blob: Blob }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin) {
      doc.addPage();
      y = margin;
      drawHeader(true);
    }
  };

  const drawHeader = (isSubsequentPage = false) => {
    // Header Bar
    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(margin, y, pageWidth - margin * 2, isSubsequentPage ? 14 : 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isSubsequentPage ? 11 : 14);
    doc.text('EASTWAY ENGINEERING - MEWP INSPECTION REPORT', margin + 4, y + (isSubsequentPage ? 9 : 9));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (!isSubsequentPage) {
      doc.text(`DIGITAL INSPECTION FORM (${record.machineType} TYPE)`, margin + 4, y + 16);
      doc.setFont('helvetica', 'bold');
      doc.text(`FORM NO: ${record.formNo}`, pageWidth - margin - 4, y + 9, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${record.inspectionDate} | Time: ${record.inspectionTime}`, pageWidth - margin - 4, y + 16, { align: 'right' });
      y += 26;
    } else {
      doc.text(`FORM NO: ${record.formNo}`, pageWidth - margin - 4, y + 9, { align: 'right' });
      y += 18;
    }
  };

  // 1. First Page Header
  drawHeader(false);

  // 2. Machine Details Section
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. GENERAL MACHINE INFORMATION', margin + 3, y + 5);
  y += 10;

  const infoGrid = [
    [
      { label: 'Machine Type', val: record.machineType },
      { label: 'Form Number', val: record.formNo }
    ],
    [
      { label: 'Inspection Type', val: record.typeOfInspection },
      { label: 'PMA / Machine No', val: record.pmaNumber }
    ],
    [
      { label: 'Brand', val: record.brand },
      { label: 'Model', val: record.model }
    ],
    [
      { label: 'Serial Number', val: record.serial },
      { label: 'Hour Meter', val: record.hourMeter }
    ],
    [
      { label: 'Machine Location', val: record.machineLocation },
      { label: 'Site Location', val: record.siteLocation || 'NA' }
    ]
  ];

  doc.setFontSize(8);
  infoGrid.forEach((row) => {
    checkPageBreak(7);
    const colWidth = (pageWidth - margin * 2) / 2;

    row.forEach((col, colIdx) => {
      const startX = margin + colIdx * colWidth;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text(`${col.label}:`, startX + 2, y);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(col.val || '-'), startX + 38, y);
    });

    y += 5.5;
  });

  y += 4;

  // 3. Checklist Items
  const sections = record.machineType === 'ENGINE' ? engineSections : batterySections;

  checkPageBreak(12);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. INSPECTION CHECKLIST & CRITERIA', margin + 3, y + 5);
  y += 10;

  sections.forEach((sec) => {
    checkPageBreak(10);
    doc.setFillColor(226, 232, 240); // Slate 200
    doc.rect(margin, y, pageWidth - margin * 2, 6, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(sec.title.toUpperCase(), margin + 3, y + 4.2);
    y += 8;

    sec.items.forEach((item, idx) => {
      checkPageBreak(6);
      const ans = record.checklistAnswers[item.name] || 'N/A';
      const isNotOk = ans === 'NOT OK';

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(`${idx + 1}. ${item.label}`, margin + 3, y);

      // Status Pill
      if (ans === 'OK') {
        doc.setTextColor(16, 185, 129); // Emerald
        doc.setFont('helvetica', 'bold');
        doc.text('[ OK ]', pageWidth - margin - 22, y);
      } else if (isNotOk) {
        doc.setTextColor(239, 68, 68); // Red
        doc.setFont('helvetica', 'bold');
        doc.text('[ NOT OK ]', pageWidth - margin - 26, y);
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text(`[ ${ans} ]`, pageWidth - margin - 22, y);
      }

      y += 5;
    });

    const comment = record.sectionComments[sec.commentName];
    if (comment && comment.trim()) {
      checkPageBreak(7);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Remark: ${comment.trim()}`, margin + 6, y);
      y += 5.5;
    }

    y += 2;
  });

  // 4. Photos Section
  const picConfigs = record.machineType === 'ENGINE' ? enginePictureFieldsConfig : batteryPictureFieldsConfig;
  const validPhotos = picConfigs.filter((c) => record.pictures && record.pictures[c.key]);

  if (validPhotos.length > 0) {
    checkPageBreak(15);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. INSPECTION PHOTOS', margin + 3, y + 5);
    y += 11;

    const imgWidth = 55;
    const imgHeight = 42;
    const cols = 3;
    const colGap = ((pageWidth - margin * 2) - (imgWidth * cols)) / (cols - 1);

    for (let i = 0; i < validPhotos.length; i++) {
      const photoCfg = validPhotos[i];
      const imgData = record.pictures[photoCfg.key];

      const colIndex = i % cols;
      if (colIndex === 0 && i !== 0) {
        y += imgHeight + 12;
      }
      checkPageBreak(imgHeight + 14);

      const xPos = margin + colIndex * (imgWidth + colGap);

      // Draw photo container box
      doc.setDrawColor(203, 213, 225);
      doc.rect(xPos, y, imgWidth, imgHeight);

      try {
        if (imgData && imgData.startsWith('data:image')) {
          doc.addImage(imgData, 'JPEG', xPos + 0.5, y + 0.5, imgWidth - 1, imgHeight - 1, undefined, 'FAST');
        } else if (imgData && imgData.startsWith('http')) {
          // Note URL
          doc.setFontSize(7);
          doc.setTextColor(59, 130, 246);
          doc.text('Google Drive Photo', xPos + 4, y + imgHeight / 2);
        }
      } catch (err) {
        console.warn('PDF image embedding notice:', err);
      }

      // Label below photo
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const cleanLabel = photoCfg.label.length > 28 ? photoCfg.label.substring(0, 26) + '...' : photoCfg.label;
      doc.text(cleanLabel, xPos, y + imgHeight + 4);
    }

    y += imgHeight + 10;
  }

  // 5. Overall Sign-off Section
  checkPageBreak(40);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, pageWidth - margin * 2, 7, 'F');
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. OVERALL ASSESSMENT & SIGN-OFF', margin + 3, y + 5);
  y += 11;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Overall Status:', margin + 3, y);

  if (record.inspectionStatus === 'PASS') {
    doc.setTextColor(16, 185, 129);
    doc.text('PASS', margin + 32, y);
  } else if (record.inspectionStatus === 'FAILED') {
    doc.setTextColor(239, 68, 68);
    doc.text('FAILED', margin + 32, y);
  } else {
    doc.setTextColor(245, 158, 11);
    doc.text('FAILED & MISUSE', margin + 32, y);
  }
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Technician Name:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(record.technicianName, margin + 32, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Date & Time:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.inspectionDate} at ${record.inspectionTime}`, margin + 32, y);
  y += 6;

  if (record.overallComment) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Overall Remarks:', margin + 3, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitComments = doc.splitTextToSize(record.overallComment, pageWidth - margin * 2 - 6);
    doc.text(splitComments, margin + 3, y);
    y += splitComments.length * 4.5;
  }

  // Footer Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Eastway Engineering Digital Inspection - Form: ${record.formNo} - Page ${p} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: 'center' }
    );
  }

  const pdfOutput = doc.output('datauristring');
  const blob = doc.output('blob');

  return {
    base64: pdfOutput,
    blob
  };
}
