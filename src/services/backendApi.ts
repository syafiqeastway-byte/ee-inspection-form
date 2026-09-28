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
  'https://script.google.com/macros/s/AKfycbwg3mNH3xYeeaMlsTdR-YYp4jCA1eZyghSl411kcNXCIbDUrHwaJTjB86MHX-rAFfPW/exec';

// Configurable Webhook URL for Google Apps Script Web App Deployment
export function getAppsScriptUrl(): string {
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('eastway_apps_script_url');
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

  // 1. If embedded in Google Apps Script HtmlService
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
    } catch (e) {
      console.warn('Apps Script fetch form no failed:', e);
    }
  }

  // 2. Fetch via Apps Script Web App if URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const resp = await fetch(
        `${endpoint}?action=getLatestFormNumber&sheetName=${encodeURIComponent(primarySheetName)}&prefix=${encodeURIComponent(prefix)}&spreadsheetId=${encodeURIComponent(SPREADSHEET_ID)}`
      );
      if (resp.ok) {
        const json = await resp.json();
        if (json && json.formNo) {
          return json.formNo;
        }
      }
    } catch (e) {
      console.warn('Web App fetch form no notice:', e);
    }
  }

  // 3. Direct Google Sheets GViz CSV queries (checks both 'ENGINE TYPE' & 'ENGINE' tabs)
  const candidateSheets = [primarySheetName, fallbackSheetName];
  for (const sheetCandidate of candidateSheets) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetCandidate)}`;
      const res = await fetch(gvizUrl);
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
    } catch (err) {
      // Try next sheet candidate
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
 * Uploads a single image to Google Drive folder (ID: 1qFBW8DG4zGiKiYEpmpN5be8n7lMWE8wC)
 */
export async function uploadSingleImageToDrive(
  base64Raw: string,
  fieldKey: string,
  pmaNumber: string
): Promise<{ success: boolean; url?: string; filename?: string; error?: string }> {
  if (!base64Raw) {
    return { success: true, url: '' };
  }

  // 1. If embedded in Google Apps Script HtmlService
  if (hasGoogleScriptRun()) {
    try {
      return await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res: { success: boolean; url?: string; filename?: string; error?: string }) => {
            if (res && res.success) {
              resolve(res);
            } else {
              reject(new Error(res?.error || 'Failed to upload photo to Google Drive'));
            }
          })
          .withFailureHandler((err: any) => {
            reject(new Error(err?.message || String(err)));
          })
          .uploadSingleImageToDrive(base64Raw, fieldKey, pmaNumber);
      });
    } catch (e: any) {
      console.warn('Apps Script run upload failed:', e);
    }
  }

  // 2. If Google Apps Script Webhook URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadImage',
          base64Data: base64Raw,
          fieldKey,
          pmaNumber,
          folderId: DRIVE_PHOTO_FOLDER_ID
        })
      });
      const data = await resp.json();
      if (data && data.success) {
        return data;
      }
    } catch (err: any) {
      console.warn('Web App URL image upload notice:', err);
    }
  }

  // 3. Fallback: keep base64 locally so user does not lose photos
  return { success: true, url: base64Raw };
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
      return await new Promise((resolve, reject) => {
        google.script.run
          .withSuccessHandler((res: { success: boolean; url?: string; filename?: string; error?: string }) => {
            if (res && res.success) {
              resolve(res);
            } else {
              reject(new Error(res?.error || 'Failed to upload PDF to Google Drive'));
            }
          })
          .withFailureHandler((err: any) => {
            reject(new Error(err?.message || String(err)));
          })
          .uploadPdfToDrive(pdfBase64, targetFolderId, fileName);
      });
    } catch (e: any) {
      console.warn('Apps Script run PDF upload failed:', e);
    }
  }

  // 2. If Google Apps Script Webhook URL is configured
  const endpoint = getAppsScriptUrl();
  if (endpoint) {
    try {
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'uploadPdf',
          base64Data: pdfBase64,
          folderId: targetFolderId,
          fileName: fileName,
          machineType,
          formNo
        })
      });
      const data = await resp.json();
      if (data && data.success) {
        return data;
      }
    } catch (err: any) {
      console.warn('Web App URL PDF upload notice:', err);
    }
  }

  return { success: true, url: '' };
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
    ...payload.pictures,
    pdfUrl: payload.pdfUrl || '',
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
      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveInspection',
          ...flatData
        })
      });
      const data = await resp.json();
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
