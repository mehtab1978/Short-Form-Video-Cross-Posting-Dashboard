import React, { useState, useRef } from 'react';
import { UploadCloud, Video, X, AlertCircle } from 'lucide-react';

interface UploadZoneProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
}

export default function UploadZone({ selectedFile, onFileSelect }: UploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File) => {
    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const isVideo = file.type === 'video/mp4' || file.type === 'video/quicktime' || ext === 'mp4' || ext === 'mov';
    
    if (!isVideo) {
      setError('Unsupported file type. Please upload a valid MP4 or MOV video clip.');
      return false;
    }

    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max size is 100MB.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const clearSelection = () => {
    onFileSelect(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept=".mp4,.mov,video/mp4,video/quicktime"
        onChange={handleFileChange}
        id="file-upload-input"
      />

      {!selectedFile ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          id="dropzone-container"
          className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${
            isDragActive
              ? 'border-indigo-600 bg-indigo-50/50 scale-[1.01]'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
          }`}
        >
          <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 mb-4 transition-transform group-hover:scale-110">
            <UploadCloud className="w-8 h-8 text-indigo-600" />
          </div>
          
          <h3 className="font-display font-medium text-slate-800 text-base mb-1">
            Drag & drop your short-form video
          </h3>
          <p className="text-xs text-slate-500 text-center max-w-sm leading-relaxed mb-4">
            Supports <strong className="text-slate-700">MP4</strong> and <strong className="text-slate-700">MOV</strong> formats up to <strong className="text-slate-700">100 MB</strong>.
          </p>

          <span className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-xl border border-slate-200 shadow-xs transition-colors">
            Browse files
          </span>

          {error && (
            <div id="dropzone-error" className="absolute -bottom-14 left-0 right-0 flex items-start gap-2.5 bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-xs shadow-xs animate-in fade-in slide-in-from-bottom-2 duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}
        </div>
      ) : (
        <div id="selected-file-panel" className="border border-slate-200 rounded-2xl p-5 bg-white shadow-xs flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center gap-4 min-w-0">
            <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100/50">
              <Video className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate max-w-xs md:max-w-md">
                {selectedFile.name}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {selectedFile.name.split('.').pop()?.toUpperCase()}
              </p>
            </div>
          </div>
          
          <button
            type="button"
            onClick={clearSelection}
            id="clear-file-btn"
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
            title="Remove file"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      
      {/* Reserve spacer in case error is shown to prevent visual layout jumps */}
      {!selectedFile && error && <div className="h-14 w-full"></div>}
    </div>
  );
}
