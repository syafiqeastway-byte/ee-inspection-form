import { MachineType, PmaRecord } from '../types/inspection';
import { INITIAL_PMA_DATABASE, savePmaDatabase } from '../data/pmaDatabase';

// Supabase REST Endpoint as provided by user
export const DEFAULT_SUPABASE_FLEET_URL =
  'https://rgpkzyqytepatahedsfp.supabase.co/rest/v1/MEWP%20FLEET';

export interface SupabaseSyncResult {
  success: boolean;
  count: number;
  data: PmaRecord[];
  error?: string;
  source: 'supabase' | 'cache' | 'local';
  requiresApiKey?: boolean;
}

const LOCAL_STORAGE_SUPABASE_FLEET_KEY = 'eastway_supabase_mewp_fleet_v1';
const LOCAL_STORAGE_SUPABASE_KEY = 'eastway_supabase_anon_key';

/**
 * Retrieves the Supabase Anon / API Key from environment or localStorage
 */
export function getSupabaseAnonKey(): string {
  // 1. From Vite env vars
  const envKey = (
    (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
    (import.meta as any).env?.VITE_SUPABASE_KEY ||
    ''
  ).trim();
  if (envKey) return envKey;

  // 2. From localStorage if configured
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LOCAL_STORAGE_SUPABASE_KEY);
    if (stored && stored.trim()) return stored.trim();
  }

  return '';
}

/**
 * Allows setting or updating the Supabase Anon Key in localStorage
 */
export function setSupabaseAnonKey(key: string) {
  if (typeof window !== 'undefined') {
    if (key.trim()) {
      localStorage.setItem(LOCAL_STORAGE_SUPABASE_KEY, key.trim());
    } else {
      localStorage.removeItem(LOCAL_STORAGE_SUPABASE_KEY);
    }
  }
}

/**
 * Helper to extract value from a Supabase row checking case-insensitively,
 * space-insensitively, and underscore-insensitively across prioritized candidate names.
 */
function getColumnValue(row: Record<string, any>, candidateNames: string[]): string {
  if (!row || typeof row !== 'object') return '';

  const entries = Object.entries(row);

  // 1. Try exact match first
  for (const candidate of candidateNames) {
    if (row[candidate] !== undefined && row[candidate] !== null) {
      const val = String(row[candidate]).trim();
      if (val !== '') return val;
    }
  }

  // 2. Try normalized match (remove all non-alphanumeric characters, lowercase)
  for (const candidate of candidateNames) {
    const targetKey = candidate.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [key, val] of entries) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === targetKey && val !== undefined && val !== null) {
        const strVal = String(val).trim();
        if (strVal !== '') return strVal;
      }
    }
  }

  return '';
}

/**
 * Normalizes different column naming conventions from Supabase tables
 * Specifically handles user-defined columns:
 * - Equipment Brand: 'machine brand'
 * - Equipment Model: 'machine model'
 * - Serial Number: 'serial no'
 */
function normalizeSupabaseRow(row: Record<string, any>): PmaRecord | null {
  if (!row || typeof row !== 'object') return null;

  // 1. Find PMA Number
  const rawPma = getColumnValue(row, [
    'PMA NUMBER',
    'pma_number',
    'PMA NO',
    'pma_no',
    'PMA',
    'pma',
    'Equipment No',
    'equipment_no'
  ]);

  const cleanPma = rawPma.toUpperCase();
  if (!cleanPma) return null;

  // 2. Find Equipment Brand - Mapped from column 'machine brand'
  const rawBrand = getColumnValue(row, [
    'machine brand',
    'machine_brand',
    'MACHINE BRAND',
    'equipment brand',
    'equipment_brand',
    'BRAND',
    'brand',
    'MAKE',
    'make',
    'Manufacturer'
  ]);

  // 3. Find Equipment Model - Mapped from column 'machine model'
  const rawModel = getColumnValue(row, [
    'machine model',
    'machine_model',
    'MACHINE MODEL',
    'equipment model',
    'equipment_model',
    'MODEL',
    'model'
  ]);

  // 4. Find Serial Number - Mapped from column 'serial no'
  const rawSerial = getColumnValue(row, [
    'serial no',
    'serial_no',
    'SERIAL NO',
    'serial number',
    'serial_number',
    'SERIAL NUMBER',
    'serial',
    'SERIAL',
    'chassis no',
    'chassis_no'
  ]);

  // 5. Find Machine Type (BATTERY or ENGINE)
  const rawType = getColumnValue(row, [
    'machine type',
    'machine_type',
    'MACHINE TYPE',
    'type',
    'TYPE',
    'ENGINE / BATTERY',
    'engine_battery',
    'Fuel Type'
  ]).toUpperCase();

  let resolvedType: MachineType = 'BATTERY';
  if (
    rawType.includes('ENGINE') ||
    rawType.includes('DIESEL') ||
    rawType.includes('ENG') ||
    rawType.includes('FUEL')
  ) {
    resolvedType = 'ENGINE';
  } else if (
    rawType.includes('BATTERY') ||
    rawType.includes('ELECTRIC') ||
    rawType.includes('ELEC') ||
    rawType.includes('DC')
  ) {
    resolvedType = 'BATTERY';
  } else {
    // If undetermined, check category or default
    resolvedType = 'BATTERY';
  }

  // 6. Find Category (e.g. SCISSORLIFT, BOOMLIFT, etc.)
  const rawCategory = getColumnValue(row, [
    'category',
    'CATEGORY',
    'equipment category',
    'equipment_category',
    'EQUIPMENT CATEGORY'
  ]).toUpperCase();

  let resolvedCategory: 'SCISSORLIFT' | 'BOOMLIFT' | 'OTHER' | undefined = undefined;
  if (rawCategory.includes('SCISSOR')) {
    resolvedCategory = 'SCISSORLIFT';
  } else if (rawCategory.includes('BOOM')) {
    resolvedCategory = 'BOOMLIFT';
  } else if (rawCategory.trim()) {
    resolvedCategory = 'OTHER';
  }

  return {
    pmaNumber: cleanPma,
    brand: rawBrand.toUpperCase(),
    model: rawModel.toUpperCase(),
    serial: rawSerial.toUpperCase(),
    type: resolvedType,
    category: resolvedCategory
  };
}

