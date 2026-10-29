import { MachineType, PmaRecord, SavedInspectionRecord, ChecklistStatus } from '../types/inspection';
import { getStoredPmaDatabase } from '../data/pmaDatabase';
import { generateNextFormNumber } from '../utils/formNumberGenerator';
import {
  batterySections,
  engineSections,
  batteryPictureFieldsConfig,
  enginePictureFieldsConfig
} from '../data/inspectionConfig';

// Google Sheet IDs & Configuration
export const SPREADSHEET_ID = '1jJXC-sS3ONnnFX-2MoDCkjxHm-Mh9Pr1RWuXEtangCc';
export const SHEET_NAME_BATTERY = 'BATTERY TYPE';
export const SHEET_NAME_ENGINE = 'ENGINE TYPE';

// Target PDF Columns in Google Sheet
export const BATTERY_PDF_COLUMN_LETTER = 'CJ'; // Column 88
export const ENGINE_PDF_COLUMN_LETTER = 'CR';  // Column 96

// Google Drive Folder IDs
export const DRIVE_PHOTO_FOLDER_ID = '1qFBW8DG4zGiKiYEpmpN5be8n7lMWE8wC';
export const DRIVE_BATTERY_PDF_FOLDER_ID = '1h7uOhq76kforMFskOmI3w6OI-dbUFBbp';
export const DRIVE_ENGINE_PDF_FOLDER_ID = '1h5R0mlozLV76MrL9fb4mZzf8Xap6hOv8';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbyonS0dXMu3Gw6QJNbHL7-lR-t_vB79Hu4NOzP9OC4zR2WWziAUo5AxCCUXAdZIqee6/exec';

// Configurable Webhook URL for Google Apps Script Web App Deployment
export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('eastway_apps_script_url');
    // If user has old default cached in localStorage, automatically upgrade to new URL
    if (
      local &&
      (local.includes('AKfycbwg3mNH3xYeeaMlsTdR') ||
        local.includes('AKfycbxWHZqtd22rhJqs0BQNxTq8DKl5kCWMqubPYzW7E7n_7WQxmKqVESTTOzo28PwVJwny') ||
        local.trim() === '')
    ) {
      localStorage.setItem('eastway_apps_script_url', DEFAULT_APPS_SCRIPT_URL);
      return DEFAULT_APPS_SCRIPT_URL;
    }
    if (local && local.trim()) return local.trim();
  }
  const envUrl = ((import.meta as any).env?.VITE_APPS_SCRIPT_URL || '').trim();
  if (envUrl) return envUrl;
  return DEFAULT_APPS_SCRIPT_URL;
}

export function setAppsScriptUrl(url: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('eastway_apps_script_url', url.trim());
  }
}

// Declare google global if loaded in Apps Script context
declare const google: any;

export function hasGoogleScriptRun(): boolean {
  return (
    typeof google !== 'undefined' &&
    typeof google.script !== 'undefined' &&
    typeof google.script.run !== 'undefined'
  );
}

/**
 * Fetches the next available form number from Google Sheet (Spreadsheet ID: 1jJXC-sS3ONnnFX-2MoDCkjxHm-Mh9Pr1RWuXEtangCc)
 * Reads the last row / highest existing form number from sheet 'ENGINE TYPE' or 'BATTERY TYPE'.
 */
