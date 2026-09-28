import React, { useState, useEffect, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Camera,
  History,
  Database,
  BookOpen,
  Send,
  Loader2,
  ExternalLink,
  Info,
  SlidersHorizontal,
  CheckCheck,
  RotateCcw,
  Search,
  ChevronDown,
  PlusCircle
} from 'lucide-react';

import {
  MachineType,
  InspectionType,
  MachineLocation,
  ChecklistStatus,
  OverallInspectionStatus,
  SavedInspectionRecord,
  PmaRecord
} from './types/inspection';

import {
  batterySections,
  engineSections,
  batteryPictureFieldsConfig,
  enginePictureFieldsConfig
} from './data/inspectionConfig';

import {
  getStoredPmaDatabase,
  savePmaDatabase,
  searchPma
} from './data/pmaDatabase';

import {
  generateNextFormNumber,
  incrementFormCounter
} from './utils/formNumberGenerator';

import {
  fetchBackendFormNo,
  fetchBackendPmaList,
  searchBackendPmaNumber,
  uploadSingleImageToDrive,
  uploadPdfToDrive,
  saveInspectionToGoogleSheet,
  hasGoogleScriptRun,
  SPREADSHEET_ID
} from './services/backendApi';

import { generateInspectionPdf } from './utils/pdfGenerator';

import { ChecklistSectionCard } from './components/ChecklistSectionCard';
import { PhotoCaptureCard } from './components/PhotoCaptureCard';
import { PhotoLightbox } from './components/PhotoLightbox';
import { InspectionHistoryModal } from './components/InspectionHistoryModal';
import { InspectionReportPrint } from './components/InspectionReportPrint';
import { PmaManagerModal } from './components/PmaManagerModal';
import { ManualsViewerModal } from './components/ManualsViewerModal';
import { ToastContainer, ToastMessage } from './components/Toast';

const LOCAL_STORAGE_INSPECTIONS_KEY = 'eastway_inspections_history_v1';

