'use client';

import { useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Upload, Camera, FileImage, FileText, AlertCircle } from 'lucide-react';

// Accepted file types
const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/heic': ['.heic'],
  'image/heif': ['.heif'],
  'application/pdf': ['.pdf'],
};

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function UploadZone({
  onFilesSelected,
  disabled = false,
  maxFiles = 10,
}: UploadZoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      if (rejectedFiles.length > 0) {
        // Show error for rejected files
        rejectedFiles.forEach((rejection) => {
          const errors = rejection.errors.map((e) => e.message).join(', ');
          console.warn(`File rejected: ${rejection.file.name} - ${errors}`);
        });
      }

      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    maxFiles,
    disabled,
  });

  // Dynamic styling based on drag state
  const getBorderStyle = () => {
    if (isDragReject) return 'border-red-400 bg-red-50';
    if (isDragAccept) return 'border-cyan-500 bg-cyan-50 border-solid';
    if (isDragActive) return 'border-cyan-400 bg-cyan-50';
    return 'border-gray-300 hover:border-cyan-400 bg-gray-50';
  };

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-xl p-6 sm:p-8 transition-all cursor-pointer
        ${getBorderStyle()}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />

      <div className="text-center">
        {/* Icon changes based on state */}
        <div
          className={`
            w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-full flex items-center justify-center
            transition-all
            ${
              isDragReject
                ? 'bg-red-100'
                : isDragActive
                ? 'bg-cyan-100 scale-110'
                : 'bg-cyan-50'
            }
          `}
        >
          {isDragReject ? (
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
          ) : (
            <Upload
              className={`
                w-8 h-8 sm:w-10 sm:h-10
                ${isDragActive ? 'text-cyan-600' : 'text-cyan-500'}
              `}
            />
          )}
        </div>

        {/* Text content */}
        {isDragReject ? (
          <>
            <p className="text-red-600 mb-2 font-semibold text-base sm:text-lg">
              Invalid file type or size
            </p>
            <p className="text-red-500 text-xs sm:text-sm">
              Only JPG, PNG, PDF, HEIC files up to 10MB are allowed
            </p>
          </>
        ) : isDragActive ? (
          <>
            <p className="text-cyan-700 mb-2 font-semibold text-base sm:text-lg">
              Drop your files here
            </p>
            <p className="text-cyan-600 text-xs sm:text-sm">
              Release to upload
            </p>
          </>
        ) : (
          <>
            <p className="text-slate-700 mb-2 font-semibold text-base sm:text-lg">
              Drag & drop your receipts here
            </p>
            <p className="text-slate-500 mb-4 sm:mb-6 text-xs sm:text-sm">
              or use one of the options below
            </p>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
              <span
                className="inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm transition-colors cursor-pointer"
              >
                <FileImage className="w-4 h-4 sm:w-5 sm:h-5" />
                Choose Files
              </span>

              {/* Mobile camera capture */}
              <label className="inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-sm cursor-pointer transition-colors">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                Take Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFilesSelected([file]);
                  }}
                />
              </label>
            </div>
          </>
        )}

        {/* Supported formats info */}
        <div className="mt-4 sm:mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
          {[
            { icon: FileImage, label: 'JPG' },
            { icon: FileImage, label: 'PNG' },
            { icon: FileImage, label: 'HEIC' },
            { icon: FileText, label: 'PDF' },
          ].map((format) => (
            <div
              key={format.label}
              className="flex items-center gap-1 text-xs text-slate-400"
            >
              <format.icon className="w-3 h-3" />
              <span>{format.label}</span>
            </div>
          ))}
          <span className="text-xs text-slate-400">• Max 10MB each</span>
        </div>
      </div>
    </div>
  );
}