export async function fetchBackendFormNo(machineType: MachineType): Promise<string> {
  const isEngine = machineType === 'ENGINE';
  const primarySheetName = isEngine ? 'ENGINE TYPE' : 'BATTERY TYPE';
  const fallbackSheetName = isEngine ? 'ENGINE' : 'BATTERY';
  const prefix = isEngine ? 'EE-IFE-' : 'EE-IFB-';

  // 1. Direct Google Sheets GViz CSV queries (Fastest, zero CORS/redirect issues)
  const candidateSheets = [primarySheetName, fallbackSheetName];
  for (const sheetCandidate of candidateSheets) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetCandidate)}&t=${Date.now()}`;
      const res = await fetch(gvizUrl, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const csvText = await res.text();
        const lines = csvText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
        let maxNum = 0;
        let validDataRowCount = 0;

        // Skip header row (index 0)
        for (let i = 1; i < lines.length; i++) {
          const rawRow = lines[i];
          if (!rawRow) continue;
          validDataRowCount++;

          const cols = rawRow.split(',').map((c) => c.replace(/^["']|["']$/g, '').trim().toUpperCase());
          // Check all columns in the row for prefix matching (e.g. EE-IFE-001, EE-IFE-002)
          for (const col of cols) {
            if (col.startsWith(prefix)) {
              const numPart = col.replace(prefix, '').trim();
              const parsed = parseInt(numPart, 10);
              if (!isNaN(parsed) && parsed > maxNum) {
                maxNum = parsed;
              }
            }
          }
        }

        if (maxNum > 0) {
          const next = maxNum + 1;
          return `${prefix}${String(next).padStart(3, '0')}`;
        } else if (validDataRowCount > 0) {
          const next = validDataRowCount + 1;
          return `${prefix}${String(next).padStart(3, '0')}`;
        }
      }
    } catch {
      // Continue to next sheet candidate
    }
  }

  // 2. If embedded in Google Apps Script HtmlService
  if (hasGoogleScriptRun()) {
    try {
      const serverNum: string = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res: string) => resolve(res))
          .withFailureHandler((err: any) => reject(err))
          .getLatestFormNumber(primarySheetName, prefix);
      });
      if (serverNum && serverNum.startsWith(prefix)) {
        return serverNum;
      }
    } catch {
      // Ignore
    }
  }

  // 3. Fetch via Apps Script Web App if URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const resp = await fetch(
        `${endpoint}?action=getLatestFormNumber&sheetName=${encodeURIComponent(primarySheetName)}&prefix=${encodeURIComponent(prefix)}&spreadsheetId=${encodeURIComponent(SPREADSHEET_ID)}&_t=${Date.now()}`,
        { mode: 'cors', redirect: 'follow' }
      );
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.formNo) {
          return json.formNo;
        }
      }
    } catch {
      // Silent fallback
    }
  }

  return generateNextFormNumber(machineType);
}

/**
 * Fetches PMA fleet data list from Google Sheet or local database
 */
export async function fetchBackendPmaList(): Promise<string[]> {
  // 1. Google Apps Script environment
  if (hasGoogleScriptRun()) {
    try {
      const pmas: string[] = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res: string[]) => resolve(res))
          .withFailureHandler((err: any) => reject(err))
          .getPmaList();
      });
      if (Array.isArray(pmas) && pmas.length > 0) {
        return pmas;
      }
    } catch (e) {
      console.warn('Apps Script PMA list error:', e);
    }
  }

  // 2. Fetch via Web App
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const resp = await fetch(`${endpoint}?action=getPmaList&spreadsheetId=${encodeURIComponent(SPREADSHEET_ID)}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data && Array.isArray(data.pmas) && data.pmas.length > 0) {
          return data.pmas;
        }
      }
    } catch (e) {
      // Continue to fallback
    }
  }

  const defaultPmas = getStoredPmaDatabase().map((i) => i.pmaNumber);
  return defaultPmas;
}

/**
 * Searches for specific PMA Number from Google Sheet or local PMA database
 */
export async function searchBackendPmaNumber(
  pmaNumber: string
): Promise<{ found: boolean; brand?: string; model?: string; serial?: string; type?: MachineType; error?: string }> {
  const cleanPma = pmaNumber.trim().toUpperCase();

  // Check local database first for fast instant fill
  const localDb = getStoredPmaDatabase();
  const foundLocal = localDb.find((item) => item.pmaNumber.toUpperCase() === cleanPma);
  if (foundLocal) {
    return {
      found: true,
      brand: foundLocal.brand,
      model: foundLocal.model,
      serial: foundLocal.serial,
      type: foundLocal.type
    };
  }

  // Fallback to Apps Script if available
  if (hasGoogleScriptRun()) {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        google.script.run
          .withSuccessHandler((r: any) => resolve(r))
          .withFailureHandler((err: any) => reject(err))
          .searchPmaData(cleanPma);
      });
      if (res && res.found) {
        return res;
      }
    } catch (e) {
      console.warn('Search PMA via Apps Script failed:', e);
    }
  }

  return { found: false };
}

/**
 * Extracts a valid Google Drive URL from various possible response formats
 * returned by Google Apps Script / Google Drive APIs.
 */
