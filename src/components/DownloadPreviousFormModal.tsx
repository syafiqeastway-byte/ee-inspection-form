import React, { useState } from 'react';
import {
  X,
  Search,
  Download,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  User,
  ExternalLink,
  Eye
} from 'lucide-react';
import { SavedInspectionRecord } from '../types/inspection';
import { fetchInspectionRecordByFormNo } from '../services/backendApi';
import { generateInspectionPdf } from '../utils/pdfGenerator';

interface DownloadPreviousFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  localRecords: SavedInspectionRecord[];
  onViewRecord: (record: SavedInspectionRecord) => void;
  onToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const DownloadPreviousFormModal: React.FC<DownloadPreviousFormModalProps> = ({
  isOpen,
  onClose,
  localRecords,
  onViewRecord,
  onToast
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<SavedInspectionRecord | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  if (!isOpen) return null;

  // Generate dynamic form number suggestions as user types (e.g. "122" -> "EE-IFB-122", "EE-IFE-122")
  const getSuggestions = (rawInput: string) => {
    const trimmed = rawInput.trim();
    if (!trimmed) return [];

    const suggestions: Array<{ label: string; value: string; type?: string }> = [];
    const digitsOnly = trimmed.replace(/[^0-9]/g, '');

    if (digitsOnly.length > 0) {
      const padNum = digitsOnly.length < 3 ? digitsOnly.padStart(3, '0') : digitsOnly;
      suggestions.push({
        label: `EE-IFB-${padNum}`,
        value: `EE-IFB-${padNum}`,
        type: 'BATTERY TYPE'
      });
      suggestions.push({
        label: `EE-IFE-${padNum}`,
        value: `EE-IFE-${padNum}`,
        type: 'ENGINE TYPE'
      });
      if (padNum !== digitsOnly) {
        suggestions.push({
          label: `EE-IFB-${digitsOnly}`,
          value: `EE-IFB-${digitsOnly}`,
          type: 'BATTERY TYPE'
        });
        suggestions.push({
          label: `EE-IFE-${digitsOnly}`,
          value: `EE-IFE-${digitsOnly}`,
          type: 'ENGINE TYPE'
        });
      }
    } else {
      const cleanUpper = trimmed.toUpperCase();
      if (!cleanUpper.startsWith('EE-')) {
        suggestions.push({
          label: `EE-IFE-${cleanUpper}`,
          value: `EE-IFE-${cleanUpper}`,
          type: 'ENGINE TYPE'
        });
        suggestions.push({
          label: `EE-IFB-${cleanUpper}`,
          value: `EE-IFB-${cleanUpper}`,
          type: 'BATTERY TYPE'
        });
      }
    }

    // Deduplicate suggestions
    const seen = new Set<string>();
    return suggestions.filter((s) => {
      if (seen.has(s.value)) return false;
      seen.add(s.value);
      return true;
    });
  };

  const suggestions = getSuggestions(inputQuery);

  const handleSearchAndSelect = async (queryToSearch: string) => {
    const q = (queryToSearch || inputQuery).trim();
    if (!q) {
      setErrorMessage('Please enter a Form Number (e.g. EE-IFB-99 or EE-IFE-25)');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSelectedRecord(null);

    try {
      const record = await fetchInspectionRecordByFormNo(q, localRecords);
      if (record) {
        setSelectedRecord(record);
        setInputQuery(record.formNo);
      } else {
        setErrorMessage(`Form "${q}" was not found in records or Google Sheets.`);
      }
    } catch (err: any) {
      setErrorMessage(`Search error: ${err?.message || 'Could not fetch record'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (recordToDownload?: SavedInspectionRecord) => {
    const rec = recordToDownload || selectedRecord;
    if (!rec) return;

    setIsGeneratingPdf(true);
    try {
      const { blob } = await generateInspectionPdf(rec);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const fileName = `${rec.formNo || 'INSPECTION_FORM'}.pdf`.replace(/[\/\\]/g, '_');
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onToast(`PDF for ${rec.formNo} downloaded successfully!`, 'success');
    } catch (err: any) {
      console.error('PDF Generation error:', err);
      onToast(`Failed to generate PDF: ${err?.message || 'Unknown error'}`, 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-wide">Download Previous Inspection Form</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-7 pb-12 sm:pb-16 space-y-6 overflow-y-auto flex-1 min-h-[280px]">
          {/* Form Number Search Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Enter Form Number:
            </label>
            <div className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. EE-IFB-99 or EE-IFE-25"
                    value={inputQuery}
                    onChange={(e) => {
                      setInputQuery(e.target.value);
                      setShowSuggestions(true);
                      setErrorMessage(null);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setShowSuggestions(false);
                        handleSearchAndSelect(inputQuery);
                      }
                    }}
                    className="w-full pl-9 pr-3 py-2.5 bg-white text-slate-900 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuggestions(false);
                    handleSearchAndSelect(inputQuery);
                  }}
                  disabled={isLoading || !inputQuery.trim()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Find Form</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dynamic Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 right-28 top-full mt-1.5 z-30 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in duration-100">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Suggested Form Numbers:
                  </div>
                  <div className="max-h-44 overflow-y-auto divide-y divide-slate-100">
                    {suggestions.map((sug) => (
                      <button
                        key={sug.value}
                        type="button"
                        onClick={() => {
                          setInputQuery(sug.value);
                          setShowSuggestions(false);
                          handleSearchAndSelect(sug.value);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs hover:bg-blue-50 flex items-center justify-between transition-colors cursor-pointer"
                      >
                        <span className="font-mono font-bold text-blue-700">{sug.label}</span>
                        {sug.type && (
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {sug.type}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Error Message Notice */}
          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Record Not Found</p>
                <p className="mt-0.5 text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Result Card: When a record is found */}
          {selectedRecord && (
            <div className="bg-slate-50 border-2 border-blue-400 rounded-xl p-4.5 space-y-4 shadow-sm animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-black text-slate-900">
                    {selectedRecord.formNo}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-800 font-bold text-[10px] rounded uppercase">
                    {selectedRecord.machineType} TYPE
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                      selectedRecord.inspectionStatus === 'PASS'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {selectedRecord.inspectionStatus === 'PASS' ? (
                      <CheckCircle2 className="w-3 h-3" />
                    ) : (
                      <AlertTriangle className="w-3 h-3" />
                    )}
                    {selectedRecord.inspectionStatus}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {selectedRecord.inspectionDate} {selectedRecord.inspectionTime}
                  </span>
                </div>
              </div>

              {/* Machine Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">PMA Number</span>
                  <span className="font-bold text-blue-700">{selectedRecord.pmaNumber || '-'}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Equipment</span>
                  <span className="font-semibold text-slate-900">
                    {selectedRecord.brand} {selectedRecord.model}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Serial Number</span>
                  <span className="font-mono text-slate-700">{selectedRecord.serial || '-'}</span>
                </div>
                <div className="bg-white p-2 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Inspector</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-400" />
                    {selectedRecord.technicianName || 'Inspector'}
                  </span>
                </div>
              </div>

              {/* Remarks Preview */}
              {selectedRecord.overallComment && (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                    Overall Remarks / Findings:
                  </span>
                  <p className="text-slate-800 line-clamp-2">{selectedRecord.overallComment}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf()}
                  disabled={isGeneratingPdf}
                  className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating PDF File...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download PDF ({selectedRecord.formNo}.pdf)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onViewRecord(selectedRecord);
                    onClose();
                  }}
                  className="px-3.5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  title="View full report with print layout"
                >
                  <Eye className="w-4 h-4" />
                  <span>View Report</span>
                </button>

                {selectedRecord.pdfUrl && (
                  <a
                    href={selectedRecord.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Open stored PDF from Google Drive"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Drive PDF</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => {
              setInputQuery('');
              setSelectedRecord(null);
              setErrorMessage(null);
              setShowSuggestions(false);
            }}
            className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition-colors cursor-pointer"
          >
            Clear Form
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
