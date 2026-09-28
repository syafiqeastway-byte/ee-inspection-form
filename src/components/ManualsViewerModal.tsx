import React from 'react';
import { X, BookOpen, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

interface ManualsViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManualsViewerModal: React.FC<ManualsViewerModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold tracking-wide">Manual Machine Inspection Guidelines</h3>
              <p className="text-xs text-slate-300">Official Eastway Standard Operating Procedures (SOP)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold mb-0.5">Mandatory Compliance Notice</strong>
              All inspectors and technicians must review the respective machine manual prior to completing daily 1st Inspection or Pre-Delivery Inspection (PDI). Ensure critical safety interlocks, emergency stop circuits, and hydraulic relief valves meet OEM specifications.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Scissorlift Manual Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-blue-50/50 to-white flex flex-col justify-between hover:border-blue-300 transition-all shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                  📘
                </div>
                <h4 className="text-sm font-bold text-slate-900 uppercase">Scissorlift Type Manual</h4>
                <p className="text-xs text-slate-500 mt-1">
                  DC electric & hydraulic scissor lift daily inspection guidelines, pothole protection testing, charger voltage checks.
                </p>
              </div>

              <a
                href="https://drive.google.com/file/d/1ilBECb6TOMXN5wiSrFeAN35a0kGAuFDq/view?usp=drive_link"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <span>Open Scissorlift Manual</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Boomlift Manual Card */}
            <div className="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-amber-50/50 to-white flex flex-col justify-between hover:border-amber-300 transition-all shadow-sm">
              <div>
                <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-lg mb-3 shadow">
                  📙
                </div>
                <h4 className="text-sm font-bold text-slate-900 uppercase">Boomlift Type Manual</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Articulated & telescopic engine/diesel boom lifts, turntable torque bolts, oscillate axle checks, jib functional limits.
                </p>
              </div>

              <a
                href="https://drive.google.com/file/d/1aIcBw3L6JEWnb0AxhaSodQW0RtYhadk_/view?usp=drive_link"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <span>Open Boomlift Manual</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
