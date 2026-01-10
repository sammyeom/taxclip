'use client';

// Dynamic import to avoid SSR issues
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;

  if (typeof window === 'undefined') {
    throw new Error('PDF conversion is only available in the browser');
  }

  try {
    // Dynamically import pdfjs-dist
    const pdfjs = await import('pdfjs-dist');

    // Use unpkg CDN URL for worker - matches installed pdfjs-dist version
    pdfjs.GlobalWorkerOptions.workerSrc =
      'https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs';

    pdfjsLib = pdfjs;
    console.log('PDF.js initialized, version:', pdfjs.version);
    return pdfjs;
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw new Error('Failed to load PDF library. Please try again.');
  }
}

export interface PdfConversionResult {
  images: Blob[];
  pageCount: number;
}

/**
 * Convert a PDF file to an array of PNG images
 * Each page of the PDF becomes a separate image
 */
export async function convertPdfToImages(
  pdfFile: File,
  scale: number = 2.0 // Higher scale = better quality
): Promise<PdfConversionResult> {
  if (typeof window === 'undefined') {
    throw new Error('PDF conversion is only available in the browser');
  }

  console.log('Starting PDF conversion for:', pdfFile.name);

  // Get pdfjs library dynamically
  let pdfjs;
  try {
    pdfjs = await getPdfJs();
    console.log('PDF.js loaded successfully, version:', pdfjs.version);
  } catch (error) {
    console.error('Failed to load PDF.js:', error);
    throw error;
  }

  // Read the PDF file as ArrayBuffer
  const arrayBuffer = await pdfFile.arrayBuffer();
  console.log('PDF file read, size:', arrayBuffer.byteLength);

  // Load the PDF document
  let pdf;
  try {
    pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    console.log('PDF document loaded, pages:', pdf.numPages);
  } catch (error) {
    console.error('Failed to load PDF document:', error);
    throw new Error('Failed to load PDF document. The file may be corrupted or password-protected.');
  }

  const pageCount = pdf.numPages;
  const images: Blob[] = [];

  // Convert each page to an image
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Get the viewport at the specified scale
    const viewport = page.getViewport({ scale });

    // Create a canvas for rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to create canvas context');
    }

    // Set canvas dimensions to match the viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the PDF page to the canvas
    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Convert canvas to Blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        'image/png',
        0.95 // Quality for PNG (though PNG is lossless, this affects compression)
      );
    });

    images.push(blob);
  }

  return {
    images,
    pageCount,
  };
}

/**
 * Convert a PDF file to a single image (first page only)
 * Useful for preview purposes
 */
export async function convertPdfFirstPageToImage(
  pdfFile: File,
  scale: number = 1.5
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('PDF conversion is only available in the browser');
  }

  // Get pdfjs library dynamically
  const pdfjs = await getPdfJs();

  const arrayBuffer = await pdfFile.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Failed to create canvas context');
  }

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Convert a PDF file to base64 data URLs
 * Useful for displaying images directly
 */
export async function convertPdfToDataUrls(
  pdfFile: File,
  scale: number = 2.0
): Promise<string[]> {
  const { images } = await convertPdfToImages(pdfFile, scale);

  const dataUrls: string[] = [];
  for (const blob of images) {
    const dataUrl = await blobToDataUrl(blob);
    dataUrls.push(dataUrl);
  }

  return dataUrls;
}

/**
 * Convert a Blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert blob to data URL'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: File): boolean {
  return (
    file.type === 'application/pdf' ||
    file.name.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Convert PDF blob to File object for upload
 */
export function blobToFile(blob: Blob, fileName: string): File {
  return new File([blob], fileName, { type: blob.type });
}