export function extractDriveUrl(res: any): string {
  if (!res) return '';
  if (typeof res === 'string') {
    const trimmed = res.trim();
    // 1. Direct regex check for Google Drive / Docs URL
    const urlMatch = trimmed.match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s"'<>\\]+/i);
    if (urlMatch) {
      return urlMatch[0].replace(/\\/g, '');
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // 2. If raw Google Drive ID was passed
    const cleanId = trimmed.replace(/[^a-zA-Z0-9_-]/g, '');
    if (cleanId.length >= 20 && !cleanId.includes(' ') && !cleanId.startsWith('data')) {
      return `https://drive.google.com/file/d/${cleanId}/view?usp=drivesdk`;
    }
    return '';
  }

  // Check candidate keys on object
  const candidateKeys = [
    'url', 'fileUrl', 'pdfUrl', 'pdf_url', 'pdfLink', 'driveUrl', 'file_url',
    'viewUrl', 'link', 'webViewLink', 'webContentLink', 'downloadUrl',
    'id', 'fileId', 'file_id', 'raw'
  ];

  for (const k of candidateKeys) {
    if (res[k]) {
      const extracted = extractDriveUrl(res[k]);
      if (extracted) return extracted;
    }
  }

  // Check common nested containers: data, result, file, response, payload, item
  const nestedKeys = ['data', 'result', 'file', 'response', 'payload', 'item'];
  for (const n of nestedKeys) {
    if (res[n] && typeof res[n] === 'object') {
      const extracted = extractDriveUrl(res[n]);
      if (extracted) return extracted;
    }
  }

  // Check if stringified representation contains a Google Drive URL
  try {
    const str = JSON.stringify(res);
    const m = str.match(/https?:\\?\/\\?\/drive\.google\.com\\?\/[^\s"'<>\\]+/i);
    if (m) {
      return m[0].replace(/\\/g, '');
    }
  } catch {
    // Ignore JSON stringify error
  }

  return '';
}

/**
 * Automatically recovers an uploaded file's Google Drive URL from the public Drive folder
 * if the direct HTTP response timed out or was interrupted.
 */
export async function recoverDriveFileUrl(folderId: string, fileName: string): Promise<string> {
  if (!folderId || !fileName) return '';
  try {
    const folderUrl = `https://drive.google.com/drive/folders/${encodeURIComponent(folderId)}?t=${Date.now()}`;
    const res = await fetch(folderUrl, { cache: 'no-store' });
    if (!res.ok) return '';
    const text = await res.text();
    const cleanTarget = fileName.replace(/\.[^/.]+$/, '').trim(); // e.g. "EE-IFE-159" or "EE-IFB-001"
    if (!cleanTarget) return '';

    const idx = text.indexOf(cleanTarget);
    if (idx !== -1) {
      const chunk = text.slice(Math.max(0, idx - 400), idx + 400);
      // Pattern 1: ssk='5:auSv138:1k5SOnlBSWF8cdDwSTiZzb8WnCNvxrHd1-0-16'
      const sskMatch = chunk.match(/ssk=['"][^:]*:[^:]*:([a-zA-Z0-9_-]{20,})/);
      if (sskMatch && sskMatch[1]) {
        const rawId = sskMatch[1].split('-')[0];
        if (rawId.length >= 20) {
          return `https://drive.google.com/file/d/${rawId}/view?usp=drivesdk`;
        }
      }
      // Pattern 2: direct file ID in data attribute or quotes
      const idMatch = chunk.match(/"(1[a-zA-Z0-9_-]{27,33})"/);
      if (idMatch && idMatch[1]) {
        return `https://drive.google.com/file/d/${idMatch[1]}/view?usp=drivesdk`;
      }
    }
  } catch (err) {
    console.warn('Folder URL recovery notice:', err);
  }
  return '';
}

/**
 * Reliable HTTP POST to Google Apps Script Web App with timeout, Drive URL auto-detection, and auto-retry
 */
async function postToAppsScriptWithRetry(
  endpoint: string,
  payload: Record<string, any>,
  maxRetries = 3,
  timeoutMs = 75000
): Promise<any> {
  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (resp.ok) {
        const text = await resp.text();
        try {
          const json = JSON.parse(text);
          return json;
        } catch {
          // If response text is not clean JSON, search for a Drive URL or ID inside it
          const urlMatch = text.match(/https?:\/\/(?:drive|docs)\.google\.com\/[^\s"'<>\\]+/i);
          if (urlMatch) {
            return { success: true, url: urlMatch[0] };
          }
          if (text.startsWith('http://') || text.startsWith('https://')) {
            return { success: true, url: text.trim() };
          }
          return { success: true, raw: text };
        }
      } else {
        lastError = new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;
      console.warn(`Apps Script request (${payload.action}) attempt ${attempt} notice:`, err?.message || err);
    }

    if (attempt < maxRetries) {
      // Pause briefly with exponential backoff before retrying
      const delayMs = attempt === 1 ? 1500 : 3000;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  throw lastError || new Error(`Request failed after ${maxRetries} attempts`);
}

/**
 * Uploads a single image to Google Drive folder (ID: 1qFBW8DG4zGiKiYEpmpN5be8n7lMWE8wC)
 * Filename format: {month}-{year}-{sequence} (e.g. 9-26-1, 9-26-2)
 */
export async function uploadSingleImageToDrive(
  base64Raw: string,
  fieldKey: string,
  pmaNumber: string,
  photoIndex: number = 1,
  inspectionDateStr?: string
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  if (!base64Raw) {
    return { success: true, url: '' };
  }

  // Format custom filename as month-year-sequence (e.g., 9-26-1, 9-26-2)
  let dateObj = new Date();
  if (inspectionDateStr) {
    const parts = inspectionDateStr.split('-');
    if (parts.length === 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
        dateObj = new Date(y, m, d);
      }
    }
  }
  const month = dateObj.getMonth() + 1; // 1-12 without leading zero
  const shortYear = String(dateObj.getFullYear()).slice(-2); // e.g., '26'
  const customFilename = `${month}-${shortYear}-${photoIndex}`;

  // 1. If embedded in Google Apps Script HtmlService
  if (hasGoogleScriptRun()) {
    try {
      const res: any = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((r: any) => {
            if (r && r.success) {
              resolve(r);
            } else {
              reject(new Error(r?.error || 'Failed to upload photo to Google Drive'));
            }
          })
          .withFailureHandler((err: any) => {
            reject(new Error(err?.message || String(err)));
          })
          .uploadSingleImageToDrive(base64Raw, fieldKey, pmaNumber, customFilename);
      });
      const resolvedUrl = extractDriveUrl(res);
      return { success: true, url: resolvedUrl, filename: customFilename, ...res };
    } catch (e: any) {
      console.warn('Apps Script run upload failed:', e);
    }
  }

  // 2. If Google Apps Script Webhook URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const data = await postToAppsScriptWithRetry(
        endpoint,
        {
          action: 'uploadImage',
          base64Data: base64Raw,
          fieldKey,
          pmaNumber,
          filename: customFilename,
          customFilename: customFilename,
          photoIndex,
          folderId: DRIVE_PHOTO_FOLDER_ID
        },
        3,
        75000
      );

      const resolvedUrl = extractDriveUrl(data);
      if (resolvedUrl) {
        return { success: true, url: resolvedUrl, filename: customFilename, ...data };
      }
      if (data && data.success) {
        return { success: true, url: '', filename: customFilename, ...data };
      }
    } catch (err: any) {
      console.warn('Web App URL image upload notice:', err);
    }
  }

  // 3. Fallback: Return empty URL so raw base64 never overflows Google Sheet cells
  return { success: false, url: '', filename: customFilename, error: 'Failed to obtain Drive URL' };
}

/**
 * Uploads generated PDF inspection report to Google Drive into Battery/Engine folder
 * named exactly by FORM NO (e.g. EE-IFE-001.pdf or EE-IFB-001.pdf)
 */
export async function uploadPdfToDrive(
  pdfBase64: string,
  machineType: MachineType,
  formNo: string
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  if (!pdfBase64) {
    return { success: false, error: 'Empty PDF base64' };
  }

  const targetFolderId = machineType === 'ENGINE' ? DRIVE_ENGINE_PDF_FOLDER_ID : DRIVE_BATTERY_PDF_FOLDER_ID;
  const fileName = `${formNo.trim().toUpperCase()}.pdf`;

  // 1. If embedded in Google Apps Script HtmlService
  if (hasGoogleScriptRun()) {
    try {
      const res: any = await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((r: any) => {
            if (r && r.success) {
              resolve(r);
            } else {
              reject(new Error(r?.error || 'Failed to upload PDF to Google Drive'));
            }
          })
          .withFailureHandler((err: any) => {
            reject(new Error(err?.message || String(err)));
          })
          .uploadPdfToDrive(pdfBase64, targetFolderId, fileName);
      });
      const resolvedUrl = extractDriveUrl(res);
      return { success: true, url: resolvedUrl, filename: fileName, ...res };
    } catch (e: any) {
      console.warn('Apps Script run PDF upload failed:', e);
    }
  }

  // 2. If Google Apps Script Webhook URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const pdfColLetter = machineType === 'ENGINE' ? ENGINE_PDF_COLUMN_LETTER : BATTERY_PDF_COLUMN_LETTER; // 'CR' or 'CJ'
      const pdfColIndex = machineType === 'ENGINE' ? 96 : 88;
      const targetSheet = machineType === 'ENGINE' ? SHEET_NAME_ENGINE : SHEET_NAME_BATTERY;

      const data = await postToAppsScriptWithRetry(
        endpoint,
        {
          action: 'uploadPdf',
          base64Data: pdfBase64,
          folderId: targetFolderId,
          fileName: fileName,
          machineType,
          formNo,
          spreadsheetId: SPREADSHEET_ID,
          sheetName: targetSheet,
          // Explicit column parameters so Apps Script writes directly to CJ (Battery) or CR (Engine)
          pdfColumnLetter: pdfColLetter,
          columnLetter: pdfColLetter,
          pdfColumn: pdfColLetter,
          targetColumn: pdfColLetter,
          column: pdfColLetter,
          col: pdfColLetter,
          pdfCol: pdfColLetter,
          pdfColumnIndex: pdfColIndex,
          columnIndex: pdfColIndex,
          colIndex: pdfColIndex,
          targetHeader: 'PDF',
          pdfHeader: 'PDF',
          headerName: 'PDF'
        },
        3,
        90000
      );

      let resolvedUrl = extractDriveUrl(data);
      if (!resolvedUrl) {
        // Fallback: check if the file was created in Google Drive folder
        resolvedUrl = await recoverDriveFileUrl(targetFolderId, fileName);
      }

      if (resolvedUrl) {
        return { success: true, url: resolvedUrl, filename: fileName, ...data };
      }
      if (data && data.success) {
        return { success: true, url: '', filename: fileName, ...data };
      }
    } catch (err: any) {
      console.warn('Web App URL PDF upload notice:', err);
      // Fallback: Check if file was actually saved to Drive before network dropped
      const recoveredUrl = await recoverDriveFileUrl(targetFolderId, fileName);
      if (recoveredUrl) {
        return { success: true, url: recoveredUrl, filename: fileName };
      }
    }
  }

  // Last attempt: Check if the PDF file exists in Google Drive folder
  const recoveredUrl = await recoverDriveFileUrl(targetFolderId, fileName);
  if (recoveredUrl) {
    return { success: true, url: recoveredUrl, filename: fileName };
  }

  return { success: false, url: '', error: 'Failed to obtain PDF Drive URL' };
}

