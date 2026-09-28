import { jsPDF } from 'jspdf';
import { SavedInspectionRecord } from '../types/inspection';
import { batterySections, engineSections, batteryPictureFieldsConfig, enginePictureFieldsConfig } from '../data/inspectionConfig';

/**
 * Generates a clean, professional vector PDF document of the inspection form.
 * Features:
 * - 2-Column (Left & Right) large inspection photos
 * - Structured inspection checklist in formatted table
 * - Red text color for 'NOT OK', 'FAILED', and 'FAILED AND MISUSE'
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
  const contentWidth = pageWidth - margin * 2; // 186mm
  let y = margin;

  const drawHeader = (isSubsequentPage = false) => {
    // Header Bar
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(margin, y, contentWidth, isSubsequentPage ? 12 : 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isSubsequentPage ? 10 : 13);
    doc.text('EASYWAY ENGINEERING', margin + 4, y + (isSubsequentPage ? 8 : 8.5));

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    if (!isSubsequentPage) {
      doc.text(`MACHINE INSPECTION FORM (${record.machineType} TYPE)`, margin + 4, y + 16);
      doc.setFont('helvetica', 'bold');
      doc.text(`FORM NO: ${record.formNo}`, pageWidth - margin - 4, y + 8.5, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${record.inspectionDate} | Time: ${record.inspectionTime}`, pageWidth - margin - 4, y + 16, { align: 'right' });
      y += 26;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(`FORM NO: ${record.formNo}`, pageWidth - margin - 4, y + 8, { align: 'right' });
      y += 16;
    }
  };

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeader(true);
      return true;
    }
    return false;
  };

  // 1. First Page Header
  drawHeader(false);

  // 2. Machine Details Section Table
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. GENERAL MACHINE INFORMATION', margin + 3, y + 4.8);
  y += 7;

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

  const colWidth = contentWidth / 2;
  infoGrid.forEach((row, rowIdx) => {
    const rowHeight = 6;
    const isEven = rowIdx % 2 === 0;
    if (isEven) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');
    doc.line(margin + colWidth, y, margin + colWidth, y + rowHeight);

    row.forEach((col, colIdx) => {
      const startX = margin + colIdx * colWidth;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${col.label}:`, startX + 3, y + 4.2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(String(col.val || '-'), startX + 36, y + 4.2);
    });

    y += rowHeight;
  });

  y += 5;

  // 3. Checklist Items in Table Format
  const sections = record.machineType === 'ENGINE' ? engineSections : batterySections;

  checkPageBreak(15);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. INSPECTION CHECKLIST & CRITERIA', margin + 3, y + 4.8);
  y += 7;

  // Table Columns Widths
  const colNoWidth = 12;
  const colStatusWidth = 38;
  const colDescWidth = contentWidth - colNoWidth - colStatusWidth; // 136mm

  sections.forEach((sec) => {
    checkPageBreak(16);

    // Section Header Row
    doc.setFillColor(51, 65, 85); // Slate 700
    doc.rect(margin, y, contentWidth, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(sec.title.toUpperCase(), margin + 3, y + 4.5);
    y += 6.5;

    // Table Header Row for Section
    doc.setFillColor(226, 232, 240); // Slate 200
    doc.rect(margin, y, contentWidth, 5.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 5.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);
    doc.text('NO.', margin + 3, y + 3.8);
    doc.text('ITEM & INSPECTION CRITERIA', margin + colNoWidth + 3, y + 3.8);
    doc.text('STATUS', margin + colNoWidth + colDescWidth + colStatusWidth / 2, y + 3.8, { align: 'center' });
    y += 5.5;

    // Table Rows for each Item
    sec.items.forEach((item, idx) => {
      checkPageBreak(6.5);

      const rawAns = (record.checklistAnswers[item.name] || 'N/A').toUpperCase().trim();
      const isNotOk = rawAns === 'NOT OK' || rawAns.includes('NOT OK');
      const isOk = rawAns === 'OK';

      const rowHeight = 6;
      const isEven = idx % 2 === 0;

      // Row background
      if (isNotOk) {
        doc.setFillColor(254, 242, 242); // Soft red background for NOT OK rows
      } else if (isEven) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(margin, y, contentWidth, rowHeight, 'F');

      // Grid Borders
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, contentWidth, rowHeight, 'S');
      doc.line(margin + colNoWidth, y, margin + colNoWidth, y + rowHeight);
      doc.line(margin + colNoWidth + colDescWidth, y, margin + colNoWidth + colDescWidth, y + rowHeight);

      // Item Number
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`${idx + 1}`, margin + 4, y + 4.2);

      // Item Label
      doc.setTextColor(15, 23, 42);
      doc.text(item.label, margin + colNoWidth + 3, y + 4.2);

      // Status Pill / Text with strictly Red for NOT OK
      const statusCenterX = margin + colNoWidth + colDescWidth + colStatusWidth / 2;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);

      if (isNotOk) {
        // TULISAN MERAH BAGI NOT OK
        doc.setTextColor(220, 38, 38); // Pure Strong Red
        doc.text('NOT OK', statusCenterX, y + 4.2, { align: 'center' });
      } else if (isOk) {
        doc.setTextColor(22, 163, 74); // Green
        doc.text('OK', statusCenterX, y + 4.2, { align: 'center' });
      } else {
        doc.setTextColor(100, 116, 139); // Slate Gray
        doc.text(rawAns || 'N/A', statusCenterX, y + 4.2, { align: 'center' });
      }

      y += rowHeight;
    });

    // Section Remark Row
    const comment = record.sectionComments[sec.commentName];
    if (comment && comment.trim()) {
      checkPageBreak(8);
      doc.setFillColor(254, 243, 199); // Soft Amber background
      doc.rect(margin, y, contentWidth, 6, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.rect(margin, y, contentWidth, 6, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(146, 64, 14);
      doc.text('REMARK / NOTE:', margin + 3, y + 4);

      doc.setFont('helvetica', 'normal');
      doc.text(comment.trim(), margin + 28, y + 4);
      y += 6;
    }

    y += 3;
  });

  // 4. Photos Section (2-Column Grid: Gambar Kiri dan Kanan)
  const picConfigs = record.machineType === 'ENGINE' ? enginePictureFieldsConfig : batteryPictureFieldsConfig;
  const validPhotos = picConfigs.filter((c) => record.pictures && record.pictures[c.key]);

  if (validPhotos.length > 0) {
    checkPageBreak(20);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(margin, y, contentWidth, 7, 'S');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. INSPECTION PHOTOS (LEFT & RIGHT)', margin + 3, y + 4.8);
    y += 10;

    // 2-Column Side-by-Side: Left (Kiri) and Right (Kanan)
    const cols = 2;
    const colGap = 8;
    const imgWidth = (contentWidth - colGap) / cols; // 89mm
    const imgHeight = 62; // Large, clear view

    for (let i = 0; i < validPhotos.length; i++) {
      const photoCfg = validPhotos[i];
      const imgData = record.pictures[photoCfg.key];
      const colIndex = i % cols;

      if (colIndex === 0 && i !== 0) {
        y += imgHeight + 12;
      }
      checkPageBreak(imgHeight + 14);

      const xPos = margin + colIndex * (imgWidth + colGap);

      // Photo Header Tag (e.g. 1. FRONT MACHINE)
      doc.setFillColor(241, 245, 249);
      doc.rect(xPos, y, imgWidth, 5.5, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(xPos, y, imgWidth, 5.5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);
      const cleanLabel = `${i + 1}. ${photoCfg.label}`;
      doc.text(cleanLabel.length > 40 ? cleanLabel.substring(0, 38) + '...' : cleanLabel, xPos + 2.5, y + 3.8);

      // Photo Frame Box
      doc.setDrawColor(203, 213, 225);
      doc.rect(xPos, y + 5.5, imgWidth, imgHeight);

      // Render Image
      try {
        if (imgData && imgData.startsWith('data:image')) {
          doc.addImage(imgData, 'JPEG', xPos + 0.8, y + 6.3, imgWidth - 1.6, imgHeight - 1.6, undefined, 'FAST');
        } else if (imgData && imgData.startsWith('http')) {
          doc.setFontSize(7.5);
          doc.setTextColor(37, 99, 235);
          doc.text('Google Drive Photo Attached', xPos + imgWidth / 2, y + 6 + imgHeight / 2, { align: 'center' });
        }
      } catch (err) {
        console.warn('PDF image rendering notice:', err);
      }
    }

    y += imgHeight + 14;
  }

  // 5. Overall Assessment & Sign-Off Section
  checkPageBreak(42);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. OVERALL ASSESSMENT & SIGN-OFF', margin + 3, y + 4.8);
  y += 10;

  // Status Box Table
  const statusStr = (record.inspectionStatus || 'PASS').toUpperCase().trim();
  const isFailed = statusStr === 'FAILED';
  const isFailedMisuse = statusStr === 'FAILED & MISUSE' || statusStr === 'FAILED AND MISUSE';

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Overall Inspection Status:', margin + 3, y);

  if (isFailed) {
    // TULISAN MERAH BAGI FAILED
    doc.setTextColor(220, 38, 38);
    doc.text('FAILED', margin + 46, y);
  } else if (isFailedMisuse) {
    // TULISAN MERAH BAGI FAILED AND MISUSE
    doc.setTextColor(220, 38, 38);
    doc.text('FAILED & MISUSE', margin + 46, y);
  } else {
    // GREEN FOR PASS
    doc.setTextColor(22, 163, 74);
    doc.text('PASS', margin + 46, y);
  }
  y += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Inspector / Technician:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(record.technicianName || '-', margin + 46, y);
  y += 6.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Date & Time of Sign-off:', margin + 3, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${record.inspectionDate} at ${record.inspectionTime}`, margin + 46, y);
  y += 6.5;

  if (record.overallComment) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Overall Remarks:', margin + 3, y);
    y += 4.5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const splitComments = doc.splitTextToSize(record.overallComment, contentWidth - 6);
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
      `Eastway Engineering Digital MEWP Inspection - Form: ${record.formNo} - Page ${p} of ${totalPages}`,
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