export default function App() {
  // Current active date and time
  const getTodayDate = () => new Date().toISOString().slice(0, 10);
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // Form State
  const [machineType, setMachineType] = useState<MachineType>('BATTERY');
  const [formNo, setFormNo] = useState<string>('');
  const [typeOfInspection, setTypeOfInspection] = useState<InspectionType | ''>('');
  const [pmaNumber, setPmaNumber] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [model, setModel] = useState<string>('');
  const [serial, setSerial] = useState<string>('');
  const [hourMeter, setHourMeter] = useState<string>('');
  const [machineLocation, setMachineLocation] = useState<MachineLocation | ''>('');
  const [siteLocation, setSiteLocation] = useState<string>('');
  
  const [checklistAnswers, setChecklistAnswers] = useState<Record<string, ChecklistStatus>>({});
  const [sectionComments, setSectionComments] = useState<Record<string, string>>({});
  const [pictures, setPictures] = useState<Record<string, string>>({});
  
  const [overallComment, setOverallComment] = useState<string>('');
  const [inspectionStatus, setInspectionStatus] = useState<OverallInspectionStatus | ''>('');
  const [technicianName, setTechnicianName] = useState<string>('');
  const [inspectionDate, setInspectionDate] = useState<string>(getTodayDate());
  const [inspectionTime, setInspectionTime] = useState<string>(getCurrentTime());

  // PMA Registry & Autocomplete Dropdown state
  const [pmaDatabase, setPmaDatabase] = useState<PmaRecord[]>([]);
  const [pmaDropdownOpen, setPmaDropdownOpen] = useState(false);
  const [isPmaAutoFilled, setIsPmaAutoFilled] = useState(false);
  const pmaInputContainerRef = useRef<HTMLDivElement | null>(null);

  // App Navigation & Modals
  const [activeTab, setActiveTab] = useState<'form' | 'history' | 'pma' | 'manuals'>('form');
  const [savedInspections, setSavedInspections] = useState<SavedInspectionRecord[]>([]);
  const [selectedRecordForReport, setSelectedRecordForReport] = useState<SavedInspectionRecord | null>(null);

  // Lightbox State
  const [lightboxState, setLightboxState] = useState<{ isOpen: boolean; imageUrl: string; title: string }>({
    isOpen: false,
    imageUrl: '',
    title: ''
  });

  // UI State: Submitting & Toasts
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgressText, setSubmitProgressText] = useState('');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Initialize DB and Form Number
  useEffect(() => {
    // Auto-update date and time
    const updateDateTime = () => {
      setInspectionDate(getTodayDate());
      setInspectionTime(getCurrentTime());
    };
    updateDateTime();
    const timer = setInterval(updateDateTime, 10000);

    // Load PMA database from local storage initially
    const dbs = getStoredPmaDatabase();
    setPmaDatabase(dbs);

    // Load Inspection History
    try {
      const rawHistory = localStorage.getItem(LOCAL_STORAGE_INSPECTIONS_KEY);
      if (rawHistory) {
        const parsed = JSON.parse(rawHistory);
        if (Array.isArray(parsed)) {
          setSavedInspections(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to load inspection history', e);
    }

    // Set initial form number from Google Sheet BATTERY sheet
    fetchBackendFormNo('BATTERY').then((num) => setFormNo(num));

    return () => clearInterval(timer);
  }, []);

  // Sync Form Number when Machine Type switches from Google Sheet (BATTERY / ENGINE sheet last row)
  useEffect(() => {
    setFormNo('Loading Form No...');
    fetchBackendFormNo(machineType).then((num) => {
      setFormNo(num);
    });
  }, [machineType]);

  // Click outside PMA dropdown handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pmaInputContainerRef.current && !pmaInputContainerRef.current.contains(e.target as Node)) {
        setPmaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Toast Helper
  const showToast = (message: string, type: ToastMessage['type'] = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Active configurations based on Machine Type
  const currentSections = useMemo(() => {
    return machineType === 'ENGINE' ? engineSections : batterySections;
  }, [machineType]);

  const currentPictureConfigs = useMemo(() => {
    return machineType === 'ENGINE' ? enginePictureFieldsConfig : batteryPictureFieldsConfig;
  }, [machineType]);

  // PMA Selection & Lookup Logic
  const handlePmaSelect = async (pmaItem: PmaRecord) => {
    setPmaNumber(pmaItem.pmaNumber);
    setPmaDropdownOpen(false);

    if (pmaItem.brand && pmaItem.model && pmaItem.serial) {
      setBrand(pmaItem.brand);
      setModel(pmaItem.model);
      setSerial(pmaItem.serial);
      if (pmaItem.type && pmaItem.type !== machineType) {
        setMachineType(pmaItem.type);
      }
      setIsPmaAutoFilled(true);
      showToast(`Machine details loaded for ${pmaItem.pmaNumber}`, 'info');
    } else {
      const res = await searchBackendPmaNumber(pmaItem.pmaNumber);
      if (res.found && res.brand) {
        setBrand(res.brand);
        setModel(res.model || '');
        setSerial(res.serial || '');
        if (res.type && res.type !== machineType) {
          setMachineType(res.type);
        }
        setIsPmaAutoFilled(true);
        showToast(`Machine details loaded for ${pmaItem.pmaNumber}`, 'info');
      } else {
        setIsPmaAutoFilled(false);
      }
    }
  };

  const handlePmaInputChange = async (val: string) => {
    const upper = val.toUpperCase();
    setPmaNumber(upper);
    setPmaDropdownOpen(true);

    if (!upper.trim()) {
      setIsPmaAutoFilled(false);
      return;
    }

    const found = searchPma(upper, pmaDatabase);
    if (found && found.brand) {
      setBrand(found.brand);
      setModel(found.model);
      setSerial(found.serial);
      if (found.type !== machineType) {
        setMachineType(found.type);
      }
      setIsPmaAutoFilled(true);
    } else {
      const res = await searchBackendPmaNumber(upper);
      if (res.found && res.brand) {
        setBrand(res.brand);
        setModel(res.model || '');
        setSerial(res.serial || '');
        if (res.type && res.type !== machineType) {
          setMachineType(res.type);
        }
        setIsPmaAutoFilled(true);
      } else {
        setIsPmaAutoFilled(false);
      }
    }
  };

  // Filtered list for PMA Autocomplete Dropdown - Show ALL items from PMA database
  const matchingPmas = useMemo(() => {
    if (!pmaNumber.trim()) return pmaDatabase;
    const query = pmaNumber.trim().toUpperCase();
    return pmaDatabase.filter(
      (item) =>
        item.pmaNumber.toUpperCase().includes(query) ||
        item.brand.toUpperCase().includes(query) ||
        item.model.toUpperCase().includes(query) ||
        item.serial.toUpperCase().includes(query)
    );
  }, [pmaNumber, pmaDatabase]);

  // Checklist Action Handlers
  const handleChecklistStatusChange = (itemKey: string, status: ChecklistStatus) => {
    setChecklistAnswers((prev) => ({ ...prev, [itemKey]: status }));
  };

  const handleSectionCommentChange = (commentKey: string, value: string) => {
    setSectionComments((prev) => ({ ...prev, [commentKey]: value }));
  };

  const handleMarkSectionAllOk = (items: { name: string; label: string }[]) => {
    setChecklistAnswers((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        next[item.name] = 'OK';
      });
      return next;
    });
    showToast('All items in section set to OK', 'info');
  };

  const handleUnmarkSection = (items: { name: string; label: string }[]) => {
    setChecklistAnswers((prev) => {
      const next = { ...prev };
      items.forEach((item) => {
        delete next[item.name];
      });
      return next;
    });
    showToast('Section items unmarked', 'info');
  };

  const handleQuickMarkAllSectionsOk = () => {
    setChecklistAnswers((prev) => {
      const next = { ...prev };
      currentSections.forEach((sec) => {
        sec.items.forEach((item) => {
          if (!next[item.name]) {
            next[item.name] = 'OK';
          }
        });
      });
      return next;
    });
    showToast('All remaining checklist items set to OK', 'success');
  };

  const handleUnmarkAllChecklist = () => {
    setChecklistAnswers({});
    showToast('All checklist items unmarked', 'info');
  };

  // Picture Action Handlers
  const handlePictureChange = (key: string, base64: string) => {
    setPictures((prev) => ({ ...prev, [key]: base64 }));
    showToast('Photo uploaded & compressed', 'success');
  };

  const handlePictureRemove = (key: string) => {
    setPictures((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handlePicturePreview = (key: string, title: string) => {
    const imgUrl = pictures[key];
    if (imgUrl) {
      setLightboxState({ isOpen: true, imageUrl: imgUrl, title });
    }
  };

  // Machine Type Switcher with confirmation if user already started
  const handleMachineTypeChange = (newType: MachineType) => {
    if (newType === machineType) return;
    const hasData = Object.keys(checklistAnswers).length > 0 || Object.keys(pictures).length > 0;
    if (hasData) {
      if (!confirm(`Switching machine type to ${newType} will reset the current checklist answers and photos. Proceed?`)) {
        return;
      }
    }
    setMachineType(newType);
    setChecklistAnswers({});
    setPictures({});
    setSectionComments({});
  };

  // PMA Fleet management callbacks
  const handleAddPmaToDb = (newRecord: PmaRecord) => {
    const updated = [newRecord, ...pmaDatabase];
    setPmaDatabase(updated);
    savePmaDatabase(updated);
    showToast(`Machine ${newRecord.pmaNumber} registered to fleet database`, 'success');
  };

  const handleDeletePmaFromDb = (pmaNum: string) => {
    const updated = pmaDatabase.filter((i) => i.pmaNumber !== pmaNum);
    setPmaDatabase(updated);
    savePmaDatabase(updated);
    showToast(`Machine ${pmaNum} removed from fleet`, 'info');
  };

  // Reset Entire Form
  const resetFormState = () => {
    const nextFormNum = generateNextFormNumber(machineType);
    setFormNo(nextFormNum);
    setTypeOfInspection('');
    setPmaNumber('');
    setBrand('');
    setModel('');
    setSerial('');
    setHourMeter('');
    setMachineLocation('');
    setSiteLocation('');
    setChecklistAnswers({});
    setSectionComments({});
    setPictures({});
    setOverallComment('');
    setInspectionStatus('');
    setTechnicianName('');
    setInspectionDate(getTodayDate());
    setInspectionTime(getCurrentTime());
    setIsPmaAutoFilled(false);
  };

  // Form Submission Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validate Required General Fields
    if (!typeOfInspection) {
      showToast('Please select Type of Inspection (1st Inspection or PDI)', 'warning');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!pmaNumber.trim()) {
      showToast('Please enter or select a PMA Number', 'warning');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (!machineLocation) {
      showToast('Please select Machine Location', 'warning');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 2. Validate Checklist Items
    const unansweredItems: string[] = [];
    currentSections.forEach((sec) => {
      sec.items.forEach((item) => {
        if (!checklistAnswers[item.name]) {
          unansweredItems.push(item.label);
        }
      });
    });

    if (unansweredItems.length > 0) {
      showToast(
        `Please complete all inspection checklist items (${unansweredItems.length} items remaining)`,
        'warning'
      );
      const firstSectionEl = document.getElementById('checklist-container');
      if (firstSectionEl) firstSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // 3. Validate Required Section Comments (e.g. Battery readings or Engine alternator output)
    for (const sec of currentSections) {
      if (sec.commentRequired && !sectionComments[sec.commentName]?.trim()) {
        showToast(`Please fill in required readings/comments for "${sec.title}"`, 'warning');
        return;
      }
    }

    // 4. Validate Required Pictures
    for (const cfg of currentPictureConfigs) {
      if (cfg.required && !pictures[cfg.key]) {
        showToast(`Please capture/upload required photo for "${cfg.label}"`, 'warning');
        const picturesSec = document.getElementById('pictures-section');
        if (picturesSec) picturesSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }

    // 5. Validate Sign-off
    if (!inspectionStatus) {
      showToast('Please select Final Inspection Status (PASS / FAILED)', 'warning');
      return;
    }

    if (!technicianName.trim()) {
      showToast('Please enter Technician / Inspector Name', 'warning');
      return;
    }

    // Submit Process
    setIsSubmitting(true);
    setSubmitProgressText('UPLOADING PHOTOS...');

    const uploadedUrlMap: Record<string, string> = {};
    const activeKeys = currentPictureConfigs.map((cfg) => cfg.key);

    try {
      // 1. Parallel Upload of all active images to Google Drive
      const uploadPromises = activeKeys.map(async (key) => {
        const base64Data = pictures[key];
        if (base64Data) {
          const res = await uploadSingleImageToDrive(base64Data, key, pmaNumber);
          return { key, success: res.success, url: res.url || base64Data };
        }
        return { key, success: true, url: '' };
      });

      const results = await Promise.all(uploadPromises);
      for (const res of results) {
        if (res.success) {
          uploadedUrlMap[res.key] = res.url;
        } else {
          throw new Error(`Upload failed for photo: ${res.key}`);
        }
      }
    } catch (uploadErr: any) {
      console.error('Image upload error:', uploadErr);
      showToast(`Photo upload notice: ${uploadErr.message || uploadErr}`, 'warning');
      // Continue with local preview if offline
    }

    const activeFormNo = (formNo && formNo !== 'Loading Form No...') ? formNo : generateNextFormNumber(machineType);

    // 2. Generate PDF Document & Upload to Google Drive (Battery / Engine Folder)
    let pdfUrl = '';
    let generatedPdfBase64 = '';

    const tempRecord: SavedInspectionRecord = {
      id: 'insp_' + Date.now().toString(36),
      formNo: activeFormNo,
      machineType,
      typeOfInspection,
      pmaNumber: pmaNumber.trim().toUpperCase(),
      brand: brand.trim().toUpperCase(),
      model: model.trim().toUpperCase(),
      serial: serial.trim().toUpperCase(),
      hourMeter,
      machineLocation,
      siteLocation: siteLocation ? siteLocation.trim().toUpperCase() : 'NA',
      checklistAnswers,
      sectionComments,
      pictures,
      overallComment: overallComment.trim().toUpperCase(),
      inspectionStatus,
      technicianName: technicianName.trim().toUpperCase(),
      inspectionDate,
      inspectionTime,
      submittedAt: new Date().toLocaleString()
    };

    try {
      setSubmitProgressText('GENERATING PDF REPORT...');
      const pdfResult = await generateInspectionPdf(tempRecord);
      generatedPdfBase64 = pdfResult.base64;

      setSubmitProgressText('UPLOADING PDF TO GOOGLE DRIVE...');
      const pdfUploadRes = await uploadPdfToDrive(pdfResult.base64, machineType, activeFormNo);
      if (pdfUploadRes && pdfUploadRes.url) {
        pdfUrl = pdfUploadRes.url;
      }
    } catch (pdfErr) {
      console.warn('PDF generation/upload notice:', pdfErr);
    }

    setSubmitProgressText('SAVING TO GOOGLE SHEET...');

    // 3. Build structured payload matching Google Sheets (BATTERY / ENGINE sheet)
    const inspectionPayload = {
      machineType,
      formNo: activeFormNo,
      typeOfInspection,
      pmaNumber: pmaNumber.trim().toUpperCase(),
      brand: brand.trim().toUpperCase(),
      model: model.trim().toUpperCase(),
      serial: serial.trim().toUpperCase(),
      hourMeter,
      machineLocation,
      siteLocation: siteLocation ? siteLocation.trim().toUpperCase() : 'NA',
      checklistAnswers,
      sectionComments,
      pictures: uploadedUrlMap,
      pdfUrl,
      overallComment: overallComment.trim().toUpperCase(),
      inspectionStatus,
      technicianName: technicianName.trim().toUpperCase(),
      inspectionDate,
      inspectionTime
    };

    let confirmedFormNo = inspectionPayload.formNo;

    try {
      const saveRes = await saveInspectionToGoogleSheet(inspectionPayload);
      if (saveRes && saveRes.success) {
        if (saveRes.formNo) confirmedFormNo = saveRes.formNo;
        showToast(`Record ${confirmedFormNo} & PDF saved to Google Sheet!`, 'success');
      } else if (saveRes && saveRes.error) {
        showToast(`Saved locally. Notice: ${saveRes.error}`, 'warning');
      }
    } catch (saveErr: any) {
      console.warn('Google Sheet save error:', saveErr);
      showToast(`Saved locally. Notice: ${saveErr.message || saveErr}`, 'warning');
    }

    const newRecord: SavedInspectionRecord = {
      ...tempRecord,
      formNo: confirmedFormNo,
      pdfUrl,
      pdfBase64: generatedPdfBase64
    };

    // Save to localStorage history
    const updatedHistory = [newRecord, ...savedInspections];
    setSavedInspections(updatedHistory);
    try {
      localStorage.setItem(LOCAL_STORAGE_INSPECTIONS_KEY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.warn('LocalStorage quota limit warning:', err);
    }

    // Increment counter for next form
    incrementFormCounter(machineType);

    // If PMA is not already in database, auto-register it to fleet directory
    const existingPma = searchPma(pmaNumber, pmaDatabase);
    if (!existingPma) {
      const newPmaEntry: PmaRecord = {
        pmaNumber: pmaNumber.trim().toUpperCase(),
        brand: brand.trim().toUpperCase(),
        model: model.trim().toUpperCase(),
        serial: serial.trim().toUpperCase(),
        type: machineType,
        category: machineType === 'BATTERY' ? 'SCISSORLIFT' : 'BOOMLIFT'
      };
      const updatedPmaDb = [newPmaEntry, ...pmaDatabase];
      setPmaDatabase(updatedPmaDb);
      savePmaDatabase(updatedPmaDb);
    }

    setIsSubmitting(false);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {
      // ignore
    }

    showToast(`Inspection ${confirmedFormNo} submitted successfully!`, 'success');

    // Prompt user to view report or start new
    setSelectedRecordForReport(newRecord);
    resetFormState();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteInspectionRecord = (id: string) => {
    const filtered = savedInspections.filter((r) => r.id !== id);
    setSavedInspections(filtered);
    try {
      localStorage.setItem(LOCAL_STORAGE_INSPECTIONS_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.error(e);
    }
    showToast('Record deleted from local storage', 'info');
  };

  // If viewing a printable report
  if (selectedRecordForReport) {
    return (
      <InspectionReportPrint
        record={selectedRecordForReport}
        onBack={() => setSelectedRecordForReport(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-16 text-slate-900 selection:bg-blue-200">
      
      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6">

        {/* Primary Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* CARD 1: GENERAL MACHINE INFO */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-4 sm:px-6 py-3.5 flex items-center gap-3.5">
              <div className="flex-shrink-0">
                <img
                  src="/ee-logo.png"
                  alt="EE LOGO"
                  className="h-10 sm:h-12 w-auto max-w-[140px] sm:max-w-[170px] object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (!target.dataset.triedFallback) {
                      target.dataset.triedFallback = 'true';
                      target.src = '/EE%20LOGO.png';
                    }
                  }}
                />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase tracking-wide">DIGITAL INSPECTION FORM</h2>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Machine Type Selection Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Machine Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={machineType}
                    onChange={(e) => handleMachineTypeChange(e.target.value as MachineType)}
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 font-bold border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  >
                    <option value="BATTERY">BATTERY TYPE</option>
                    <option value="ENGINE">ENGINE TYPE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Form No. (Auto-Generated)
                  </label>
                  <input
                    type="text"
                    value={formNo}
                    readOnly
                    className="w-full px-3.5 py-2.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Type of Inspection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Type of Inspection <span className="text-red-500">*</span>
                </label>
                <select
                  value={typeOfInspection}
                  onChange={(e) => setTypeOfInspection(e.target.value as InspectionType)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="" disabled>Select Inspection Type</option>
                  <option value="1ST INSPECTION">1ST INSPECTION</option>
                  <option value="PRE DELIVERY INSPECTION (PDI)">PRE DELIVERY INSPECTION (PDI)</option>
                </select>
              </div>

              {/* PMA Search & Autocomplete Input */}
              <div className="relative" ref={pmaInputContainerRef}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PMA Number <span className="text-red-500">*</span>
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={pmaNumber}
                    onChange={(e) => handlePmaInputChange(e.target.value)}
                    onFocus={() => setPmaDropdownOpen(true)}
                    onClick={() => setPmaDropdownOpen(true)}
                    placeholder="Select or type PMA Number..."
                    autoComplete="off"
                    required
                    className="w-full pl-3.5 pr-16 py-2.5 bg-white text-slate-900 uppercase font-bold border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm cursor-text"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400">
                    <button
                      type="button"
                      onClick={() => setPmaDropdownOpen(!pmaDropdownOpen)}
                      className="p-1 hover:text-blue-600 text-slate-400 transition-colors"
                      title="Toggle full PMA fleet list"
                    >
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${pmaDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                    </button>
                    <Search className="w-4 h-4 mr-1 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Autocomplete & Complete Fleet Dropdown */}
                {pmaDropdownOpen && matchingPmas.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-slate-300 rounded-xl shadow-2xl max-h-80 overflow-y-auto divide-y divide-slate-100">
                    <div className="sticky top-0 bg-slate-100 px-3.5 py-2 text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between border-b border-slate-200 z-10">
                      <span>FLEET DIRECTORY ({matchingPmas.length} {matchingPmas.length === 1 ? 'MACHINE' : 'MACHINES'})</span>
                      <span className="text-[10px] text-slate-500 font-normal">Click to auto-fill</span>
                    </div>
                    {matchingPmas.map((item) => (
                      <button
                        key={item.pmaNumber}
                        type="button"
                        onClick={() => handlePmaSelect(item)}
                        className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between text-xs group"
                      >
                        <span className="font-bold text-blue-900 group-hover:text-blue-700">{item.pmaNumber}</span>
                        {item.model && (
                          <span className="text-slate-600 font-semibold text-xs">
                            {item.model}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {isPmaAutoFilled && (
                  <div className="mt-1.5 flex items-center justify-between text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-1.5 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Auto-filled from PMA database ({brand} {model})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPmaAutoFilled(false)}
                      className="text-emerald-800 underline text-[11px] font-bold hover:text-emerald-950"
                    >
                      Unlock & Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Equipment Brand & Model */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Equipment Brand <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value.toUpperCase())}
                    readOnly={isPmaAutoFilled}
                    required
                    className={`w-full px-3.5 py-2.5 uppercase border rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isPmaAutoFilled
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Equipment Model <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value.toUpperCase())}
                    readOnly={isPmaAutoFilled}
                    required
                    className={`w-full px-3.5 py-2.5 uppercase border rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isPmaAutoFilled
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>
              </div>

              {/* Serial Number & Hour Meter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Serial Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                    readOnly={isPmaAutoFilled}
                    required
                    className={`w-full px-3.5 py-2.5 uppercase font-mono border rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      isPmaAutoFilled
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-900 border-slate-300 focus:ring-2 focus:ring-blue-600'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Hour Meter <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={hourMeter}
                    onChange={(e) => setHourMeter(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 font-mono font-semibold border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Machine Location & Site */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Machine Location <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={machineLocation}
                    onChange={(e) => setMachineLocation(e.target.value as MachineLocation)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  >
                    <option value="" disabled>Select Location</option>
                    <option value="IJOK WAREHOUSE">IJOK WAREHOUSE</option>
                    <option value="PENANG WAREHOUSE">PENANG WAREHOUSE</option>
                    <option value="SITE">SITE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Site Location
                  </label>
                  <input
                    type="text"
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value.toUpperCase())}
                    placeholder='Put "NA" if not available'
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 uppercase border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: INSPECTION MANUALS QUICK REFERENCE */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-5 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide">
                MANUAL MACHINE INSPECTION
              </h3>
            </div>

            <div className="p-4 sm:p-5">
              <p className="text-xs sm:text-sm text-slate-600 mb-3">
                Please refer to the manual below before starting the inspection:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://drive.google.com/file/d/1ilBECb6TOMXN5wiSrFeAN35a0kGAuFDq/view?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs rounded-lg transition-colors text-center shadow-sm"
                >
                  <span>📘 MANUAL MACHINE INSPECTION (SCISSORLIFT TYPE)</span>
                </a>

                <a
                  href="https://drive.google.com/file/d/1aIcBw3L6JEWnb0AxhaSodQW0RtYhadk_/view?usp=drive_link"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-lg transition-colors text-center shadow-sm"
                >
                  <span>📙 MANUAL MACHINE INSPECTION (BOOMLIFT TYPE)</span>
                </a>
              </div>
            </div>
          </div>

          {/* CARD 3: DYNAMIC CHECKLIST SECTION */}
          <div id="checklist-container" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-sm sm:text-base font-bold text-slate-800 uppercase">
                {machineType} TYPE CHECKLIST
              </h2>

              {/* Master Fast-Fill & Unmark Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleQuickMarkAllSectionsOk}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                  title="Mark all remaining unselected items across all sections as OK"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Mark All as OK</span>
                </button>

                {Object.keys(checklistAnswers).length > 0 && (
                  <button
                    type="button"
                    onClick={handleUnmarkAllChecklist}
                    className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg shadow-sm transition-colors border border-slate-600"
                    title="Clear / unmark all checklist answers"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Unmark All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Checklist Section Cards */}
            {currentSections.map((section) => (
              <ChecklistSectionCard
                key={section.id}
                section={section}
                answers={checklistAnswers}
                commentValue={sectionComments[section.commentName] || ''}
                onStatusChange={handleChecklistStatusChange}
                onCommentChange={handleSectionCommentChange}
                onMarkAllOk={handleMarkSectionAllOk}
                onUnmarkSection={handleUnmarkSection}
              />
            ))}
          </div>

          {/* CARD 4: OVERALL & SIGN-OFF (Directly below OTHERS section) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-5 py-3.5">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide">OVERALL & SIGN-OFF</h3>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              {/* Overall Comment */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Overall Comment <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overallComment}
                  onChange={(e) => setOverallComment(e.target.value.toUpperCase())}
                  required
                  rows={3}
                  placeholder="ENTER FINAL REMARKS HERE..."
                  className="w-full px-3.5 py-2.5 bg-white text-slate-900 uppercase border border-slate-300 rounded-xl text-xs sm:text-sm font-sans focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                />
              </div>

              {/* Status & Inspector Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Inspection Status <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={inspectionStatus}
                    onChange={(e) => setInspectionStatus(e.target.value as OverallInspectionStatus)}
                    required
                    className="w-full px-3.5 py-2.5 font-bold border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 transition-all bg-white text-slate-900"
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="PASS">PASS</option>
                    <option value="FAILED">FAILED</option>
                    <option value="FAILED & MISUSE">FAILED & MISUSE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Technician / Inspector Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value.toUpperCase())}
                    required
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 uppercase font-semibold border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Inspection Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Inspection Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={inspectionDate}
                    onChange={(e) => setInspectionDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      AUTO SET
                    </span>
                  </div>
                  <input
                    type="time"
                    value={inspectionTime}
                    readOnly
                    required
                    className="w-full px-3.5 py-2.5 bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold cursor-default"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 5: PICTURES UPLOAD SECTION */}
          <div id="pictures-section" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-700 text-white px-5 py-3.5 border-b border-slate-600">
              <h3 className="text-sm sm:text-base font-bold uppercase tracking-wide">
                {machineType} TYPE - PICTURES SECTION
              </h3>
            </div>

            <div className="p-4 sm:p-6">
              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Please upload all required photos for this machine type before submitting.
              </p>

              {/* Photo Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentPictureConfigs.map((cfg) => (
                  <PhotoCaptureCard
                    key={cfg.key}
                    fieldKey={cfg.key}
                    label={cfg.label}
                    required={cfg.required}
                    hint={cfg.hint}
                    imageValue={pictures[cfg.key]}
                    onImageChange={handlePictureChange}
                    onImageRemove={handlePictureRemove}
                    onPreview={handlePicturePreview}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* SUBMIT BUTTON AT THE VERY BOTTOM */}
          <div className="pt-2 pb-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white font-bold text-base sm:text-lg rounded-xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-75 disabled:cursor-not-allowed touch-manipulation"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>{submitProgressText || 'SUBMITTING INSPECTION...'}</span>
                </>
              ) : (
                <span>SUBMIT INSPECTION</span>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* MODALS */}
      {/* Lightbox for Photos */}
      <PhotoLightbox
        isOpen={lightboxState.isOpen}
        imageUrl={lightboxState.imageUrl}
        title={lightboxState.title}
        onClose={() => setLightboxState({ isOpen: false, imageUrl: '', title: '' })}
      />

      {/* History Records Modal */}
      <InspectionHistoryModal
        isOpen={activeTab === 'history'}
        onClose={() => setActiveTab('form')}
        records={savedInspections}
        onViewRecord={(rec) => {
          setSelectedRecordForReport(rec);
          setActiveTab('form');
        }}
        onDeleteRecord={deleteInspectionRecord}
      />

      {/* PMA Database Fleet Directory Modal */}
      <PmaManagerModal
        isOpen={activeTab === 'pma'}
        onClose={() => setActiveTab('form')}
        pmaList={pmaDatabase}
        onAddPma={handleAddPmaToDb}
        onDeletePma={handleDeletePmaFromDb}
        onSelectPma={(rec) => {
          handlePmaSelect(rec);
          setActiveTab('form');
        }}
      />

      {/* Manuals SOP Modal */}
      <ManualsViewerModal
        isOpen={activeTab === 'manuals'}
        onClose={() => setActiveTab('form')}
      />

      {/* Toast System */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