/**
 * Fetches MEWP FLEET data from Supabase REST API
 * Endpoint: https://rgpkzyqytepatahedsfp.supabase.co/rest/v1/MEWP%20FLEET
 */
export async function fetchSupabaseMewpFleet(): Promise<SupabaseSyncResult> {
  const customUrl = (import.meta as any).env?.VITE_SUPABASE_FLEET_URL || DEFAULT_SUPABASE_FLEET_URL;
  const apiKey = getSupabaseAnonKey();

  // URL setup - Ensure select=* to get all columns
  let url = customUrl.trim();
  const separator = url.includes('?') ? '&' : '?';
  const queryUrl = `${url}${separator}select=*`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['apikey'] = apiKey;
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  try {
    const res = await fetch(queryUrl, {
      method: 'GET',
      headers,
      cache: 'no-store'
    });

    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json) && json.length > 0) {
        const parsedFleet: PmaRecord[] = [];
        for (const row of json) {
          const norm = normalizeSupabaseRow(row);
          if (norm && norm.pmaNumber) {
            parsedFleet.push(norm);
          }
        }

        if (parsedFleet.length > 0) {
          // Cache in localStorage
          try {
            localStorage.setItem(LOCAL_STORAGE_SUPABASE_FLEET_KEY, JSON.stringify(parsedFleet));
            savePmaDatabase(parsedFleet);
          } catch (e) {
            console.error('Failed to cache Supabase fleet to localStorage', e);
          }

          return {
            success: true,
            count: parsedFleet.length,
            data: parsedFleet,
            source: 'supabase'
          };
        }
      }
    } else {
      // Analyze error (e.g. 401 Unauthorized / missing apikey)
      const errorText = await res.text().catch(() => '');
      const isAuthError = res.status === 401 || res.status === 403 || errorText.includes('apikey');

      // Try reading cached fleet if previously synced
      const cached = getCachedSupabaseFleet();
      if (cached && cached.length > 0) {
        return {
          success: false,
          count: cached.length,
          data: cached,
          error: isAuthError
            ? 'Supabase REST API memerlukan API Key (anon key).'
            : `Supabase status: ${res.status}`,
          source: 'cache',
          requiresApiKey: isAuthError
        };
      }

      return {
        success: false,
        count: INITIAL_PMA_DATABASE.length,
        data: INITIAL_PMA_DATABASE,
        error: isAuthError
          ? 'Supabase REST API memerlukan API Key (anon key).'
          : `HTTP ${res.status}: ${errorText || res.statusText}`,
        source: 'local',
        requiresApiKey: isAuthError
      };
    }
  } catch (netErr: any) {
    console.warn('Network error accessing Supabase REST API:', netErr);
    const cached = getCachedSupabaseFleet();
    return {
      success: false,
      count: cached?.length || INITIAL_PMA_DATABASE.length,
      data: cached || INITIAL_PMA_DATABASE,
      error: netErr?.message || 'Network error connecting to Supabase',
      source: cached ? 'cache' : 'local'
    };
  }

  return {
    success: false,
    count: INITIAL_PMA_DATABASE.length,
    data: INITIAL_PMA_DATABASE,
    source: 'local'
  };
}

/**
 * Retrieves cached Supabase MEWP Fleet from localStorage
 */
export function getCachedSupabaseFleet(): PmaRecord[] | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUPABASE_FLEET_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed reading cached Supabase fleet', e);
  }
  return null;
}
