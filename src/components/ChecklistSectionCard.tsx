import React from 'react';
import { ChecklistSection, ChecklistStatus } from '../types/inspection';
import { CheckCircle2, AlertTriangle, HelpCircle, CheckCheck, RotateCcw } from 'lucide-react';

interface ChecklistSectionCardProps {
  section: ChecklistSection;
  answers: Record<string, ChecklistStatus>;
  commentValue: string;
  onStatusChange: (itemKey: string, status: ChecklistStatus) => void;
  onCommentChange: (commentKey: string, value: string) => void;
  onMarkAllOk: (items: ChecklistSection['items']) => void;
  onUnmarkSection?: (items: ChecklistSection['items']) => void;
}

export const ChecklistSectionCard: React.FC<ChecklistSectionCardProps> = ({
  section,
  answers,
  commentValue,
  onStatusChange,
  onCommentChange,
  onMarkAllOk,
  onUnmarkSection,
}) => {
  const answeredCount = section.items.filter((item) => !!answers[item.name]).length;
  const totalCount = section.items.length;
  const isAllAnswered = answeredCount === totalCount;
  const hasNotOk = section.items.some((item) => answers[item.name] === 'NOT OK');

  return (
    <div
      id={`checklist-section-${section.id}`}
      className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-5 transition-all hover:shadow-md"
    >
      {/* Section Header */}
      <div className="bg-slate-700 text-white px-4 py-3.5 sm:px-6 sm:py-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-600">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-slate-300"></span>
          <h3 className="text-sm sm:text-base font-bold tracking-wide uppercase">{section.title}</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Progress badge */}
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
              isAllAnswered
                ? hasNotOk
                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-700 text-slate-300 border-slate-600'
            }`}
          >
            {answeredCount} / {totalCount} Done
          </span>

          {/* Quick Mark All as OK Button */}
          <button
            type="button"
            onClick={() => onMarkAllOk(section.items)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-md transition-colors shadow-sm"
            title="Set all items in this section to OK"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>All OK</span>
          </button>

          {/* Quick Unmark Button */}
          {onUnmarkSection && answeredCount > 0 && (
            <button
              type="button"
              onClick={() => onUnmarkSection(section.items)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 text-xs font-semibold rounded-md transition-colors border border-slate-600 shadow-sm"
              title="Unmark / clear all items in this section"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Unmark</span>
            </button>
          )}
        </div>
      </div>


      {/* Checklist Table / Rows */}
      <div className="p-3 sm:p-5">
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-700">
                <th className="py-2.5 px-3 sm:px-4 font-bold text-xs uppercase tracking-wider">
                  Inspection Item
                </th>
                <th className="py-2.5 px-3 sm:px-4 font-bold text-xs uppercase tracking-wider text-center w-[180px] sm:w-[220px]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {section.items.map((item, index) => {
                const currentStatus = answers[item.name];
                return (
                  <tr
                    key={item.name}
                    id={`checklist-item-${item.name}`}
                    className={`transition-colors ${
                      currentStatus === 'NOT OK'
                        ? 'bg-red-50/60 hover:bg-red-50'
                        : currentStatus === 'OK'
                        ? 'bg-white hover:bg-slate-50/80'
                        : index % 2 === 0
                        ? 'bg-slate-50/30'
                        : 'bg-white'
                    }`}
                  >
                    <td className="py-3 px-3 sm:px-4 text-xs sm:text-sm font-medium text-slate-800">
                      <div className="flex items-center gap-2">
                        {currentStatus === 'OK' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        )}
                        {currentStatus === 'NOT OK' && (
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        {currentStatus === 'N/A' && (
                          <HelpCircle className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span>{item.label}</span>
                      </div>
                    </td>

                    <td className="py-2.5 px-2 sm:px-4 text-center">
                      <div className="inline-flex items-center justify-center p-0.5 bg-slate-100 rounded-lg border border-slate-200 gap-0.5">
                        {/* OK Option */}
                        <label
                          className={`flex items-center justify-center px-2 sm:px-3 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all select-none min-h-[36px] sm:min-h-[32px] ${
                            currentStatus === 'OK'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={item.name}
                            value="OK"
                            checked={currentStatus === 'OK'}
                            onChange={() => onStatusChange(item.name, 'OK')}
                            className="sr-only"
                            required
                          />
                          OK
                        </label>

                        {/* NOT OK Option */}
                        <label
                          className={`flex items-center justify-center px-2 sm:px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all select-none min-h-[36px] sm:min-h-[32px] ${
                            currentStatus === 'NOT OK'
                              ? 'bg-red-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={item.name}
                            value="NOT OK"
                            checked={currentStatus === 'NOT OK'}
                            onChange={() => onStatusChange(item.name, 'NOT OK')}
                            className="sr-only"
                            required
                          />
                          NOT OK
                        </label>

                        {/* N/A Option */}
                        <label
                          className={`flex items-center justify-center px-2 sm:px-2.5 py-1.5 rounded-md cursor-pointer text-xs font-bold transition-all select-none min-h-[36px] sm:min-h-[32px] ${
                            currentStatus === 'N/A'
                              ? 'bg-slate-600 text-white shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                          }`}
                        >
                          <input
                            type="radio"
                            name={item.name}
                            value="N/A"
                            checked={currentStatus === 'N/A'}
                            onChange={() => onStatusChange(item.name, 'N/A')}
                            className="sr-only"
                            required
                          />
                          N/A
                        </label>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Section Comment Field */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">
            {section.commentLabel}
            {section.commentRequired ? (
              <span className="text-red-500 ml-1 font-bold">*</span>
            ) : (
              <span className="text-slate-400 font-normal ml-1 lowercase text-[11px]">(optional)</span>
            )}
          </label>
          <textarea
            id={`section-comment-${section.commentName}`}
            value={commentValue || ''}
            onChange={(e) => onCommentChange(section.commentName, e.target.value.toUpperCase())}
            required={section.commentRequired}
            rows={2}
            placeholder={`ENTER REMARKS / READINGS FOR ${section.title}...`}
            className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm uppercase bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-shadow shadow-sm font-sans"
          />
        </div>
      </div>
    </div>
  );
};