export interface SheetInspectionPayload {
  machineType: MachineType;
  formNo: string;
  typeOfInspection: string;
  pmaNumber: string;
  brand: string;
  model: string;
  serial: string;
  hourMeter: string;
  machineLocation: string;
  siteLocation: string;
  checklistAnswers: Record<string, string>;
  sectionComments: Record<string, string>;
  pictures: Record<string, string>;
  pdfUrl?: string;
  overallComment: string;
  inspectionStatus: string;
  technicianName: string;
  inspectionDate: string;
  inspectionTime: string;
}

/**
 * Saves inspection form record directly into Google Sheets (Spreadsheet ID: 1jJXC-sS3ONnnFX-2MoDCkjxHm-Mh9Pr1RWuXEtangCc)
 * under sheet 'ENGINE TYPE' or 'BATTERY TYPE'
 */
export async function saveInspectionToGoogleSheet(
  payload: SheetInspectionPayload
): Promise<{ success: boolean; formNo?: string; error?: string }> {
  const sheetName = payload.machineType === 'ENGINE' ? SHEET_NAME_ENGINE : SHEET_NAME_BATTERY;

  // Sanitize all picture URLs so only valid HTTP Drive URLs are included (never huge base64 strings)
  const safePictures: Record<string, string> = {};
  if (payload.pictures) {
    for (const [k, v] of Object.entries(payload.pictures)) {
      if (typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))) {
        safePictures[k] = v.trim();
      } else {
        safePictures[k] = '';
      }
    }
  }

  const cleanPdfUrl = (typeof payload.pdfUrl === 'string' && (payload.pdfUrl.startsWith('http://') || payload.pdfUrl.startsWith('https://')))
    ? payload.pdfUrl.trim()
    : '';

  const flatData: Record<string, any> = {
    spreadsheetId: SPREADSHEET_ID,
    sheetName: sheetName,
    machineType: payload.machineType,
    formNo: payload.formNo,
    typeOfInspection: payload.typeOfInspection,
    pmaNumber: payload.pmaNumber,
    brand: payload.brand,
    model: payload.model,
    serial: payload.serial,
    hourMeter: payload.hourMeter,
    machineLocation: payload.machineLocation,
    siteLocation: payload.siteLocation,
    ...payload.checklistAnswers,
    ...payload.sectionComments,
    // Picture keys directly
    ...safePictures,
    // Provide explicit mappings for exact Google Sheets column headers:
    '1. FRONT MACHINES': safePictures['FRONT_MACHINE'] || '',
    '2. REAR MACHINES': safePictures['REAR_MACHINE'] || '',
    '3. LEFT SIDE MACHINES': safePictures['LEFT_SIDE_MACHINE'] || '',
    '4. RIGHT SIDE MACHINES': safePictures['RIGHT_SIDE_MACHINE'] || '',
    '5. LEFT FRONT TIRES': safePictures['LEFT_FRONT_TIRE'] || '',
    '6. RIGHT FRONT TIRES': safePictures['RIGHT_FRONT_TIRE'] || '',
    '7. LEFT REAR TIRES': safePictures['LEFT_REAR_TIRE'] || '',
    '8. RIGHT REAR TIRES': safePictures['RIGHT_REAR_TIRE'] || '',
    '9. BATTERY COMPARTMENT': safePictures['BATTERY_COMPARTMENT'] || safePictures['ENGINE_COMPARTMENT'] || '',
    '10. TANK COMPARTMENT': safePictures['TANK_COMPARTMENT'] || '',
    '11. JOYSTICK': safePictures['JOYSTICK'] || '',
    '12. DATA PLATES': safePictures['DATA_PLATES'] || '',
    '13. PLATFORM BASKET': safePictures['PLATFORM_BASKET'] || '',
    '14. JIB STRUCTURE (if applicable)': safePictures['JIB_STRUCTURE'] || '',
    '14. JIB STRUCTURE': safePictures['JIB_STRUCTURE'] || '',
    // Photo 15: CABLE TRACK (Column CH in Battery, Column CP in Engine)
    '15. CABLE TRACK': safePictures['CABLE_TRACK'] || '',
    '15. CABLE TRACK (IF APPLICABLE)': safePictures['CABLE_TRACK'] || '',
    '15. CABLE TRACK (if applicable)': safePictures['CABLE_TRACK'] || '',
    CABLE_TRACK: safePictures['CABLE_TRACK'] || '',
    // Photo 16: GROUND CONTROL PANEL (Column CI in Battery, Column CQ in Engine)
    '16. GROUND CONTROL PANEL': safePictures['GROUND_CONTROL_PANEL'] || '',
    '16. GROUND CONTROL PANEL (IF APPLICABLE)': safePictures['GROUND_CONTROL_PANEL'] || '',
    GROUND_CONTROL_PANEL: safePictures['GROUND_CONTROL_PANEL'] || '',
    // Direct Column Letter mappings so Apps Script receives the links under column letters
    ...(payload.machineType === 'ENGINE'
      ? {
          CP: safePictures['CABLE_TRACK'] || '', // Column 94 (15. CABLE TRACK)
          CQ: safePictures['GROUND_CONTROL_PANEL'] || '', // Column 95 (16. GROUND CONTROL PANEL)
          CR: cleanPdfUrl, // Column 96 (PDF)
          col94: safePictures['CABLE_TRACK'] || '',
          col95: safePictures['GROUND_CONTROL_PANEL'] || '',
          col96: cleanPdfUrl
        }
      : {
          CH: safePictures['CABLE_TRACK'] || '', // Column 86 (15. CABLE TRACK)
          CI: safePictures['GROUND_CONTROL_PANEL'] || '', // Column 87 (16. GROUND CONTROL PANEL)
          CJ: cleanPdfUrl, // Column 88 (PDF)
          col86: safePictures['CABLE_TRACK'] || '',
          col87: safePictures['GROUND_CONTROL_PANEL'] || '',
          col88: cleanPdfUrl
        }),
    // PDF URLs under all common column names / aliases
    PDF: cleanPdfUrl,
    pdfUrl: cleanPdfUrl,
    pdf_url: cleanPdfUrl,
    PDF_URL: cleanPdfUrl,
    pdfLink: cleanPdfUrl,
    pdfColumnLetter: payload.machineType === 'ENGINE' ? 'CR' : 'CJ',
    columnLetter: payload.machineType === 'ENGINE' ? 'CR' : 'CJ',
    pdfColumn: payload.machineType === 'ENGINE' ? 'CR' : 'CJ',
    targetColumn: payload.machineType === 'ENGINE' ? 'CR' : 'CJ',
    pdfColumnIndex: payload.machineType === 'ENGINE' ? 96 : 88,
    overallComment: payload.overallComment,
    inspectionStatus: payload.inspectionStatus,
    technicianName: payload.technicianName,
    inspectionDate: payload.inspectionDate,
    inspectionTime: payload.inspectionTime,
    timestamp: new Date().toISOString()
  };

  // 1. If embedded in Google Apps Script
  if (hasGoogleScriptRun()) {
    try {
      const res = await new Promise<any>((resolve, reject) => {
        google.script.run
          .withSuccessHandler((r: any) => resolve(r))
          .withFailureHandler((err: any) => reject(err))
          .saveInspectionData(flatData);
      });
      return { success: true, formNo: res?.formNo || payload.formNo };
    } catch (e: any) {
      console.warn('Apps Script saveInspectionData error:', e);
      return { success: false, error: e?.message || String(e) };
    }
  }

  // 2. If Web App URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const data = await postToAppsScriptWithRetry(
        endpoint,
        {
          action: 'saveInspection',
          ...flatData
        },
        3,
        75000
      );

      if (data && data.success) {
        return { success: true, formNo: data.formNo || payload.formNo };
      }
      return { success: false, error: data?.error || 'Failed to save to Google Sheet' };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  // Fallback: stored locally
  return { success: true, formNo: payload.formNo };
}

