import React, { useState } from 'react';
import { SavedInspectionRecord } from '../types/inspection';
import { X, Search, FileText, CheckCircle2, XCircle, AlertTriangle, Calendar, MapPin, Hash, Download, Loader2 } from 'lucide-react';
import { generateInspectionPdf } from '../utils/pdfGenerator';

interface InspectionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  records: SavedInspectionRecord[];
  onViewRecord: (record: SavedInspectionRecord) => void;
  onDeleteRecord: (id: string) => void;
}

export const InspectionHistoryModal: React.FC<InspectionHistoryModalProps> = ({
  isOpen,
  onClose,
  records,
  onViewRecord,
  onDeleteRecord
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'BATTERY' | 'ENGINE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PASS' | 'FAILED'>('ALL');

  if (!isOpen) return null;

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.formNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.pmaNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.technicianName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || r.machineType === filterType;
    const matchesStatus =
      filterStatus === 'ALL' ||
      (filterStatus === 'PASS' && r.inspectionStatus === 'PASS') ||
      (filterStatus === 'FAILED' && (r.inspectionStatus === 'FAILED' || r.inspectionStatus === 'FAILED & MISUSE'));

    return matchesSearch && matchesType && matchesStatus;
  });

  const exportAllAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `eastway_inspections_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold tracking-wide">Inspection History Records</h3>
              <p className="text-xs text-slate-300">
                {records.length} total inspections recorded on this device
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                type="button"
                onClick={exportAllAsJson}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors border border-slate-700"
                title="Export all records as JSON file"
              >
                <Download className="w-3.5 h-3.5" /> Backup JSON
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Form No, PMA, Brand, Model, Inspector..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Types</option>
              <option value="BATTERY">Battery Only</option>
              <option value="ENGINE">Engine Only</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="PASS">Pass Only</option>
              <option value="FAILED">Failed / Issues Only</option>
            </select>
          </div>
        </div>

        {/* Records List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold text-slate-600">No inspection records found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchTerm ? 'Try adjusting your search criteria' : 'Completed inspection reports will appear here.'}
              </p>
            </div>
          ) : (
            filteredRecords.map((rec) => {
              const isPass = rec.inspectionStatus === 'PASS';
              return (
                <div
                  key={rec.id}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-xl p-4 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-slate-900">{rec.formNo}</span>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isPass
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {isPass ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {rec.inspectionStatus}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {rec.machineType} TYPE
                      </span>
                    </div>

                    <div className="text-xs text-slate-700 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="font-bold text-blue-700">{rec.pmaNumber}</span>
                      <span>
                        {rec.brand} {rec.model}
                      </span>
                      <span className="font-mono text-slate-500">SN: {rec.serial}</span>
                      <span className="text-slate-500">{rec.hourMeter} hrs</span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-3">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {rec.machineLocation} {rec.siteLocation ? `(${rec.siteLocation})` : ''}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {rec.inspectionDate} {rec.inspectionTime}
                      </span>
                      <span>Inspector: <strong className="text-slate-700">{rec.technicianName}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const { blob } = await generateInspectionPdf(rec);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${rec.formNo || 'INSPECTION_REPORT'}.pdf`;
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch (e) {
                          console.error('Download error:', e);
                        }
                      }}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center gap-1"
                      title={`Download ${rec.formNo}.pdf`}
                    >
                      <Download className="w-3.5 h-3.5 text-slate-600" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onViewRecord(rec);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
                    >
                      View Report / Print
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete inspection record ${rec.formNo}?`)) {
                          onDeleteRecord(rec.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete record"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
