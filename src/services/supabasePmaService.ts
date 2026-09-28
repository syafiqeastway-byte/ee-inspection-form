import { PmaRecord, MachineType } from '../types/inspection';
import { getStoredPmaDatabase, savePmaDatabase, searchPma } from '../data/pmaDatabase';

export const SUPABASE_URL = 'https://rgpkzyqytepatahedsfp.supabase.co';
export const SUPABASE_TABLE = 'MEWP FLEET';
export const SUPABASE_REST_ENDPOINT = `${SUPABASE_URL}/rest/v1/${encodeURIComponent(SUPABASE_TABLE)}`;

// Cache in memory for instant responsiveness
let cachedPmaRecords: PmaRecord[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh cache

/**
 * Normalizes any Supabase row object into our standard PmaRecord interface.
 * Handles snake_case, camelCase, UPPERCASE, and spaced column names.
 */
function normalizeSupabaseRow(row: Record<string, any>): PmaRecord | null {
  if (!row || typeof row !== 'object') return null;

  // Helper to find value across various possible key names
  const findValue = (...keys: string[]): string => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) {
        return String(row[key]).trim();
      }
      // Also check case-insensitive match
      const matchedKey = Object.keys(row).find((k) => k.toLowerCase().replace(/[\s_-]/g, '') === key.toLowerCase().replace(/[\s_-]/g, ''));
      if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null) {
        return String(row[matchedKey]).trim();
      }
    }
    return '';
  };

  const pmaRaw = findValue('pma_number', 'pmanumber', 'pma_no', 'pmano', 'pma', 'PMA NUMBER', 'PMA NO', 'PMA');
  if (!pmaRaw) return null;

  const brandRaw = findValue('brand', 'equipment_brand', 'equipmentbrand', 'make', 'BRAND', 'EQUIPMENT BRAND');
  const modelRaw = findValue('model', 'equipment_model', 'equipmentmodel', 'MODEL', 'EQUIPMENT MODEL');
  const serialRaw = findValue('serial_number', 'serialnumber', 'serial_no', 'serialno', 'serial', 'chassis_no', 'SERIAL NUMBER', 'SERIAL NO', 'SERIAL');
  const typeRaw = findValue('machine_type', 'machinetype', 'type', 'engine_or_battery', 'MACHINE TYPE', 'TYPE');
  const categoryRaw = findValue('category', 'machine_category', 'equipment_type', 'CATEGORY');

  const upperType = typeRaw.toUpperCase();
  const machineType: MachineType = upperType.includes('ENGINE') || upperType.includes('DIESEL') ? 'ENGINE' : 'BATTERY';

  const formattedPma = pmaRaw.toUpperCase().startsWith('PMA') ? pmaRaw.toUpperCase() : `PMA ${pmaRaw.toUpperCase()}`;

  return {
    pmaNumber: formattedPma,
    brand: brandRaw.toUpperCase(),
    model: modelRaw.toUpperCase(),
    serial: serialRaw.toUpperCase(),
    type: machineType,
    category: categoryRaw.toUpperCase().includes('BOOM') ? 'BOOMLIFT' : 'SCISSORLIFT'
  };
}

/**
 * Fetches all MEWP fleet records directly from the Supabase REST API
 */
export async function fetchAllPmaFromSupabase(): Promise<PmaRecord[]> {
  const now = Date.now();
  if (cachedPmaRecords && cachedPmaRecords.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedPmaRecords;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  const fetchUrls = [
    `${SUPABASE_REST_ENDPOINT}?select=*`,
    `${SUPABASE_URL}/rest/v1/mewp_fleet?select=*`,
    `${SUPABASE_URL}/rest/v1/mewp-fleet?select=*`
  ];

  for (const url of fetchUrls) {
    try {
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      const res = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const records: PmaRecord[] = [];
          for (const item of data) {
            const normalized = normalizeSupabaseRow(item);
            if (normalized && normalized.pmaNumber) {
              records.push(normalized);
            }
          }

          if (records.length > 0) {
            clearTimeout(timeoutId);
            cachedPmaRecords = records;
            lastFetchTime = now;
            savePmaDatabase(records);
            return records;
          }
        }
      }
    } catch (e) {
      // Continue to next alternative or fallback
    }
  }

  clearTimeout(timeoutId);

  // Fallback to cached/stored database
  const localDb = getStoredPmaDatabase();
  cachedPmaRecords = localDb;
  return localDb;
}

/**
 * Searches for a specific PMA Number in Supabase
 */
export async function searchPmaFromSupabase(
  pmaQuery: string
): Promise<{ found: boolean; brand?: string; model?: string; serial?: string; type?: MachineType; error?: string }> {
  const clean = pmaQuery.trim().toUpperCase();
  if (!clean) return { found: false };

  // First check fast local cache
  if (cachedPmaRecords) {
    const cachedMatch = searchPma(clean, cachedPmaRecords);
    if (cachedMatch && cachedMatch.brand) {
      return {
        found: true,
        brand: cachedMatch.brand,
        model: cachedMatch.model,
        serial: cachedMatch.serial,
        type: cachedMatch.type
      };
    }
  }

  // Fetch full list from Supabase
  try {
    const fleet = await fetchAllPmaFromSupabase();
    const match = searchPma(clean, fleet);
    if (match && match.brand) {
      return {
        found: true,
        brand: match.brand,
        model: match.model,
        serial: match.serial,
        type: match.type
      };
    }
  } catch (err: any) {
    console.warn('Supabase PMA search error:', err);
  }

  // Final fallback to stored database
  const localMatch = searchPma(clean);
  if (localMatch && localMatch.brand) {
    return {
      found: true,
      brand: localMatch.brand,
      model: localMatch.model,
      serial: localMatch.serial,
      type: localMatch.type
    };
  }

  return { found: false };
}
