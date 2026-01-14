import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

const defaultOptions: CompressionOptions = {
  maxSizeMB: 1, // Max file size 1MB
  maxWidthOrHeight: 1920, // Max dimension 1920px
  useWebWorker: true,
  fileType: 'image/jpeg',
};

/**
 * Compress an image file before uploading to storage
 * Reduces file size significantly while maintaining acceptable quality
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  // Skip compression for non-image files or already small files
  if (!file.type.startsWith('image/')) {
    return file;
  }

  // Skip if file is already small enough (under 500KB)
  if (file.size < 500 * 1024) {
    return file;
  }

  // Skip compression for GIF files (to preserve animation)
  if (file.type === 'image/gif') {
    return file;
  }

  const compressionOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, compressionOptions);

    // Return compressed file with original name
    return new File([compressedFile], file.name, {
      type: compressionOptions.fileType || file.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.warn('Image compression failed, using original file:', error);
    return file;
  }
}

/**
 * Compress multiple images in parallel
 */
export async function compressImages(
  files: File[],
  options: CompressionOptions = {}
): Promise<File[]> {
  return Promise.all(files.map((file) => compressImage(file, options)));
}

/**
 * Get compression statistics
 */
export function getCompressionStats(originalSize: number, compressedSize: number) {
  const savedBytes = originalSize - compressedSize;
  const savedPercentage = ((savedBytes / originalSize) * 100).toFixed(1);

  return {
    originalSize,
    compressedSize,
    savedBytes,
    savedPercentage,
    originalSizeFormatted: formatFileSize(originalSize),
    compressedSizeFormatted: formatFileSize(compressedSize),
    savedBytesFormatted: formatFileSize(savedBytes),
  };
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
