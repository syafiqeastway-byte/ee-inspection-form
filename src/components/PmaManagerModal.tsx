import React, { useState } from 'react';
import { PmaRecord } from '../types/inspection';
import { X, Plus, Search, Truck, Check, Trash2 } from 'lucide-react';

interface PmaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pmaList: PmaRecord[];
  onAddPma: (record: PmaRecord) => void;
  onDeletePma: (pmaNumber: string) => void;
  onSelectPma: (record: PmaRecord) => void;
}

export const PmaManagerModal: React.FC<PmaManagerModalProps> = ({
  isOpen,
  onClose,
  pmaList,
  onAddPma,
  onDeletePma,
  onSelectPma
}) => {
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // New PMA state
  const [pmaNumber, setPmaNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serial, setSerial] = useState('');
  const [type, setType] = useState<'BATTERY' | 'ENGINE'>('BATTERY');
  const [category, setCategory] = useState<'SCISSORLIFT' | 'BOOMLIFT' | 'OTHER'>('SCISSORLIFT');

  if (!isOpen) return null;

  const filtered = pmaList.filter(
    (item) =>
      item.pmaNumber.toLowerCase().includes(search.toLowerCase()) ||
      item.brand.toLowerCase().includes(search.toLowerCase()) ||
      item.model.toLowerCase().includes(search.toLowerCase()) ||
      item.serial.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pmaNumber || !brand || !model || !serial) return;

    const formattedPma = pmaNumber.trim().toUpperCase().startsWith('PMA')
      ? pmaNumber.trim().toUpperCase()
      : `PMA ${pmaNumber.trim().toUpperCase()}`;

    onAddPma({
      pmaNumber: formattedPma,
      brand: brand.trim().toUpperCase(),
      model: model.trim().toUpperCase(),
      serial: serial.trim().toUpperCase(),
      type,
      category
    });

    // Reset form
    setPmaNumber('');
    setBrand('');
    setModel('');
    setSerial('');
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <Truck className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-base font-bold tracking-wide">PMA Machine Fleet Directory</h3>
              <p className="text-xs text-slate-300">
                {pmaList.length} machines registered in local database
              </p>
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

        {/* Action Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search PMA, Brand, Model, Serial..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-sans"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Close Add Form' : 'Register New Machine'}</span>
          </button>
        </div>

        {/* Add New PMA Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="p-4 bg-blue-50/70 border-b border-blue-200 space-y-3">
            <div className="text-xs font-bold text-blue-900 uppercase">Register Machine to Fleet</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase">PMA Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PMA 14980"
                  value={pmaNumber}
                  onChange={(e) => setPmaNumber(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase">Machine Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                >
                  <option value="BATTERY">BATTERY TYPE (Scissor / DC Boom)</option>
                  <option value="ENGINE">ENGINE TYPE (Diesel / Dual Fuel)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase">Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. JLG, GENIE, DINGLI"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md uppercase"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block uppercase">Model *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1930ES, GS-1930"
                  value={model}
                  onChange={(e) => setModel(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md uppercase"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-700 block uppercase">Serial Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0200234190"
                  value={serial}
                  onChange={(e) => setSerial(e.target.value.toUpperCase())}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md uppercase font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-semibold rounded-md hover:bg-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-blue-700 text-white text-xs font-bold rounded-md hover:bg-blue-800 shadow-sm"
              >
                Save Machine
              </button>
            </div>
          </form>
        )}

        {/* PMA List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No matching PMA found. You can add one with the button above.
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.pmaNumber}
                className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-blue-900">{item.pmaNumber}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        item.type === 'BATTERY' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {item.type}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    <strong>{item.brand}</strong> &bull; {item.model} &bull;{' '}
                    <span className="font-mono text-slate-500">SN: {item.serial}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPma(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
                  >
                    Select
                  </button>
                  <button
                    type="button"
                    onClick={() => onDeletePma(item.pmaNumber)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    title="Delete machine"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
