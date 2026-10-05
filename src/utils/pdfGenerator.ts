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
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);

      const cleanComment = comment.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const prefixWidth = 24; // mm for "REMARK / NOTE:"
      const textWidth = contentWidth - prefixWidth - 6;
      const splitComment = doc.splitTextToSize(cleanComment, textWidth);
      const lineHeight = 3.6;
      const topPadding = 4;
      const bottomPadding = 3;
      const boxHeight = Math.max(7, splitComment.length * lineHeight + topPadding + bottomPadding - 1.5);

      checkPageBreak(boxHeight + 2);

      // Expanding background & border box for any length of remarks
      doc.setFillColor(254, 243, 199); // Soft Amber background
      doc.rect(margin, y, contentWidth, boxHeight, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.rect(margin, y, contentWidth, boxHeight, 'S');

      // Prefix Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(146, 64, 14);
      doc.text('REMARK / NOTE:', margin + 3, y + topPadding);

      // Multi-line wrapped remark content
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 53, 15);
      doc.text(splitComment, margin + prefixWidth + 2, y + topPadding);

      y += boxHeight;
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

  // 5. Overall Assessment & Sign-Off Section (Structured Table Format)
  checkPageBreak(50);
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7, 'S');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('4. OVERALL ASSESSMENT & SIGN-OFF', margin + 3, y + 4.8);
  y += 7;

  // Table Columns Widths
  const labelColWidth = 52;
  const valueColWidth = contentWidth - labelColWidth; // 134mm

  // Table Header Row
  doc.setFillColor(51, 65, 85); // Slate 700
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 6, 'S');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('ASSESSMENT CRITERIA / PARAMETER', margin + 4, y + 4.2);
  doc.text('VERIFICATION DETAILS / STATUS', margin + labelColWidth + 4, y + 4.2);
  y += 6;

  const statusStr = (record.inspectionStatus || 'PASS').toUpperCase().trim();
  const isFailed = statusStr === 'FAILED';
  const isFailedMisuse = statusStr === 'FAILED & MISUSE' || statusStr === 'FAILED AND MISUSE';

  // Helper to draw a row with label column and value column
  const drawTableRow = (
    label: string,
    rowHeight: number,
    renderValue: (x: number, yPos: number, width: number, height: number) => void
  ) => {
    checkPageBreak(rowHeight + 2);

    // Label cell background (Slate 50)
    doc.setFillColor(248, 250, 252);
    doc.rect(margin, y, labelColWidth, rowHeight, 'F');

    // Value cell background (White)
    doc.setFillColor(255, 255, 255);
    doc.rect(margin + labelColWidth, y, valueColWidth, rowHeight, 'F');

    // Outer and separator borders
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowHeight, 'S');
    doc.line(margin + labelColWidth, y, margin + labelColWidth, y + rowHeight);

    // Draw label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(label, margin + 4, y + (rowHeight > 10 ? 6 : 4.5));

    // Render value
    renderValue(margin + labelColWidth, y, valueColWidth, rowHeight);

    y += rowHeight;
  };

  // Row 1: Overall Inspection Status
  drawTableRow('Overall Inspection Status', 8, (x, yPos) => {
    if (isFailed) {
      doc.setFillColor(254, 242, 242);
      doc.rect(x + 3, yPos + 1.5, 28, 5, 'F');
      doc.setDrawColor(252, 165, 165);
      doc.rect(x + 3, yPos + 1.5, 28, 5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text('FAILED', x + 5, yPos + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text('- Machine requires repair / rectifications', x + 35, yPos + 5);
    } else if (isFailedMisuse) {
      doc.setFillColor(254, 242, 242);
      doc.rect(x + 3, yPos + 1.5, 46, 5, 'F');
      doc.setDrawColor(252, 165, 165);
      doc.rect(x + 3, yPos + 1.5, 46, 5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text('FAILED & MISUSE', x + 5, yPos + 5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text('- Misuse reported / Rectification required', x + 53, yPos + 5);
    } else {
      doc.setFillColor(240, 253, 244);
      doc.rect(x + 3, yPos + 1.5, 22, 5, 'F');
      doc.setDrawColor(187, 247, 208);
      doc.rect(x + 3, yPos + 1.5, 22, 5, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(22, 163, 74);
      doc.text('PASS', x + 5, yPos + 5);
    }
  });

  // Row 2: Inspector / Technician
  drawTableRow('Inspector / Technician', 7, (x, yPos) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(record.technicianName || '-', x + 4, yPos + 4.5);
  });

  // Row 3: Date & Time of Sign-off
  drawTableRow('Date & Time of Sign-off', 7, (x, yPos) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(`${record.inspectionDate} at ${record.inspectionTime}`, x + 4, yPos + 4.5);
  });

  // Row 4: Signature
  const hasSignature = !!(record.signatureDataUrl && record.signatureDataUrl.startsWith('data:image'));
  const sigRowHeight = hasSignature ? 22 : 7.5;
  drawTableRow('Signature', sigRowHeight, (x, yPos) => {
    if (hasSignature && record.signatureDataUrl) {
      try {
        doc.addImage(record.signatureDataUrl, 'PNG', x + 4, yPos + 2, 42, 17, undefined, 'FAST');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Signed by: ${record.technicianName || 'Inspector'}`, x + 50, yPos + 9);
        doc.text(`Timestamp: ${record.inspectionDate} ${record.inspectionTime}`, x + 50, yPos + 13.5);
      } catch (err) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('-', x + 4, yPos + 4.5);
      }
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('-', x + 4, yPos + 4.8);
    }
  });

  // Row 5: Overall Remarks / Comments
  const rawRemarks = record.overallComment?.trim() || 'None / No additional remarks or recorded damage.';
  const remarksText = rawRemarks.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const splitRemarks = doc.splitTextToSize(remarksText, valueColWidth - 8);
  const remarksLineHeight = 3.6;
  const remarksTopPadding = 4;
  const remarksBottomPadding = 3;
  const remarksRowHeight = Math.max(9.5, splitRemarks.length * remarksLineHeight + remarksTopPadding + remarksBottomPadding - 1.5);

  drawTableRow('Overall Remarks', remarksRowHeight, (x, yPos) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(record.overallComment ? 15 : 100, record.overallComment ? 23 : 116, record.overallComment ? 42 : 139);
    doc.text(splitRemarks, x + 4, yPos + remarksTopPadding);
  });

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
