import { PmaRecord } from '../types/inspection';

export const INITIAL_PMA_DATABASE: PmaRecord[] = [
  {
    pmaNumber: 'PMA 10243',
    brand: 'JLG',
    model: '1930ES',
    serial: '0200234190',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 10892',
    brand: 'GENIE',
    model: 'GS-1930',
    serial: 'GS3015C-14520',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 11450',
    brand: 'DINGLI',
    model: 'JCPT1614HD',
    serial: 'DL1614-99812',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 12389',
    brand: 'HAULOTTE',
    model: 'COMPACT 10N',
    serial: 'CE114298',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 13455',
    brand: 'SINOBOOM',
    model: '1932ME',
    serial: 'SB1932-202308',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 14201',
    brand: 'JLG',
    model: '450AJ',
    serial: '0300187422',
    type: 'ENGINE',
    category: 'BOOMLIFT'
  },
  {
    pmaNumber: 'PMA 15672',
    brand: 'GENIE',
    model: 'Z-45/25J RT',
    serial: 'Z452516A-54311',
    type: 'ENGINE',
    category: 'BOOMLIFT'
  },
  {
    pmaNumber: 'PMA 16890',
    brand: 'DINGLI',
    model: 'BA28RT',
    serial: 'DLBA28-2022091',
    type: 'ENGINE',
    category: 'BOOMLIFT'
  },
  {
    pmaNumber: 'PMA 17402',
    brand: 'SKYJACK',
    model: 'SJIII 3219',
    serial: 'SJ3219-880034',
    type: 'BATTERY',
    category: 'SCISSORLIFT'
  },
  {
    pmaNumber: 'PMA 18911',
    brand: 'ZOOMLION',
    model: 'ZA14J',
    serial: 'ZLZA14J-77209',
    type: 'ENGINE',
    category: 'BOOMLIFT'
  },
  {
    pmaNumber: 'PMA 19500',
    brand: 'GENIE',
    model: 'S-65 TRAX',
    serial: 'S6514-19402',
    type: 'ENGINE',
    category: 'BOOMLIFT'
  },
  {
    pmaNumber: 'PMA 20450',
    brand: 'JLG',
    model: 'E450AJ',
    serial: '0300229811',
    type: 'BATTERY',
    category: 'BOOMLIFT'
  }
];

const LOCAL_STORAGE_PMA_KEY = 'eastway_pma_database_v1';

export function getStoredPmaDatabase(): PmaRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PMA_KEY);
    if (!raw) {
      localStorage.setItem(LOCAL_STORAGE_PMA_KEY, JSON.stringify(INITIAL_PMA_DATABASE));
      return INITIAL_PMA_DATABASE;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_PMA_DATABASE;
  } catch (e) {
    console.error('Failed to load stored PMA database', e);
    return INITIAL_PMA_DATABASE;
  }
}

export function savePmaDatabase(list: PmaRecord[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PMA_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save PMA database', e);
  }
}

export function searchPma(query: string, currentDatabase: PmaRecord[] = getStoredPmaDatabase()): PmaRecord | undefined {
  const cleanQuery = query.trim().toUpperCase();
  if (!cleanQuery) return undefined;
  return currentDatabase.find(
    (item) => item.pmaNumber.toUpperCase() === cleanQuery || item.pmaNumber.replace(/\s+/g, '').toUpperCase() === cleanQuery.replace(/\s+/g, '')
  );
}
