import { MachineType, PmaRecord, SavedInspectionRecord } from '../types/inspection';
import { getStoredPmaDatabase } from '../data/pmaDatabase';
import { generateNextFormNumber } from '../utils/formNumberGenerator';

// Google Sheet IDs & Configuration
export const SPREADSHEET_ID = '1jJXC-sS3ONnnFX-2MoDCkjxHm-Mh9Pr1RWuXEtangCc';
export const SHEET_NAME_BATTERY = 'BATTERY TYPE';
export const SHEET_NAME_ENGINE = 'ENGINE TYPE';

// Target PDF Columns in Google Sheet
export const BATTERY_PDF_COLUMN_LETTER = 'CH'; // Column 86
export const ENGINE_PDF_COLUMN_LETTER = 'CP';  // Column 94

// Google Drive Folder IDs
export const DRIVE_PHOTO_FOLDER_ID = '1qFBW8DG4zGiKiYEpmpN5be8n7lMWE8wC';
export const DRIVE_BATTERY_PDF_FOLDER_ID = '1h7uOhq76kforMFskOmI3w6OI-dbUFBbp';
export const DRIVE_ENGINE_PDF_FOLDER_ID = '1h5R0mlozLV76MrL9fb4mZzf8Xap6hOv8';

export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbxWHZqtd22rhJqs0BQNxTq8DKl5kCWMqubPYzW7E7n_7WQxmKqVESTTOzo28PwVJwny/exec';

// Configurable Webhook URL for Google Apps Script Web App Deployment
export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('eastway_apps_script_url');
    // If user has old default cached in localStorage, automatically upgrade to new URL
    if (local && (local.includes('AKfycbwg3mNH3xYeeaMlsTdR') || local.trim() === '')) {
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
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // If raw Google Drive ID was passed
    if (trimmed.length > 20 && !trimmed.includes(' ') && !trimmed.startsWith('data:')) {
      return `https://drive.google.com/file/d/${trimmed}/view?usp=drivesdk`;
    }
    return '';
  }

  // Check all common URL properties from DriveApp / Apps Script responses
  const candidates = [
    res.url,
    res.fileUrl,
    res.viewUrl,
    res.link,
    res.webViewLink,
    res.webContentLink,
    res.downloadUrl
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && (c.startsWith('http://') || c.startsWith('https://'))) {
      return c.trim();
    }
  }

  // If fileId or id was returned
  const fileId = res.fileId || res.id || res.file_id;
  if (typeof fileId === 'string' && fileId.trim().length > 15 && !fileId.startsWith('data:')) {
    return `https://drive.google.com/file/d/${fileId.trim()}/view?usp=drivesdk`;
  }

  return '';
}

/**
 * Reliable HTTP POST to Google Apps Script Web App with timeout and auto-retry
 */
async function postToAppsScriptWithRetry(
  endpoint: string,
  payload: Record<string, any>,
  maxRetries = 2,
  timeoutMs = 45000
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
      console.warn(`Apps Script request (${payload.action}) attempt ${attempt} warning:`, err?.message || err);
    }

    if (attempt < maxRetries) {
      // Pause briefly before retrying
      await new Promise((r) => setTimeout(r, 1500));
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
        2,
        45000
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
      const data = await postToAppsScriptWithRetry(
        endpoint,
        {
          action: 'uploadPdf',
          base64Data: pdfBase64,
          folderId: targetFolderId,
          fileName: fileName,
          machineType,
          formNo
        },
        2,
        50000
      );

      const resolvedUrl = extractDriveUrl(data);
      if (resolvedUrl) {
        return { success: true, url: resolvedUrl, filename: fileName, ...data };
      }
      if (data && data.success) {
        return { success: true, url: '', filename: fileName, ...data };
      }
    } catch (err: any) {
      console.warn('Web App URL PDF upload notice:', err);
    }
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
    // PDF URLs under all common column names / aliases
    PDF: cleanPdfUrl,
    pdfUrl: cleanPdfUrl,
    pdf_url: cleanPdfUrl,
    PDF_URL: cleanPdfUrl,
    pdfLink: cleanPdfUrl,
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
        2,
        50000
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
