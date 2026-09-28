import { MachineType } from '../types/inspection';

const FORM_COUNTER_KEY = 'eastway_form_counter_v2';

interface FormCounters {
  battery: number;
  engine: number;
}

function getStoredCounters(): FormCounters {
  try {
    const raw = localStorage.getItem(FORM_COUNTER_KEY);
    if (!raw) {
      const initial: FormCounters = { battery: 1, engine: 1 };
      localStorage.setItem(FORM_COUNTER_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.battery === 'number') {
      return parsed;
    }
    return { battery: 1, engine: 1 };
  } catch {
    return { battery: 1, engine: 1 };
  }
}

export function generateNextFormNumber(type: MachineType): string {
  const isEngine = type === 'ENGINE';
  const prefix = isEngine ? 'EE-IFE-' : 'EE-IFB-';
  const counters = getStoredCounters();
  const num = isEngine ? counters.engine : counters.battery;

  return `${prefix}${String(num).padStart(3, '0')}`;
}

export function incrementFormCounter(type: MachineType) {
  const counters = getStoredCounters();
  if (type === 'ENGINE') {
    counters.engine += 1;
  } else {
    counters.battery += 1;
  }
  try {
    localStorage.setItem(FORM_COUNTER_KEY, JSON.stringify(counters));
  } catch (e) {
    console.error('Failed to increment form counter', e);
  }
}
