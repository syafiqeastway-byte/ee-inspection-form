import { MachineType, PmaRecord } from '../types/inspection';
import { generateNextFormNumber } from '../utils/formNumberGenerator';
import { getStoredPmaDatabase, savePmaDatabase, searchPma } from '../data/pmaDatabase';

export const SPREADSHEET_ID = '1ZdLLZGcc4iP2nAaHv6gHUyRYBjRoOFAA8cwL39oBqQw';
export const DRIVE_FOLDER_ID = '1ZZinNXcnX788DnT34Zo1rHHFV0VG-Zj4';

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
 * Calculates the next Form Number from a list of Column A strings from Google Sheets.
 * Follows exact backend logic: EE-IFB-001 for BATTERY TYPE, EE-IFE-001 for ENGINE TYPE.
 */
export function calculateNextFormNoFromColumnA(columnAValues: string[], machineType: MachineType): string {
  const isEngine = machineType === 'ENGINE';
  const defaultPrefix = isEngine ? 'EE-IFE-' : 'EE-IFB-';
  const targetPrefix = defaultPrefix.toUpperCase();

  let maxNum = 0;

  for (const rawVal of columnAValues) {
    const cellValue = String(rawVal).trim().toUpperCase();
    if (cellValue.startsWith(targetPrefix)) {
      const numStr = cellValue.replace(targetPrefix, '').trim();
      const num = parseInt(numStr, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  const nextNum = maxNum + 1;
  return `${defaultPrefix}${String(nextNum).padStart(3, '0')}`;
}

/**
 * Direct Live fetch from Google Sheets GViz endpoint for Column A of target sheet
 */
async function fetchColumnAFromGoogleSheetGviz(sheetName: string): Promise<string[]> {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(
    sheetName
  )}&range=A:A`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) return [];

    const text = await response.text();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) return [];

    const jsonStr = text.substring(jsonStart, jsonEnd + 1);
    const data = JSON.parse(jsonStr);
    const rows = data?.table?.rows || [];

    const list: string[] = [];
    for (const row of rows) {
      const cell = row?.c?.[0];
      if (cell && (cell.v !== null && cell.v !== undefined || cell.f)) {
        list.push(String(cell.f || cell.v).trim());
      }
    }
    return list;
  } catch (err) {
    clearTimeout(timeoutId);
    return [];
  }
}

/**
 * Fetches the next available form number from Google Sheet Column A, Google Apps Script, or local generator.
 */
export async function fetchBackendFormNo(machineType: MachineType): Promise<string> {
  const isEngine = machineType === 'ENGINE';
  const targetSheetName = isEngine ? 'ENGINE TYPE' : 'BATTERY TYPE';

  // 1. Try Google Apps Script context if embedded
  if (hasGoogleScriptRun()) {
    try {
      const scriptResult = await new Promise<string>((resolve, reject) => {
        google.script.run
          .withSuccessHandler((newFormNo: string) => resolve(newFormNo))
          .withFailureHandler((err: any) => reject(err))
          .getNewFormNo(machineType);
      });
      if (scriptResult) return scriptResult;
    } catch (e) {
      console.warn('Apps Script getNewFormNo unavailable, trying Google Sheet direct fetch:', e);
    }
  }

  // 2. Try direct Google Sheet fetch (Column A from BATTERY TYPE / ENGINE TYPE sheet)
  try {
    const colAValues = await fetchColumnAFromGoogleSheetGviz(targetSheetName);
    if (colAValues.length > 0) {
      const computed = calculateNextFormNoFromColumnA(colAValues, machineType);
      return computed;
    }
  } catch (e) {
    console.warn('Google Sheet GViz fetch error:', e);
  }

  // 3. Fallback to local sequence generator
  return generateNextFormNumber(machineType);
}

import {
  fetchAllPmaFromSupabase,
  searchPmaFromSupabase
} from './supabasePmaService';

/**
 * Fetches PMA fleet data list directly from Supabase API ('MEWP FLEET')
 */
export async function fetchBackendPmaList(): Promise<string[]> {
  try {
    const records = await fetchAllPmaFromSupabase();
    if (records.length > 0) {
      return records.map((r) => r.pmaNumber);
    }
  } catch (e) {
    console.warn('Failed to fetch PMA list from Supabase:', e);
  }

  const defaultPmas = getStoredPmaDatabase().map((i) => i.pmaNumber);
  return defaultPmas;
}

/**
 * Searches for specific PMA Number from Supabase API ('MEWP FLEET')
 */
export async function searchBackendPmaNumber(
  pmaNumber: string
): Promise<{ found: boolean; brand?: string; model?: string; serial?: string; type?: MachineType; error?: string }> {
  return searchPmaFromSupabase(pmaNumber);
}


/**
 * Uploads a single image to Google Drive folder
 */
export function uploadSingleImageToDrive(
  base64Raw: string,
  fieldKey: string,
  pmaNumber: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    if (!base64Raw) {
      resolve({ success: true, url: '' });
      return;
    }

    if (hasGoogleScriptRun()) {
      try {
        google.script.run
          .withSuccessHandler((res: { success: boolean; url?: string; error?: string }) => {
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
        return;
      } catch (e: any) {
        reject(new Error(e?.message || 'Failed to initiate Google Drive upload'));
        return;
      }
    }

    // Standalone local preview mode
    resolve({ success: true, url: base64Raw });
  });
}

/**
 * Saves inspection form and image URLs into Google Sheet & Generates PDF
 */
export function saveInspectionToBackend(
  formData: Record<string, any>,
  uploadedUrlMap: Record<string, string>
): Promise<{ success: boolean; formNo?: string; error?: string }> {
  return new Promise((resolve, reject) => {
    if (hasGoogleScriptRun()) {
      try {
        google.script.run
          .withSuccessHandler((res: { success: boolean; formNo?: string; error?: string }) => {
            if (res && res.success) {
              resolve(res);
            } else {
              reject(new Error(res?.error || 'Failed to save inspection to Google Sheet'));
            }
          })
          .withFailureHandler((err: any) => {
            reject(new Error(err?.message || String(err)));
          })
          .saveInspectionData(formData, uploadedUrlMap);
        return;
      } catch (e: any) {
        reject(new Error(e?.message || 'Failed to initiate saveInspectionData'));
        return;
      }
    }

    // Standalone mode simulation
    resolve({ success: true, formNo: formData.formNo });
  });
}
