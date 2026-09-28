import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Trash2, Eye, Sparkles, Loader2 } from 'lucide-react';
import { compressImageFile } from '../utils/imageCompressor';

interface PhotoCaptureCardProps {
  fieldKey: string;
  label: string;
  required: boolean;
  hint?: string;
  imageValue?: string;
  onImageChange: (key: string, base64: string) => void;
  onImageRemove: (key: string) => void;
  onPreview: (key: string, title: string) => void;
}

export const PhotoCaptureCard: React.FC<PhotoCaptureCardProps> = ({
  fieldKey,
  label,
  required,
  hint,
  imageValue,
  onImageChange,
  onImageRemove,
  onPreview,
}) => {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    try {
      setIsProcessing(true);
      const compressed = await compressImageFile(file, 900, 0.65);
      onImageChange(fieldKey, compressed);
    } catch (err) {
      console.error('Failed to compress image:', err);
    } finally {
      setIsProcessing(false);
      // Reset input value to allow re-selection of identical filename if needed
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`relative rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
        imageValue
          ? 'bg-slate-50 border-blue-200 shadow-sm'
          : required
          ? 'bg-white border-slate-200 hover:border-slate-300'
          : 'bg-slate-50/70 border-dashed border-slate-300'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <label className="text-xs font-bold text-slate-800 tracking-wide uppercase leading-tight">
            {label}
            {required ? (
              <span className="text-red-500 ml-1 font-bold">*</span>
            ) : (
              <span className="text-slate-400 font-normal ml-1 lowercase text-[11px]">(optional)</span>
            )}
          </label>
        </div>

        {hint && <p className="text-[11px] text-slate-500 mb-2 leading-snug">{hint}</p>}

        {/* Preview Frame */}
        <div className="relative w-full h-36 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center group mb-3">
          {isProcessing ? (
            <div className="flex flex-col items-center justify-center gap-1.5 text-blue-600">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs font-semibold">Compressing...</span>
            </div>
          ) : imageValue ? (
            <>
              <img
                src={imageValue}
                alt={label}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onPreview(fieldKey, label)}
                  className="px-3 py-1.5 bg-white/90 text-slate-900 text-xs font-semibold rounded-md shadow flex items-center gap-1 hover:bg-white"
                >
                  <Eye className="w-3.5 h-3.5 text-blue-600" /> Zoom
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 p-3 text-center">
              <ImageIcon className="w-7 h-7 mb-1 opacity-50 text-slate-400" />
              <span className="text-[11px] font-medium">No photo captured</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Use camera or gallery</span>
            </div>
          )}
        </div>
      </div>

      {/* Hidden File Inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/heic,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {/* Action Buttons */}
      <div className="flex flex-col gap-1.5">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-700 hover:bg-blue-800 active:bg-blue-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors touch-manipulation min-h-[40px]"
          >
            <Camera className="w-4 h-4" />
            <span>Camera</span>
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isProcessing}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors touch-manipulation min-h-[40px]"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gallery</span>
          </button>
        </div>

        {imageValue && (
          <button
            type="button"
            onClick={() => onImageRemove(fieldKey)}
            disabled={isProcessing}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Remove Photo</span>
          </button>
        )}
      </div>
    </div>
  );
};