/**
 * Parses standard CSV text with quoted newlines into a 2D array of cells.
 */
function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < csvText.length; i++) {
    const c = csvText[i];
    if (inQuotes) {
      if (c === '"' && csvText[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else {
        field += c;
      }
    } else {
      if (c === '"') {
        inQuotes = true;
      } else if (c === ',') {
        cur.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && csvText[i + 1] === '\n') i++;
        cur.push(field);
        field = '';
        rows.push(cur);
        cur = [];
      } else {
        field += c;
      }
    }
  }
  if (cur.length > 0) rows.push(cur);
  return rows;
}

/**
 * Maps a single Google Sheet row into a full SavedInspectionRecord.
 */
function mapSheetRowToInspectionRecord(row: string[], machineType: MachineType): SavedInspectionRecord {
  const formNo = (row[0] || '').trim();
  const timestamp = (row[1] || '').trim();
  const typeOfInspection = (row[2] || '1ST INSPECTION') as any;
  const pmaNumber = (row[3] || '').trim();
  const brand = (row[4] || '').trim();
  const model = (row[5] || '').trim();
  const serial = (row[6] || '').trim();
  const hourMeter = (row[7] || '').trim();
  const machineLocation = (row[8] || 'IJOK WAREHOUSE') as any;
  const siteLocation = (row[9] || 'NA').trim();

  // Find status index dynamically
  let statusIdx = -1;
  for (let i = 10; i < row.length; i++) {
    const v = (row[i] || '').trim().toUpperCase();
    if (v === 'PASS' || v === 'FAILED' || v === 'FAILED & MISUSE') {
      statusIdx = i;
      break;
    }
  }

  const inspectionStatus = (statusIdx !== -1 ? row[statusIdx].trim() : 'PASS') as any;
  const overallComment = statusIdx > 0 ? (row[statusIdx - 1] || '').trim() : '';
  const technicianName = statusIdx !== -1 && row[statusIdx + 1] ? (row[statusIdx + 1] || '').trim() : 'Inspector';
  const inspectionDate =
    statusIdx !== -1 && row[statusIdx + 2]
      ? (row[statusIdx + 2] || '').trim()
      : timestamp.split(' ')[0] || '';
  const inspectionTime =
    statusIdx !== -1 && row[statusIdx + 3] && !row[statusIdx + 3].includes('http')
      ? (row[statusIdx + 3] || '').trim()
      : timestamp.split(' ')[1] || '12:00';

  // Parse checklist and section comments
  const checklistAnswers: Record<string, ChecklistStatus> = {};
  const sectionComments: Record<string, string> = {};
  const sections = machineType === 'ENGINE' ? engineSections : batterySections;

  let colPointer = 10;
  for (const sec of sections) {
    for (const item of sec.items) {
      if (colPointer < (statusIdx !== -1 ? statusIdx - 1 : row.length)) {
        const val = (row[colPointer] || '').trim().toUpperCase();
        if (val === 'NOT OK' || val === 'NOTOK' || val === 'FAILED') {
          checklistAnswers[item.name] = 'NOT OK';
        } else if (val === 'N/A' || val === 'NA') {
          checklistAnswers[item.name] = 'N/A';
        } else if (val === 'OK') {
          checklistAnswers[item.name] = 'OK';
        } else if (val) {
          checklistAnswers[item.name] = val as any;
        } else {
          checklistAnswers[item.name] = 'OK';
        }
        colPointer++;
      }
    }
    // Section comment column
    if (colPointer < (statusIdx !== -1 ? statusIdx - 1 : row.length)) {
      sectionComments[sec.commentName] = (row[colPointer] || '').trim();
      colPointer++;
    }
  }

  // Parse pictures & PDF links
  const pictures: Record<string, string> = {};
  const picConfigs = machineType === 'ENGINE' ? enginePictureFieldsConfig : batteryPictureFieldsConfig;
  const driveLinks: string[] = [];

  for (let i = Math.max(statusIdx !== -1 ? statusIdx + 1 : 10, 10); i < row.length; i++) {
    const val = (row[i] || '').trim();
    if (val.startsWith('http://') || val.startsWith('https://')) {
      driveLinks.push(val);
    }
  }

  let pdfUrl = '';
  if (driveLinks.length > 0) {
    const last = driveLinks[driveLinks.length - 1];
    if (last.includes('/file/d/') || last.toLowerCase().includes('.pdf') || driveLinks.length > 10) {
      pdfUrl = last;
      const photoLinks = driveLinks.slice(0, driveLinks.length - 1);
      photoLinks.forEach((link, idx) => {
        if (picConfigs[idx]) {
          pictures[picConfigs[idx].key] = link;
        }
      });
    } else {
      driveLinks.forEach((link, idx) => {
        if (picConfigs[idx]) {
          pictures[picConfigs[idx].key] = link;
        }
      });
    }
  }

  return {
    id: `remote_${formNo.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`,
    formNo,
    machineType,
    typeOfInspection,
    pmaNumber,
    brand,
    model,
    serial,
    hourMeter,
    machineLocation,
    siteLocation,
    checklistAnswers,
    sectionComments,
    pictures,
    overallComment,
    inspectionStatus,
    technicianName,
    inspectionDate,
    inspectionTime,
    submittedAt: timestamp || new Date().toISOString(),
    pdfUrl
  };
}

