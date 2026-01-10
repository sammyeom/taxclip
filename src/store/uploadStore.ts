import { create } from 'zustand';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface UploadFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  previewUrl?: string;
  uploadedUrl?: string;
}

interface UploadState {
  files: UploadFile[];
  isUploading: boolean;
  currentUploadId: string | null;

  // Overall progress
  totalProgress: number;

  // Actions
  addFiles: (files: File[]) => void;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  clearCompleted: () => void;

  // Progress actions
  setFileProgress: (id: string, progress: number) => void;
  setFileStatus: (id: string, status: UploadStatus, error?: string) => void;
  setFileUploadedUrl: (id: string, url: string) => void;

  // Upload state actions
  startUpload: (id: string) => void;
  finishUpload: (id: string, url: string) => void;
  failUpload: (id: string, error: string) => void;

  // Batch actions
  setUploading: (uploading: boolean) => void;
  resetUpload: () => void;

  // Getters
  getFileById: (id: string) => UploadFile | undefined;
  getPendingFiles: () => UploadFile[];
  getCompletedFiles: () => UploadFile[];
  getFailedFiles: () => UploadFile[];
}

const createUploadFile = (file: File): UploadFile => ({
  id: crypto.randomUUID(),
  file,
  name: file.name,
  size: file.size,
  type: file.type,
  progress: 0,
  status: 'idle',
  previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
});

const calculateTotalProgress = (files: UploadFile[]): number => {
  if (files.length === 0) return 0;
  const totalProgress = files.reduce((sum, f) => sum + f.progress, 0);
  return Math.round(totalProgress / files.length);
};

export const useUploadStore = create<UploadState>((set, get) => ({
  files: [],
  isUploading: false,
  currentUploadId: null,
  totalProgress: 0,

  addFiles: (newFiles) => set((state) => {
    const uploadFiles = newFiles.map(createUploadFile);
    return {
      files: [...state.files, ...uploadFiles],
    };
  }),

  removeFile: (id) => set((state) => {
    const file = state.files.find(f => f.id === id);
    if (file?.previewUrl) {
      URL.revokeObjectURL(file.previewUrl);
    }
    const files = state.files.filter((f) => f.id !== id);
    return {
      files,
      totalProgress: calculateTotalProgress(files)
    };
  }),

  clearFiles: () => set((state) => {
    state.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    return {
      files: [],
      isUploading: false,
      currentUploadId: null,
      totalProgress: 0
    };
  }),

  clearCompleted: () => set((state) => {
    const completed = state.files.filter(f => f.status === 'success');
    completed.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    const files = state.files.filter((f) => f.status !== 'success');
    return {
      files,
      totalProgress: calculateTotalProgress(files)
    };
  }),

  setFileProgress: (id, progress) => set((state) => {
    const files = state.files.map((f) =>
      f.id === id ? { ...f, progress } : f
    );
    return {
      files,
      totalProgress: calculateTotalProgress(files)
    };
  }),

  setFileStatus: (id, status, error) => set((state) => ({
    files: state.files.map((f) =>
      f.id === id ? { ...f, status, error } : f
    ),
  })),

  setFileUploadedUrl: (id, url) => set((state) => ({
    files: state.files.map((f) =>
      f.id === id ? { ...f, uploadedUrl: url } : f
    ),
  })),

  startUpload: (id) => set((state) => ({
    files: state.files.map((f) =>
      f.id === id ? { ...f, status: 'uploading' as UploadStatus, progress: 0 } : f
    ),
    isUploading: true,
    currentUploadId: id,
  })),

  finishUpload: (id, url) => set((state) => {
    const files = state.files.map((f) =>
      f.id === id ? { ...f, status: 'success' as UploadStatus, progress: 100, uploadedUrl: url } : f
    );
    const hasMorePending = files.some(f => f.status === 'idle' || f.status === 'uploading');
    return {
      files,
      isUploading: hasMorePending,
      currentUploadId: hasMorePending ? state.currentUploadId : null,
      totalProgress: calculateTotalProgress(files)
    };
  }),

  failUpload: (id, error) => set((state) => {
    const files = state.files.map((f) =>
      f.id === id ? { ...f, status: 'error' as UploadStatus, error } : f
    );
    const hasMorePending = files.some(f => f.status === 'idle' || f.status === 'uploading');
    return {
      files,
      isUploading: hasMorePending,
      currentUploadId: hasMorePending ? state.currentUploadId : null,
      totalProgress: calculateTotalProgress(files)
    };
  }),

  setUploading: (isUploading) => set({ isUploading }),

  resetUpload: () => set((state) => {
    state.files.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
    return {
      files: [],
      isUploading: false,
      currentUploadId: null,
      totalProgress: 0,
    };
  }),

  getFileById: (id) => get().files.find((f) => f.id === id),
  getPendingFiles: () => get().files.filter((f) => f.status === 'idle'),
  getCompletedFiles: () => get().files.filter((f) => f.status === 'success'),
  getFailedFiles: () => get().files.filter((f) => f.status === 'error'),
}));
