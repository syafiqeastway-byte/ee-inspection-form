import React from 'react';
import { SavedInspectionRecord } from '../types/inspection';
import { batterySections, engineSections, batteryPictureFieldsConfig, enginePictureFieldsConfig } from '../data/inspectionConfig';
import { Printer, ArrowLeft, CheckCircle2, XCircle, AlertTriangle, ShieldCheck } from 'lucide-react';

interface InspectionReportPrintProps {
  record: SavedInspectionRecord;
  onBack: () => void;
}

export const InspectionReportPrint: React.FC<InspectionReportPrintProps> = ({ record, onBack }) => {
  const sections = record.machineType === 'ENGINE' ? engineSections : batterySections;
  const pictureConfig = record.machineType === 'ENGINE' ? enginePictureFieldsConfig : batteryPictureFieldsConfig;

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> PASS
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800 border border-red-300">
            <XCircle className="w-4 h-4" /> FAILED
          </span>
        );
      case 'FAILED & MISUSE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <AlertTriangle className="w-4 h-4" /> FAILED & MISUSE
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:p-0 print:bg-white">
      {/* Top Action Bar (hidden when printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-semibold text-sm rounded-xl border border-slate-300 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm rounded-xl shadow-md transition-colors"
        >
          <Printer className="w-4 h-4" /> Print / Save as PDF
        </button>
      </div>

      {/* Printable Sheet */}
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden print:shadow-none print:border-none print:rounded-none">
        
        {/* Header */}
        <div className="bg-slate-700 text-white p-6 sm:p-8 print:bg-slate-700 print:text-white">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-600 pb-5">
            <div className="flex items-center gap-3">
              <img
                src="/ee-logo.png"
                alt="EE LOGO"
                className="h-12 w-auto max-w-[160px] object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.dataset.triedFallback) {
                    target.dataset.triedFallback = 'true';
                    target.src = '/EE%20LOGO.png';
                  }
                }}
              />
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase">
                    EASTWAY ENGINEERING
                  </h1>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                  MEWP DIGITAL EQUIPMENT INSPECTION REPORT
                </p>
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-xs font-mono text-blue-300 uppercase tracking-wider">FORM NUMBER</div>
              <div className="text-lg sm:text-xl font-mono font-bold text-white">{record.formNo}</div>
              <div className="text-xs text-slate-400 mt-0.5">Submitted: {record.submittedAt}</div>
            </div>
          </div>

          {/* Machine Quick Specs Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 text-xs">
            <div>
              <span className="text-slate-400 block uppercase">Machine Type</span>
              <span className="font-bold text-sm text-white">{record.machineType} TYPE</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">PMA Number</span>
              <span className="font-bold text-sm text-blue-300">{record.pmaNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Brand & Model</span>
              <span className="font-bold text-sm text-white">{record.brand} {record.model}</span>
            </div>
            <div>
              <span className="text-slate-400 block uppercase">Serial No.</span>
              <span className="font-bold text-sm text-white font-mono">{record.serial}</span>
            </div>
          </div>
        </div>

        {/* General Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Inspection Type</span>
              <span className="font-bold text-slate-900">{record.typeOfInspection}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Hour Meter</span>
              <span className="font-bold text-slate-900 font-mono">{record.hourMeter} hrs</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Location</span>
              <span className="font-bold text-slate-900">{record.machineLocation}</span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold block uppercase">Site Location</span>
              <span className="font-bold text-slate-900">{record.siteLocation || 'N/A'}</span>
            </div>
          </div>

          {/* Overall Status Banner */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border bg-slate-50 border-slate-300">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">FINAL RESULT</span>
              <div className="mt-1">{getStatusBadge(record.inspectionStatus)}</div>
            </div>
            <div className="flex-1 text-xs">
              <span className="font-bold text-slate-700 block uppercase">Inspector Remarks:</span>
              <p className="text-slate-800 italic mt-0.5 whitespace-pre-wrap">{record.overallComment || 'No comments provided.'}</p>
            </div>
          </div>

          {/* Checklist Sections Matrix */}
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-900 pb-2 mb-4">
              Inspection Checklist Findings
            </h2>

            <div className="space-y-4">
              {sections.map((sec) => (
                <div key={sec.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-800 text-white px-4 py-2 font-bold text-xs uppercase flex items-center justify-between">
                    <span>{sec.title}</span>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {sec.items.map((item) => {
                        const status = record.checklistAnswers[item.name];
                        return (
                          <div
                            key={item.name}
                            className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                          >
                            <span className="text-slate-700 font-medium">{item.label}</span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                                status === 'OK'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : status === 'NOT OK'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {status || 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {record.sectionComments[sec.commentName] && (
                      <div className="mt-2.5 p-2 bg-blue-50/70 border border-blue-100 rounded text-xs text-blue-900">
                        <span className="font-bold">Note: </span>
                        {record.sectionComments[sec.commentName]}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photo Evidence Gallery */}
          <div className="break-before-page">
            <h2 className="text-base font-bold text-slate-900 uppercase border-b-2 border-slate-900 pb-2 mb-4">
              Visual Inspection Evidence ({record.machineType} TYPE)
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pictureConfig.map((cfg) => {
                const img = record.pictures[cfg.key];
                return (
                  <div key={cfg.key} className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex flex-col justify-between">
                    <div className="text-[11px] font-bold text-slate-700 mb-1 truncate uppercase" title={cfg.label}>
                      {cfg.label}
                    </div>
                    <div className="h-32 bg-slate-200 rounded overflow-hidden flex items-center justify-center">
                      {img ? (
                        <img src={img} alt={cfg.label} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not Uploaded</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sign-off Block */}
          <div className="border-t-2 border-slate-900 pt-6 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 items-end">
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold">Inspector / Technician</div>
              <div className="text-base font-bold text-slate-900 mt-1 uppercase">{record.technicianName}</div>
              <div className="text-xs text-slate-600 mt-1">
                Date: {record.inspectionDate} &bull; Time: {record.inspectionTime}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs text-slate-500 uppercase font-semibold">Verification Status</div>
              <div className="text-sm font-bold text-slate-900 mt-1 uppercase">{record.inspectionStatus}</div>
              <div className="text-xs text-slate-500 mt-0.5">Recorded: {record.submittedAt}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