export interface PreviousFormOption {
  formNo: string;
  machineType: MachineType;
  pmaNumber: string;
  brand: string;
  model: string;
  date: string;
  status: string;
}

/**
 * Searches and parses a previous inspection form from Google Sheets or local cache.
 * Accepts any format: "EE-IFE-89", "EE IFE 89", "EEIFE89", "EE-IFB-776", etc.
 */
export async function fetchInspectionRecordByFormNo(
  formNoQuery: string,
  localRecords: SavedInspectionRecord[] = []
): Promise<SavedInspectionRecord | null> {
  const queryRaw = formNoQuery.trim();
  if (!queryRaw) return null;
  const cleanQuery = queryRaw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // 1. Search local saved inspections first
  for (const rec of localRecords) {
    const localClean = rec.formNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (localClean === cleanQuery || localClean.replace(/([A-Z]+)0*(\d+)/, '$1$2') === cleanQuery.replace(/([A-Z]+)0*(\d+)/, '$1$2')) {
      return rec;
    }
  }

  // 2. Fetch from Google Sheets
  const sheetsToSearch: Array<{ name: string; type: MachineType }> = [];
  if (cleanQuery.includes('IFE')) {
    sheetsToSearch.push({ name: SHEET_NAME_ENGINE, type: 'ENGINE' });
    sheetsToSearch.push({ name: SHEET_NAME_BATTERY, type: 'BATTERY' });
  } else if (cleanQuery.includes('IFB')) {
    sheetsToSearch.push({ name: SHEET_NAME_BATTERY, type: 'BATTERY' });
    sheetsToSearch.push({ name: SHEET_NAME_ENGINE, type: 'ENGINE' });
  } else {
    sheetsToSearch.push({ name: SHEET_NAME_ENGINE, type: 'ENGINE' });
    sheetsToSearch.push({ name: SHEET_NAME_BATTERY, type: 'BATTERY' });
  }

  for (const target of sheetsToSearch) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(target.name)}&t=${Date.now()}`;
      const res = await fetch(gvizUrl, { method: 'GET', cache: 'no-store' });
      if (!res.ok) continue;

      const csvText = await res.text();
      const rows = parseCsvRows(csvText);
      if (rows.length <= 1) continue;

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const rowFormNo = (row[0] || '').trim();
        const rowClean = rowFormNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        const isExactMatch =
          rowClean === cleanQuery ||
          rowClean.replace(/([A-Z]+)0*(\d+)/, '$1$2') === cleanQuery.replace(/([A-Z]+)0*(\d+)/, '$1$2');

        if (isExactMatch) {
          return mapSheetRowToInspectionRecord(row, target.type);
        }
      }
    } catch (err) {
      console.warn(`Error querying sheet ${target.name}:`, err);
    }
  }

  return null;
}

/**
 * Fetches available inspection forms list across local history and Google Sheets.
 */
export async function fetchAvailableInspectionList(
  localRecords: SavedInspectionRecord[] = []
): Promise<PreviousFormOption[]> {
  const optionsMap = new Map<string, PreviousFormOption>();

  // Add from local storage first
  for (const rec of localRecords) {
    if (rec.formNo) {
      const key = rec.formNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      optionsMap.set(key, {
        formNo: rec.formNo,
        machineType: rec.machineType,
        pmaNumber: rec.pmaNumber,
        brand: rec.brand,
        model: rec.model,
        date: rec.inspectionDate || '',
        status: rec.inspectionStatus || 'PASS'
      });
    }
  }

  // Fetch recent from both sheets
  for (const sheet of [
    { name: SHEET_NAME_ENGINE, type: 'ENGINE' as MachineType },
    { name: SHEET_NAME_BATTERY, type: 'BATTERY' as MachineType }
  ]) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet.name)}&t=${Date.now()}`;
      const res = await fetch(gvizUrl, { method: 'GET', cache: 'no-store' });
      if (!res.ok) continue;

      const csvText = await res.text();
      const rows = parseCsvRows(csvText);
      // Iterate from newest to oldest
      for (let r = rows.length - 1; r >= 1; r--) {
        const row = rows[r];
        const formNo = (row[0] || '').trim();
        if (!formNo) continue;
        const key = formNo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        if (!optionsMap.has(key)) {
          optionsMap.set(key, {
            formNo,
            machineType: sheet.type,
            pmaNumber: (row[3] || '').trim(),
            brand: (row[4] || '').trim(),
            model: (row[5] || '').trim(),
            date: (row[1] || '').split(' ')[0] || '',
            status: 'RECORDED'
          });
        }
      }
    } catch {
      // Continue
    }
  }

  return Array.from(optionsMap.values());
}

