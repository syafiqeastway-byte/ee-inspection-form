export type MachineType = 'BATTERY' | 'ENGINE';
export type InspectionType = '1ST INSPECTION' | 'PRE DELIVERY INSPECTION (PDI)';
export type MachineLocation = 'IJOK WAREHOUSE' | 'PENANG WAREHOUSE' | 'SITE';
export type ChecklistStatus = 'OK' | 'NOT OK' | 'N/A';
export type OverallInspectionStatus = 'PASS' | 'FAILED' | 'FAILED & MISUSE';

export interface ChecklistItem {
  name: string;
  label: string;
}

export interface ChecklistSection {
  id: string;
  title: string;
  commentName: string;
  commentRequired: boolean;
  commentLabel: string;
  items: ChecklistItem[];
}

export interface PictureFieldConfig {
  key: string;
  label: string;
  required: boolean;
  hint?: string;
}

export interface PmaRecord {
  pmaNumber: string;
  brand: string;
  model: string;
  serial: string;
  type: MachineType;
  category?: 'SCISSORLIFT' | 'BOOMLIFT' | 'OTHER';
}

export interface InspectionFormData {
  formNo: string;
  machineType: MachineType;
  typeOfInspection: InspectionType | '';
  pmaNumber: string;
  brand: string;
  model: string;
  serial: string;
  hourMeter: string | number;
  machineLocation: MachineLocation | '';
  siteLocation: string;
  checklistAnswers: Record<string, ChecklistStatus>;
  sectionComments: Record<string, string>;
  pictures: Record<string, string>; // key -> base64
  overallComment: string;
  inspectionStatus: OverallInspectionStatus | '';
  technicianName: string;
  signatureDataUrl?: string;
  inspectionDate: string;
  inspectionTime: string;
}

export interface SavedInspectionRecord extends InspectionFormData {
  id: string;
  submittedAt: string;
}
