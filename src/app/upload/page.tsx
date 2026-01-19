'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, createReceipt, createExpense } from '@/lib/supabase';
import { IRS_SCHEDULE_C_CATEGORIES, LineItem, createLineItem } from '@/types/database';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import Navigation from '@/components/Navigation';
import {
  UploadZone,
  ImagePreview,
  SplitView,
  EmailPasteInput,
  convertHeicToPreview,
  generateFileId,
} from '@/components/receipts';
import type { FileWithPreview, FileStatus, ExtractedData } from '@/components/receipts';
import { isPdfFile, convertPdfToImages, blobToFile } from '@/lib/pdf-to-image';
import {
  Loader2,
  CheckCircle,
  XCircle,
  Sparkles,
  Layers,
  Images,
  SplitSquareVertical,
  FormInput,
  Mail,
  FileText,
  Plus,
  X,
  List,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { EvidenceType, EvidenceItem, ParsedEmailData } from '@/types/evidence';
import { parseEmailText, validateParsedEmail } from '@/lib/email-parser';
import { parseEmlFile, isEmlFile, getImageAttachments, getPdfAttachments, attachmentToFile } from '@/lib/eml-parser';
import { useReceiptStore } from '@/store';
import { compressImage } from '@/lib/image-compression';
import CategorySelector from '@/components/CategorySelector';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

// OCR item can be either a string (legacy) or an object with qty, unitPrice, amount
interface OCRItem {
  name: string;
  qty?: number;
  unitPrice?: number;
  amount?: number;
}

interface OCRData {
  date: string;
  vendor: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  currency: string;
  items: (string | OCRItem)[];
  category: string;
  paymentMethod?: string;
  documentType?: 'receipt' | 'invoice' | 'payment_proof' | 'online_order' | 'other';
  confidence?: number;
}

interface OCRResponse {
  imageUrl: string;
  imageUrls?: string[];  // Multi-image support
  fileUrls?: string[];   // Alias for expenses table
  documentTypes?: string[]; // Document types for each file
  rawText?: string | null;  // Combined PDF raw text for audit
  data: OCRData | null;
  error?: string;
}

// Use IRS Schedule C categories from database types

const PAYMENT_METHODS = [
  { value: '', label: 'Select payment method' },
  { value: 'credit', label: 'Credit Card' },
  { value: 'debit', label: 'Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
];

const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'USD ($)', symbol: '$' },
  { value: 'EUR', label: 'EUR (€)', symbol: '€' },
  { value: 'GBP', label: 'GBP (£)', symbol: '£' },
  { value: 'JPY', label: 'JPY (¥)', symbol: '¥' },
  { value: 'KRW', label: 'KRW (₩)', symbol: '₩' },
  { value: 'CNY', label: 'CNY (¥)', symbol: '¥' },
  { value: 'CAD', label: 'CAD (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'AUD (A$)', symbol: 'A$' },
  { value: 'CHF', label: 'CHF', symbol: 'CHF' },
  { value: 'INR', label: 'INR (₹)', symbol: '₹' },
  { value: 'SGD', label: 'SGD (S$)', symbol: 'S$' },
  { value: 'HKD', label: 'HKD (HK$)', symbol: 'HK$' },
];

// Format amount with currency symbol and commas (e.g., "$1,234.56")
const formatAmount = (amount: number, currencyCode: string = 'USD') => {
  const currency = CURRENCY_OPTIONS.find((c) => c.value === currencyCode);
  const symbol = currency?.symbol || '$';
  const formattedNumber = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formattedNumber}`;
};

// Format number with commas and 2 decimal places (e.g., "1,234.56")
const formatNumberWithCommas = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Parse formatted number string to raw number string (e.g., "1,234.56" -> "1234.56")
const parseFormattedNumber = (value: string): string => {
  // Remove commas and keep only digits and decimal point
  const cleaned = value.replace(/,/g, '');
  // Validate it's a valid number
  if (cleaned === '' || isNaN(parseFloat(cleaned))) return '';
  return cleaned;
};

// Convert OCR items to LineItem format
function convertOcrItemsToLineItems(items: (string | OCRItem)[]): LineItem[] {
  return items.map((item) => {
    if (typeof item === 'string') {
      // Legacy string format
      return createLineItem(item, 1, 0);
    }
    // New object format with qty, unitPrice, amount
    return createLineItem(
      item.name,
      item.qty || 1,
      item.unitPrice || 0
    );
  });
}

// Abort controller map for cancellation
const abortControllers = new Map<string, AbortController>();

export default function UploadPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { addReceipt } = useReceiptStore();
  const {
    monthlyCount,
    monthlyLimit,
    canUpload,
    remainingUploads,
    isPro,
    isTrialing,
    trialDaysRemaining,
    loading: usageLimitLoading,
    refetch: refetchUsage,
  } = useUsageLimit();

  // File management states
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Multi-image receipt mode
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedForGrouping, setSelectedForGrouping] = useState<string[]>([]);
  const [processingGroup, setProcessingGroup] = useState(false);
  // Batch mode: true = separate receipts, false = multi-page single receipt
  const [batchMode, setBatchMode] = useState(true);
  // Store batch results for saving all receipts
  const [batchResults, setBatchResults] = useState<Array<{
    fileId: string;
    imageUrl: string;
    data: {
      date: string;
      vendor: string;
      amount: number;
      subtotal?: number;
      tax?: number;
      tip?: number;
      currency: string;
      category: string;
      items: LineItem[];
      paymentMethod?: string;
    } | null;
  }>>([]);

  // Email text input for IRS evidence
  const [emailText, setEmailText] = useState('');
  const [parsingEmail, setParsingEmail] = useState(false);
  const [parsedEmailData, setParsedEmailData] = useState<ParsedEmailData | null>(null);

  // Global states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields for selected file
  const [formData, setFormData] = useState({
    date: '',
    merchant: '',
    amount: '',
    subtotal: '',
    tax: '',
    tip: '',
    currency: 'USD',
    category: 'other',
    subcategory: '',
    businessPurpose: '',
    paymentMethod: 'credit',
    notes: '',
  });

  // Extracted items from OCR
  const [extractedItems, setExtractedItems] = useState<LineItem[]>([]);
  const [selectedItemForModal, setSelectedItemForModal] = useState<LineItem | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [editingUnitPrice, setEditingUnitPrice] = useState<{id: string, value: string} | null>(null);

  // Item management functions
  const handleAddItem = () => {
    if (newItemName.trim()) {
      setExtractedItems((prev) => [...prev, createLineItem(newItemName.trim(), 1, 0)]);
      setNewItemName('');
    }
  };

  // Add new item and open drawer immediately (for mobile)
  const handleAddNewItemWithDrawer = () => {
    const newItem = createLineItem('', 1, 0);
    setExtractedItems((prev) => [...prev, newItem]);
    setSelectedItemForModal(newItem);
    setNewItemName('');
  };

  const handleRemoveItem = (id: string) => {
    setExtractedItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateItem = (id: string, field: keyof LineItem, value: string | number | boolean) => {
    setExtractedItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalculate amount when qty or unitPrice changes
        if (field === 'qty' || field === 'unitPrice') {
          updated.amount = updated.qty * updated.unitPrice;
        }
        return updated;
      })
    );
  };

  const handleToggleItemSelection = (id: string) => {
    setExtractedItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleSelectAllItems = (selected: boolean) => {
    setExtractedItems((prev) => prev.map((item) => ({ ...item, selected })));
  };

  // Calculate total of selected items
  const selectedItemsTotal = extractedItems
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + item.amount, 0);

  // Split view mode toggle
  const [showSplitView, setShowSplitView] = useState(true);

  // Image URLs from upload (supports single and multi-image)
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedDocumentTypes, setUploadedDocumentTypes] = useState<string[]>([]);
  const [uploadedRawText, setUploadedRawText] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/sign-in');
    }
  }, [user, authLoading, router]);

  // Get selected file data
  const selectedFile = files.find((f) => f.id === selectedFileId);

  // Process a single file (upload + OCR)
  const processFile = useCallback(async (fileId: string, file: File, preview: string | null) => {
    // Create abort controller for this file
    const controller = new AbortController();
    abortControllers.set(fileId, controller);

    try {
      // Update status to uploading
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId ? { ...f, status: 'uploading' as FileStatus, progress: 0 } : f
        )
      );

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Compress image before uploading (if applicable)
      const fileToUpload = await compressImage(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      });

      // Create form data
      const formDataToSend = new FormData();
      formDataToSend.append('file', fileToUpload);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      // Upload file
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
        signal: controller.signal,
      });

      clearInterval(progressInterval);

      // Update to 100% and change to analyzing
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, status: 'analyzing' as FileStatus, progress: 100 }
            : f
        )
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process receipt');
      }

      const result: OCRResponse = await response.json();

      // Check if OCR failed (API returned error)
      if (result.error || !result.data) {
        console.warn('OCR failed:', result.error);
        // Update file status to show OCR failed but upload succeeded
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'complete' as FileStatus,
                  progress: 100,
                  error: result.error || 'OCR analysis failed - please fill in details manually',
                }
              : f
          )
        );
        setUploadedImageUrl(result.imageUrl);
        setUploadedImageUrls(result.imageUrls || [result.imageUrl]);
        setSelectedFileId((currentId) => currentId || fileId);
        // Show error message to user
        setError('OCR analysis failed (API quota exceeded or service unavailable). Please fill in details manually.');
        return;
      }

      // Always store the image URL (will be used when saving)
      setUploadedImageUrl(result.imageUrl);
      setUploadedImageUrls(result.imageUrls || [result.imageUrl]);

      // Map OCR documentType to EvidenceType
      const mapDocTypeToEvidenceType = (docType?: string): EvidenceType => {
        switch (docType) {
          case 'receipt': return EvidenceType.RECEIPT;
          case 'invoice': return EvidenceType.INVOICE;
          case 'payment_proof': return EvidenceType.PAYMENT_PROOF;
          case 'online_order': return EvidenceType.ONLINE_ORDER;
          default: return EvidenceType.RECEIPT;
        }
      };

      const detectedEvidenceType = result.data?.documentType
        ? mapDocTypeToEvidenceType(result.data.documentType)
        : EvidenceType.RECEIPT;

      // Update file with OCR data and auto-detected evidence type
      setFiles((prev) =>
        prev.map((f) => {
          if (f.id !== fileId) return f;

          return {
            ...f,
            status: 'complete' as FileStatus,
            progress: 100,
            evidenceType: detectedEvidenceType, // Auto-set from OCR
            ocrData: result.data
              ? {
                  date: result.data.date,
                  vendor: result.data.vendor,
                  amount: result.data.amount,
                  subtotal: result.data.subtotal,
                  tax: result.data.tax,
                  tip: result.data.tip,
                  currency: result.data.currency || 'USD',
                  category: result.data.category,
                  items: result.data.items || [],
                  paymentMethod: result.data.paymentMethod,
                }
              : undefined,
          };
        })
      );

      // Populate the form when OCR completes (only if user hasn't manually edited)
      const ocrData = result.data;
      if (ocrData) {
        // Only auto-populate form fields if user hasn't manually edited the form
        setFormData((prev) => {
          // Check if this is a fresh form (no user edits)
          // We use a ref check via the callback to get current state
          return {
            date: prev.date || ocrData.date || '',
            merchant: prev.merchant || ocrData.vendor || '',
            amount: prev.amount || (ocrData.amount ? ocrData.amount.toFixed(2) : ''),
            subtotal: prev.subtotal || (ocrData.subtotal ? ocrData.subtotal.toFixed(2) : ''),
            tax: prev.tax || (ocrData.tax ? ocrData.tax.toFixed(2) : ''),
            tip: prev.tip || (ocrData.tip ? ocrData.tip.toFixed(2) : ''),
            currency: prev.currency || ocrData.currency || 'USD',
            category: prev.category !== 'other' ? prev.category : (ocrData.category || 'other'),
            subcategory: prev.subcategory || '',
            businessPurpose: prev.businessPurpose || '',
            paymentMethod: prev.paymentMethod || ocrData.paymentMethod || 'credit',
            notes: prev.notes || '',
          };
        });
        setExtractedItems((prev) => prev.length > 0 ? prev : convertOcrItemsToLineItems(ocrData.items || []));
        setUploadedImageUrl(result.imageUrl);
        setUploadedImageUrls(result.imageUrls || [result.imageUrl]);
        setUploadedDocumentTypes(ocrData.documentType ? [ocrData.documentType] : []);
        setUploadedRawText(result.rawText || null);

        // Auto-select this file if no file is currently selected
        setSelectedFileId((currentId) => currentId || fileId);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Upload was cancelled
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } else {
        // Update status to error
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error' as FileStatus,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : f
          )
        );
      }
    } finally {
      abortControllers.delete(fileId);
    }
  }, [selectedFileId]);

  // Handle EML file upload
  const handleEmlFile = useCallback(async (file: File) => {
    setSuccessMessage(`Parsing email file "${file.name}"...`);

    try {
      const { emlData, parsedData } = await parseEmlFile(file);

      // Set the email text from the parsed EML
      const emailBody = emlData.html || emlData.body;
      setEmailText(emailBody);
      setParsedEmailData(parsedData);

      // Auto-fill form fields
      if (parsedData.vendor) {
        setFormData((prev) => ({ ...prev, merchant: parsedData.vendor || prev.merchant }));
      }
      if (parsedData.date) {
        setFormData((prev) => ({ ...prev, date: parsedData.date || prev.date }));
      }
      if (parsedData.total) {
        setFormData((prev) => ({ ...prev, amount: parsedData.total?.toString() || prev.amount }));
      }

      // Get attachments to process
      const imageAttachments = getImageAttachments(emlData);
      const pdfAttachments = getPdfAttachments(emlData);
      const attachmentFiles: File[] = [];

      // Convert attachments to File objects
      for (const att of [...imageAttachments, ...pdfAttachments]) {
        try {
          const attachmentFile = attachmentToFile(att);
          attachmentFiles.push(attachmentFile);
        } catch (e) {
          console.error('Failed to convert attachment:', att.filename, e);
        }
      }

      const validation = validateParsedEmail(parsedData);
      if (validation.isValid) {
        setSuccessMessage(`Email parsed successfully! Confidence: ${validation.confidence}%${attachmentFiles.length > 0 ? ` (${attachmentFiles.length} attachment(s) found)` : ''}`);
      } else {
        setError(`Email parsed with ${validation.confidence}% confidence. Missing: ${validation.missingFields.join(', ')}`);
      }
      setTimeout(() => setSuccessMessage(null), 3000);

      return attachmentFiles;
    } catch (e) {
      console.error('EML parsing failed:', e);
      setError(`Failed to parse email file "${file.name}"`);
      return [];
    }
  }, []);

  // Handle new files selected
  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    setError(null);
    setSuccessMessage(null);

    // Separate EML files from other files
    const emlFiles = newFiles.filter(f => isEmlFile(f));
    let regularFiles = newFiles.filter(f => !isEmlFile(f));

    // Process EML files first and extract attachments
    for (const emlFile of emlFiles) {
      const attachmentFiles = await handleEmlFile(emlFile);
      regularFiles = [...regularFiles, ...attachmentFiles];
    }

    // If only EML files were uploaded with no attachments and no existing files, show message
    if (emlFiles.length > 0 && regularFiles.length === 0 && files.length === 0) {
      setSuccessMessage('Email parsed! You can now upload receipt images or the email data will be saved with the next receipt.');
      return;
    }

    // Process files - convert PDFs to images
    const processedFiles: { file: File; preview: string | null; originalName: string }[] = [];

    for (const file of regularFiles) {
      if (isPdfFile(file)) {
        // Convert PDF to images
        try {
          setSuccessMessage(`Converting PDF "${file.name}" to images...`);
          const { images, pageCount } = await convertPdfToImages(file, 2.0);

          for (let i = 0; i < images.length; i++) {
            const blob = images[i];
            const imageName = pageCount > 1
              ? `${file.name.replace('.pdf', '')}_page${i + 1}.png`
              : `${file.name.replace('.pdf', '')}.png`;
            const imageFile = blobToFile(blob, imageName);
            const preview = URL.createObjectURL(blob);
            processedFiles.push({
              file: imageFile,
              preview,
              originalName: file.name,
            });
          }
          setSuccessMessage(`PDF converted to ${images.length} image(s)`);
          setTimeout(() => setSuccessMessage(null), 2000);
        } catch (e) {
          console.error('PDF conversion failed:', e);
          setError(`Failed to convert PDF "${file.name}". Please try uploading an image file instead.`);
          continue;
        }
      } else {
        // Regular image file
        let preview: string | null = null;
        if (file.type.startsWith('image/') || file.name.match(/\.(heic|heif)$/i)) {
          try {
            preview = await convertHeicToPreview(file);
          } catch (e) {
            console.error('Preview generation failed:', e);
          }
        }
        processedFiles.push({
          file,
          preview,
          originalName: file.name,
        });
      }
    }

    // Create file entries with previews
    const fileEntries: FileWithPreview[] = processedFiles.map(({ file, preview }) => ({
      id: generateFileId(),
      file,
      preview,
      status: 'pending' as FileStatus,
      progress: 0,
      evidenceType: EvidenceType.RECEIPT, // Default evidence type
    }));

    setFiles((prev) => [...prev, ...fileEntries]);

    // Auto-select first file if none selected
    const currentSelectedId = selectedFileId;
    if (!currentSelectedId && fileEntries.length > 0) {
      setSelectedFileId(fileEntries[0].id);
    }

    // Start processing files
    fileEntries.forEach((entry) => {
      processFile(entry.id, entry.file, entry.preview);
    });
  }, [selectedFileId, processFile]);

  // Handle file removal
  const handleRemoveFile = useCallback((fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }

    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    // If removed file was selected, select another
    if (selectedFileId === fileId) {
      const remaining = files.filter((f) => f.id !== fileId);
      setSelectedFileId(remaining.length > 0 ? remaining[0].id : null);
    }
  }, [files, selectedFileId]);

  // Handle file cancellation
  const handleCancelFile = useCallback((fileId: string) => {
    const controller = abortControllers.get(fileId);
    if (controller) {
      controller.abort();
    }
    handleRemoveFile(fileId);
  }, [handleRemoveFile]);

  // Handle retry
  const handleRetryFile = useCallback((fileId: string) => {
    const fileEntry = files.find((f) => f.id === fileId);
    if (!fileEntry) return;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, status: 'pending' as FileStatus, progress: 0, error: undefined }
          : f
      )
    );
    processFile(fileId, fileEntry.file, fileEntry.preview);
  }, [files, processFile]);

  // Toggle file selection for multi-image grouping
  const handleToggleGroupSelection = useCallback((fileId: string) => {
    setSelectedForGrouping((prev) => {
      if (prev.includes(fileId)) {
        return prev.filter((id) => id !== fileId);
      }
      return [...prev, fileId];
    });
  }, []);

  // Process selected files as a single multi-page receipt
  const processGroupedImages = useCallback(async () => {
    if (selectedForGrouping.length === 0) return;

    setProcessingGroup(true);
    setError(null);

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Mark all selected files as uploading
      setFiles((prev) =>
        prev.map((f) =>
          selectedForGrouping.includes(f.id)
            ? { ...f, status: 'uploading' as FileStatus, progress: 0 }
            : f
        )
      );

      // Create form data with all selected files
      const formDataToSend = new FormData();
      const selectedFiles = files.filter((f) => selectedForGrouping.includes(f.id));

      selectedFiles.forEach((fileEntry) => {
        formDataToSend.append('files', fileEntry.file);
      });

      // Add batch mode flag (true = separate receipts, false = multi-page single receipt)
      formDataToSend.append('batchMode', batchMode.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setFiles((prev) =>
          prev.map((f) =>
            selectedForGrouping.includes(f.id) && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          )
        );
      }, 200);

      // Upload all files
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      clearInterval(progressInterval);

      // Update to analyzing
      setFiles((prev) =>
        prev.map((f) =>
          selectedForGrouping.includes(f.id)
            ? { ...f, status: 'analyzing' as FileStatus, progress: 100 }
            : f
        )
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process receipt');
      }

      const result = await response.json();

      // Handle BATCH MODE results (each file has its own OCR data)
      if (result.batchMode && result.batchResults) {
        console.log('Batch mode results:', result.batchResults);

        // Update each file with its own OCR data
        setFiles((prev) =>
          prev.map((f) => {
            if (!selectedForGrouping.includes(f.id)) return f;

            // Find the corresponding batch result by index
            const fileIndex = selectedFiles.findIndex((sf) => sf.id === f.id);
            const batchResult = result.batchResults[fileIndex];

            if (batchResult && batchResult.data) {
              return {
                ...f,
                status: 'complete' as FileStatus,
                progress: 100,
                ocrData: {
                  date: batchResult.data.date,
                  vendor: batchResult.data.vendor,
                  amount: batchResult.data.amount,
                  subtotal: batchResult.data.subtotal,
                  tax: batchResult.data.tax,
                  tip: batchResult.data.tip,
                  currency: batchResult.data.currency || 'USD',
                  category: batchResult.data.category,
                  items: batchResult.data.items || [],
                  paymentMethod: batchResult.data.paymentMethod,
                },
              };
            }
            return { ...f, status: 'complete' as FileStatus, progress: 100 };
          })
        );

        // In batch mode, select the first file to show its data
        if (selectedForGrouping.length > 0) {
          const firstFileId = selectedForGrouping[0];
          setSelectedFileId(firstFileId);

          // Set form data for the first receipt
          const firstResult = result.batchResults[0];
          if (firstResult && firstResult.data) {
            setFormData((prev) => ({
              ...prev,
              date: firstResult.data.date || '',
              merchant: firstResult.data.vendor || '',
              amount: firstResult.data.amount?.toString() || '',
              subtotal: firstResult.data.subtotal?.toString() || '',
              tax: firstResult.data.tax?.toString() || '',
              tip: firstResult.data.tip?.toString() || '',
              category: firstResult.data.category || 'other',
              currency: firstResult.data.currency || 'USD',
              paymentMethod: firstResult.data.paymentMethod || 'credit',
            }));
            setExtractedItems(
              (firstResult.data.items || []).map((item: LineItem, idx: number) => ({
                ...item,
                id: item.id || `item_${Date.now()}_${idx}`,
                selected: true,
              }))
            );
          }

          // Set first image URL
          if (result.imageUrls && result.imageUrls.length > 0) {
            setUploadedImageUrl(result.imageUrls[0]);
            setUploadedImageUrls([result.imageUrls[0]]);
          }
        }

        // Store batch results for "Save All" functionality
        const storedBatchResults = selectedFiles.map((sf, index) => ({
          fileId: sf.id,
          imageUrl: result.batchResults[index]?.imageUrl || '',
          data: result.batchResults[index]?.data || null,
        }));
        setBatchResults(storedBatchResults);

        // Clear multi-select mode after batch processing
        setMultiSelectMode(false);
        setSelectedForGrouping([]);
        setShowSplitView(true);

      } else {
        // Handle SINGLE/MULTI-PAGE MODE results (existing behavior)
        // Update the first file with all OCR data, mark others as complete
        const firstFileId = selectedForGrouping[0];
        setFiles((prev) =>
          prev.map((f) => {
            if (!selectedForGrouping.includes(f.id)) return f;

            if (f.id === firstFileId) {
              return {
                ...f,
                status: 'complete' as FileStatus,
                progress: 100,
                ocrData: result.data
                  ? {
                      date: result.data.date,
                      vendor: result.data.vendor,
                      amount: result.data.amount,
                      subtotal: result.data.subtotal,
                      tax: result.data.tax,
                      tip: result.data.tip,
                      currency: result.data.currency || 'USD',
                      category: result.data.category,
                      items: result.data.items || [],
                      paymentMethod: result.data.paymentMethod,
                    }
                  : undefined,
              };
            }
            return { ...f, status: 'complete' as FileStatus, progress: 100 };
          })
        );

        // Set the grouped image URLs and document types
        if (result.imageUrls) {
          setUploadedImageUrls(result.imageUrls);
          setUploadedImageUrl(result.imageUrls[0]);
        } else if (result.imageUrl) {
          setUploadedImageUrls([result.imageUrl]);
          setUploadedImageUrl(result.imageUrl);
        }
        setUploadedDocumentTypes(result.documentTypes || []);
        setUploadedRawText(result.rawText || null);

        // Populate form with OCR data (preserve user-entered values)
        const groupOcrData = result.data;
        if (groupOcrData) {
          setFormData((prev) => ({
            date: prev.date || groupOcrData.date || '',
            merchant: prev.merchant || groupOcrData.vendor || '',
            amount: prev.amount || (groupOcrData.amount ? groupOcrData.amount.toFixed(2) : ''),
            subtotal: prev.subtotal || (groupOcrData.subtotal ? groupOcrData.subtotal.toFixed(2) : ''),
            tax: prev.tax || (groupOcrData.tax ? groupOcrData.tax.toFixed(2) : ''),
            tip: prev.tip || (groupOcrData.tip ? groupOcrData.tip.toFixed(2) : ''),
            currency: prev.currency || groupOcrData.currency || 'USD',
            category: prev.category !== 'other' ? prev.category : (groupOcrData.category || 'other'),
            subcategory: prev.subcategory || '',
            businessPurpose: prev.businessPurpose || '',
            paymentMethod: prev.paymentMethod || groupOcrData.paymentMethod || '',
            notes: prev.notes || '',
          }));
          setExtractedItems((prev) => prev.length > 0 ? prev : convertOcrItemsToLineItems(groupOcrData.items || []));
        }

        // Select the first file for editing
        setSelectedFileId(firstFileId);

        // Exit multi-select mode
        setMultiSelectMode(false);
        setSelectedForGrouping([]);
      }

    } catch (err) {
      console.error('Group processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process images');

      // Mark selected files as error
      setFiles((prev) =>
        prev.map((f) =>
          selectedForGrouping.includes(f.id)
            ? {
                ...f,
                status: 'error' as FileStatus,
                error: err instanceof Error ? err.message : 'Processing failed',
              }
            : f
        )
      );
    } finally {
      setProcessingGroup(false);
    }
  }, [files, selectedForGrouping]);

  // Handle form field changes
  const handleFormChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Mark that user has manually edited the form
    setUserHasEditedForm(true);
  };

  // Handle evidence type change for a file
  const handleEvidenceTypeChange = useCallback((fileId: string, type: EvidenceType) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, evidenceType: type } : f
      )
    );
  }, []);

  // Parse email text and extract data
  const handleParseEmail = useCallback(() => {
    if (!emailText.trim()) return;

    setParsingEmail(true);
    setError(null);

    try {
      const parsed = parseEmailText(emailText);
      const validation = validateParsedEmail(parsed);

      setParsedEmailData(parsed);

      // Auto-fill form fields from parsed email
      if (parsed.vendor && !formData.merchant) {
        setFormData((prev) => ({ ...prev, merchant: parsed.vendor || prev.merchant }));
      }
      if (parsed.date && !formData.date) {
        setFormData((prev) => ({ ...prev, date: parsed.date || prev.date }));
      }
      if (parsed.total && !formData.amount) {
        setFormData((prev) => ({ ...prev, amount: parsed.total?.toString() || prev.amount }));
      }
      if (parsed.currency) {
        setFormData((prev) => ({ ...prev, currency: parsed.currency || prev.currency }));
      }
      if (parsed.payment_method && !formData.paymentMethod) {
        setFormData((prev) => ({ ...prev, paymentMethod: parsed.payment_method || prev.paymentMethod }));
      }

      if (!validation.isValid) {
        setError(`Email parsed with ${validation.confidence}% confidence. Missing: ${validation.missingFields.join(', ')}`);
      } else {
        setSuccessMessage(`Email parsed successfully! Confidence: ${validation.confidence}%`);
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      setError('Failed to parse email text');
    } finally {
      setParsingEmail(false);
    }
  }, [emailText, formData.merchant, formData.date, formData.amount, formData.paymentMethod]);

  // Handle data extracted from EmailPasteInput component
  const handleEmailDataExtracted = useCallback((
    extractedFormData: { date: string; merchant: string; amount: string; currency: string; paymentMethod?: string },
    parsed: ParsedEmailData
  ) => {
    setParsedEmailData(parsed);

    // Auto-fill form fields (only fill if currently empty)
    setFormData((prev) => ({
      ...prev,
      date: prev.date || extractedFormData.date,
      merchant: prev.merchant || extractedFormData.merchant,
      amount: prev.amount || extractedFormData.amount,
      currency: extractedFormData.currency || prev.currency,
      paymentMethod: prev.paymentMethod || extractedFormData.paymentMethod || parsed.payment_method || '',
    }));

    setSuccessMessage('Data extracted from email!');
    setTimeout(() => setSuccessMessage(null), 3000);
  }, []);

  // Calculate tax year from date
  const calculateTaxYear = (dateString: string): number | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.getFullYear();
  };

  // Save receipt to database
  const handleSaveReceipt = async () => {
    // Allow saving with just email data (no file required)
    if (!selectedFile && !parsedEmailData) return;

    // Validate required fields
    if (!formData.date) {
      setError('Date is required');
      return;
    }
    if (!formData.merchant) {
      setError('Vendor/Merchant is required');
      return;
    }
    if (!formData.amount) {
      setError('Amount is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const totalAmount = parseFloat(formData.amount);
      if (isNaN(totalAmount)) {
        throw new Error('Invalid amount');
      }

      const taxYear = calculateTaxYear(formData.date);

      // Build evidence items from files
      const evidenceItems: EvidenceItem[] = [];
      const relevantFiles = uploadedImageUrls.length > 1
        ? files.filter(f => selectedForGrouping.includes(f.id) || (selectedFile && f.id === selectedFile.id))
        : selectedFile ? [selectedFile] : [];

      uploadedImageUrls.forEach((url, index) => {
        const fileData = relevantFiles[index];
        evidenceItems.push({
          id: `evidence_${Date.now()}_${index}`,
          file_url: url,
          file_name: fileData?.file.name || `file_${index}`,
          file_type: fileData?.file.type || 'image/jpeg',
          file_size: fileData?.file.size || 0,
          evidence_type: fileData?.evidenceType || EvidenceType.RECEIPT,
          extracted_text: fileData?.extractedPdfText,
          upload_date: new Date().toISOString(),
          order: index,
        });
      });

      // Save to receipts table (legacy/backward compatibility)
      // Save all items (checkbox state preserved for later selection)
      // Convert LineItem[] to ReceiptItem[] for database storage
      const receiptItems = extractedItems.map(item => ({
        name: item.name,
        price: item.unitPrice,
        quantity: item.qty,
      }));

      // Parse subtotal, tax, and tip
      const subtotalAmount = formData.subtotal ? parseFloat(formData.subtotal) : null;
      const taxAmount = formData.tax ? parseFloat(formData.tax) : null;
      const tipAmount = formData.tip ? parseFloat(formData.tip) : null;

      const receiptData = {
        merchant: formData.merchant,
        date: formData.date,
        total: totalAmount,
        subtotal: subtotalAmount,
        tax: taxAmount,
        tip: tipAmount,
        category: formData.category,
        // Note: subcategory is stored in notes until DB column is added
        items: receiptItems,
        image_url: uploadedImageUrl, // Legacy single image
        image_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : (uploadedImageUrl ? [uploadedImageUrl] : []),
        evidence_items: evidenceItems, // IRS audit-ready evidence
        email_text: emailText || null,
        parsed_email_data: parsedEmailData,
        business_purpose: formData.businessPurpose || null,
        payment_method: formData.paymentMethod || null,
        notes: formData.subcategory
          ? `[Subcategory: ${formData.subcategory}] ${formData.notes || ''}`
          : (formData.notes || null),
        tax_year: taxYear,
        description: formData.notes || formData.businessPurpose || null,
      };

      const { data: savedReceipt, error: saveError } = await createReceipt(receiptData);

      if (saveError) {
        throw saveError;
      }

      // Add to Zustand store for immediate UI update
      if (savedReceipt) {
        addReceipt(savedReceipt);
      }

      // Also save to expenses table (new IRS audit-ready structure)
      const expenseData = {
        merchant: formData.merchant,
        date: formData.date,
        total: totalAmount,
        irs_category: formData.category,
        // Note: irs_subcategory column doesn't exist yet - store in notes if needed
        file_urls: uploadedImageUrls.length > 0 ? uploadedImageUrls : (uploadedImageUrl ? [uploadedImageUrl] : []),
        document_types: uploadedDocumentTypes.length > 0 ? uploadedDocumentTypes : uploadedImageUrls.map(() => 'receipt'),
        raw_text: uploadedRawText,
        business_purpose: formData.businessPurpose || null,
        payment_method: formData.paymentMethod || null,
        notes: formData.subcategory
          ? `[Subcategory: ${formData.subcategory}] ${formData.notes || ''}`
          : (formData.notes || null),
        tax_year: taxYear,
        email_text: emailText || null,
        parsed_email_data: parsedEmailData,
      };

      // Try to save to expenses table (optional - table may not exist yet)
      try {
        const { error: expenseError } = await createExpense(expenseData);
        if (expenseError) {
          // Use warn instead of error to avoid Next.js error overlay
          console.warn('Expenses table not available (run migration-expenses-table.sql):', expenseError.message || 'Table may not exist');
        }
      } catch {
        // Silently ignore if expenses table doesn't exist
        console.warn('Expenses table not configured - skipping');
      }

      // Remove saved file from list (and any grouped files)
      if (selectedFile) {
        const savedFileId = selectedFile.id;

        // If this was a multi-image receipt, also remove related grouped files
        const groupedFileIds = uploadedImageUrls.length > 1
          ? files
              .filter(f => selectedForGrouping.includes(f.id) || f.id === savedFileId)
              .map(f => f.id)
          : [savedFileId];

        groupedFileIds.forEach(id => handleRemoveFile(id));
      }

      // Reset image URLs, document types, and email data
      setUploadedImageUrl(null);
      setUploadedImageUrls([]);
      setUploadedDocumentTypes([]);
      setUploadedRawText(null);
      setEmailText('');
      setParsedEmailData(null);

      // Reset form
      setFormData({
        date: '',
        merchant: '',
        amount: '',
        subtotal: '',
        tax: '',
        tip: '',
        currency: 'USD',
        category: 'other',
        subcategory: '',
        businessPurpose: '',
        paymentMethod: 'credit',
        notes: '',
      });
      setUserHasEditedForm(false); // Reset edit tracking for next receipt

      // Refetch usage count after saving
      refetchUsage();

      // Check if there are more files to process
      const remainingFiles = files.filter((f) => f.status === 'complete' && f.id !== selectedFile?.id);
      if (remainingFiles.length > 0) {
        setSuccessMessage('Receipt saved! Processing next file...');
        const nextFile = remainingFiles[0];
        setSelectedFileId(nextFile.id);

        // Populate form with next file's OCR data if available
        if (nextFile.ocrData) {
          setFormData({
            date: nextFile.ocrData.date || '',
            merchant: nextFile.ocrData.vendor || '',
            amount: nextFile.ocrData.amount ? nextFile.ocrData.amount.toFixed(2) : '',
            subtotal: nextFile.ocrData.subtotal ? nextFile.ocrData.subtotal.toFixed(2) : '',
            tax: nextFile.ocrData.tax ? nextFile.ocrData.tax.toFixed(2) : '',
            tip: nextFile.ocrData.tip ? nextFile.ocrData.tip.toFixed(2) : '',
            currency: nextFile.ocrData.currency || 'USD',
            category: nextFile.ocrData.category || 'other',
            subcategory: '',
            businessPurpose: '',
            paymentMethod: nextFile.ocrData.paymentMethod || 'credit',
            notes: '',
          });
          setExtractedItems(convertOcrItemsToLineItems(nextFile.ocrData.items || []));
          setUserHasEditedForm(false); // Reset edit tracking for new file
        }
      } else {
        setSuccessMessage('Receipt saved! Redirecting...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      }
    } catch (err) {
      console.error('Save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  // Save all receipts from batch processing
  const handleSaveAllReceipts = async () => {
    if (batchResults.length === 0) {
      setError('No batch results to save');
      return;
    }

    setSaving(true);
    setError(null);

    let savedCount = 0;
    const errors: string[] = [];

    try {
      for (const batchItem of batchResults) {
        if (!batchItem.data) {
          errors.push(`Skipped: No data for file`);
          continue;
        }

        const data = batchItem.data;

        // Validate required fields
        if (!data.date || !data.vendor || !data.amount) {
          errors.push(`Skipped: Missing required fields for ${data.vendor || 'unknown'}`);
          continue;
        }

        const taxYear = calculateTaxYear(data.date);

        // Find the file to get additional info
        const file = files.find(f => f.id === batchItem.fileId);

        // Build evidence item
        const evidenceItems: EvidenceItem[] = [{
          id: `evidence_${Date.now()}_${savedCount}`,
          file_url: batchItem.imageUrl,
          file_name: file?.file.name || `receipt_${savedCount}`,
          file_type: file?.file.type || 'image/jpeg',
          file_size: file?.file.size || 0,
          evidence_type: file?.evidenceType || EvidenceType.RECEIPT,
          extracted_text: file?.extractedPdfText,
          upload_date: new Date().toISOString(),
          order: 0,
        }];

        // Convert items
        const receiptItems = (data.items || []).map(item => ({
          name: item.name,
          price: item.unitPrice,
          quantity: item.qty,
        }));

        const receiptData = {
          merchant: data.vendor,
          date: data.date,
          total: data.amount,
          subtotal: data.subtotal || null,
          tax: data.tax || null,
          tip: data.tip || null,
          category: data.category || 'other',
          items: receiptItems,
          image_url: batchItem.imageUrl,
          image_urls: [batchItem.imageUrl],
          evidence_items: evidenceItems,
          email_text: null,
          parsed_email_data: null,
          business_purpose: null,
          payment_method: data.paymentMethod || 'credit',
          notes: null,
          tax_year: taxYear,
          description: null,
        };

        const { data: savedReceipt, error: saveError } = await createReceipt(receiptData);

        if (saveError) {
          errors.push(`Failed to save ${data.vendor}: ${saveError.message}`);
          continue;
        }

        // Add to store for immediate UI update
        if (savedReceipt) {
          addReceipt(savedReceipt);
        }

        savedCount++;

        // Mark file as saved
        setFiles((prev) =>
          prev.map((f) =>
            f.id === batchItem.fileId
              ? { ...f, status: 'complete' as FileStatus }
              : f
          )
        );
      }

      // Clear batch results after saving
      setBatchResults([]);

      // Refetch usage
      refetchUsage();

      if (savedCount > 0) {
        setSuccessMessage(`${savedCount} receipt(s) saved successfully!${errors.length > 0 ? ` (${errors.length} skipped)` : ''}`);

        // Reset state
        setFiles([]);
        setSelectedFileId(null);
        setFormData({
          date: '',
          merchant: '',
          amount: '',
          subtotal: '',
          tax: '',
          tip: '',
          currency: 'USD',
          category: 'other',
          subcategory: '',
          businessPurpose: '',
          paymentMethod: 'credit',
          notes: '',
        });
        setExtractedItems([]);

        // Redirect after delay
        setTimeout(() => {
          router.push('/receipts');
        }, 1500);
      } else {
        setError(`No receipts were saved. ${errors.join('; ')}`);
      }
    } catch (err) {
      console.error('Batch save error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save receipts');
    } finally {
      setSaving(false);
    }
  };

  // Track which file ID we've already populated the form for
  const [populatedForFileId, setPopulatedForFileId] = useState<string | null>(null);

  // Track if user has manually edited the form (prevent OCR from overwriting)
  const [userHasEditedForm, setUserHasEditedForm] = useState(false);

  // Track if amount field is being edited (to show raw value during editing)
  const [isEditingAmount, setIsEditingAmount] = useState(false);

  // When selected file changes (user selects different file), update form and extracted items
  // Only populate once per file to allow user edits
  useEffect(() => {
    const fileOcrData = selectedFile?.ocrData;
    if (selectedFileId && selectedFileId !== populatedForFileId && fileOcrData) {
      setFormData((prev) => ({
        ...prev,
        date: fileOcrData.date || prev.date || '',
        merchant: fileOcrData.vendor || prev.merchant || '',
        amount: fileOcrData.amount
          ? fileOcrData.amount.toFixed(2)
          : prev.amount || '',
        subtotal: fileOcrData.subtotal
          ? fileOcrData.subtotal.toFixed(2)
          : prev.subtotal || '',
        tax: fileOcrData.tax
          ? fileOcrData.tax.toFixed(2)
          : prev.tax || '',
        tip: fileOcrData.tip
          ? fileOcrData.tip.toFixed(2)
          : prev.tip || '',
        currency: fileOcrData.currency || prev.currency || 'USD',
        category: fileOcrData.category || prev.category || 'other',
        subcategory: prev.subcategory || '',
        businessPurpose: prev.businessPurpose || '',
        paymentMethod: fileOcrData.paymentMethod || prev.paymentMethod || 'credit',
        notes: prev.notes || '',
      }));
      // Also update extracted items for Split View
      setExtractedItems(convertOcrItemsToLineItems(fileOcrData.items || []));
      setPopulatedForFileId(selectedFileId);
    }
  }, [selectedFileId, selectedFile?.ocrData, populatedForFileId]);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-cyan-600 animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const completedCount = files.filter((f) => f.status === 'complete').length;
  const hasFilesToSave = files.some((f) => f.status === 'complete');

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-sky-50">
      <Navigation />

      <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">
            Upload Receipts
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Upload multiple receipts and let AI extract the details automatically
          </p>
        </div>

        {/* Usage Limit Banner */}
        {!usageLimitLoading && !isPro && (
          <div className={`mb-6 rounded-lg p-4 flex items-center justify-between ${
            canUpload
              ? 'bg-blue-50 border border-blue-200'
              : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className="flex items-center gap-3">
              {canUpload ? (
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              )}
              <div>
                <p className={`font-medium ${canUpload ? 'text-blue-900' : 'text-amber-900'}`}>
                  {canUpload
                    ? `${remainingUploads} of 10 free uploads remaining this month`
                    : 'Monthly upload limit reached'
                  }
                </p>
                <p className={`text-sm ${canUpload ? 'text-blue-700' : 'text-amber-700'}`}>
                  {canUpload
                    ? 'Upgrade to Pro for unlimited uploads'
                    : 'Upgrade to Pro to continue uploading receipts'
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/#pricing')}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Upgrade
            </button>
          </div>
        )}

        {/* Trial Banner */}
        {isTrialing && trialDaysRemaining !== null && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <Crown className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-900">
                Pro Trial Active
              </p>
              <p className="text-sm text-green-700">
                {trialDaysRemaining} days remaining in your free trial
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">Success</h3>
              <p className="text-green-700 text-sm">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Upload Zone - Always visible */}
        <div className="mb-6">
          <UploadZone
            onFilesSelected={handleFilesSelected}
            disabled={!canUpload}
            maxFiles={isPro ? 10 : remainingUploads}
          />
        </div>

        {/* Multi-image mode toggle and controls */}
        {files.length > 1 && (
          <div className="mb-6 bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setMultiSelectMode(!multiSelectMode);
                    if (multiSelectMode) {
                      setSelectedForGrouping([]);
                    }
                  }}
                  className={`
                    flex items-center justify-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors
                    ${multiSelectMode
                      ? 'bg-cyan-100 text-cyan-700 border border-cyan-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }
                  `}
                >
                  <Layers className="w-4 h-4" />
                  <span className="whitespace-nowrap">Multi-Page Mode</span>
                </button>
                {multiSelectMode && (
                  <p className="text-xs sm:text-sm text-slate-600 text-center sm:text-left">
                    Tap images to select parts of one receipt
                  </p>
                )}
              </div>

              {multiSelectMode && selectedForGrouping.length > 0 && (
                <button
                  onClick={processGroupedImages}
                  disabled={processingGroup}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm sm:text-base font-medium transition-colors disabled:opacity-50"
                >
                  {processingGroup ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Images className="w-4 h-4" />
                      <span className="whitespace-nowrap">Process {selectedForGrouping.length} Images</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {multiSelectMode && selectedForGrouping.length > 1 && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <span className="text-xs sm:text-sm text-slate-600 font-medium">Processing Mode:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchMode(true)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      batchMode
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    Separate Receipts
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchMode(false)}
                    className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      !batchMode
                        ? 'bg-cyan-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                  >
                    Multi-Page Receipt
                  </button>
                </div>
              </div>
            )}

            {multiSelectMode && (
              <div className={`mt-3 p-2 sm:p-3 rounded-lg text-xs sm:text-sm ${
                batchMode
                  ? 'bg-cyan-50 border border-cyan-200 text-cyan-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {batchMode ? (
                  <>
                    <strong>Separate Receipts:</strong> Each image will be processed as a different receipt with its own data.
                  </>
                ) : (
                  <>
                    <strong>Multi-Page Receipt:</strong> All images will be analyzed together as parts of one receipt.
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Email Text Input for IRS Evidence - Enhanced with EmailPasteInput */}
        <div className="mb-6">
          <EmailPasteInput
            onDataExtracted={handleEmailDataExtracted}
            onEmailTextChange={setEmailText}
            initialEmailText={emailText}
            showAlways={files.length === 0}
          />
        </div>

        {/* File Preview Grid */}
        {files.length > 0 && (
          <div className="mb-6">
            <ImagePreview
              files={files}
              onRemove={handleRemoveFile}
              onCancel={handleCancelFile}
              onRetry={handleRetryFile}
              multiSelectMode={multiSelectMode}
              selectedIds={selectedForGrouping}
              onSelect={handleToggleGroupSelection}
              onEvidenceTypeChange={handleEvidenceTypeChange}
            />
          </div>
        )}

        {/* Form for selected file or email data */}
        {((selectedFile && selectedFile.status === 'complete') || parsedEmailData) && (
          <div className="space-y-6">
            {/* View Mode Toggle - Show when there are images or email text */}
            {(uploadedImageUrls.length > 0 || selectedFile?.preview || emailText) && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white rounded-lg border border-gray-200 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm sm:text-base font-medium text-slate-900">Review Extracted Data</span>
                  {extractedItems.length > 0 && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                      {extractedItems.length} items
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setShowSplitView(true)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      showSplitView
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <SplitSquareVertical className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Split</span>
                  </button>
                  <button
                    onClick={() => setShowSplitView(false)}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      !showSplitView
                        ? 'bg-cyan-100 text-cyan-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    <FormInput className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>Form</span>
                  </button>
                </div>
              </div>
            )}

            {/* Split View - Image/Email Text and Extracted Data Comparison */}
            {showSplitView && (uploadedImageUrls.length > 0 || selectedFile?.preview || emailText) && (
              <SplitView
                images={uploadedImageUrls.length > 0 ? uploadedImageUrls : (selectedFile?.preview ? [selectedFile.preview] : [])}
                emailText={emailText}
                extractedData={{
                  date: formData.date,
                  vendor: formData.merchant,
                  amount: parseFloat(formData.amount) || 0,
                  subtotal: formData.subtotal ? parseFloat(formData.subtotal) : undefined,
                  tax: formData.tax ? parseFloat(formData.tax) : undefined,
                  tip: formData.tip ? parseFloat(formData.tip) : undefined,
                  currency: formData.currency,
                  items: extractedItems.filter((item) => item.selected),
                  category: formData.category,
                  paymentMethod: formData.paymentMethod,
                  businessPurpose: formData.businessPurpose,
                }}
              />
            )}

            {/* Editable Form */}
            <Card>
              <CardHeader>
                <CardTitle>Edit Receipt Details</CardTitle>
              </CardHeader>
              <CardContent>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {/* Date */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleFormChange('date', e.target.value)}
                  />
                </div>

                {/* Vendor */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Vendor/Merchant <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.merchant}
                    onChange={(e) => handleFormChange('merchant', e.target.value)}
                    placeholder="Enter store or vendor name"
                  />
                </div>

                {/* Total (Amount + Currency) */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Total <span className="text-red-500">*</span>
                  </label>
                  <div className="flex">
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleFormChange('currency', value)}
                    >
                      <SelectTrigger className="w-auto rounded-r-none border-r-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCY_OPTIONS.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.symbol}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={isEditingAmount ? formData.amount : formatNumberWithCommas(formData.amount)}
                      onChange={(e) => {
                        // Allow raw input during editing (remove non-numeric chars except . and ,)
                        const value = e.target.value.replace(/[^0-9.,]/g, '');
                        handleFormChange('amount', value.replace(/,/g, ''));
                      }}
                      onFocus={() => setIsEditingAmount(true)}
                      onBlur={(e) => {
                        setIsEditingAmount(false);
                        const parsed = parseFormattedNumber(e.target.value);
                        if (parsed) handleFormChange('amount', parsed);
                      }}
                      placeholder="0.00"
                      className="flex-1 min-w-0 rounded-l-none"
                    />
                  </div>
                </div>

                {/* Subtotal, Tax, Tip - Editable breakdown */}
                <div className="md:col-span-2 grid grid-cols-3 gap-3">
                  {/* Subtotal */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs sm:text-sm font-medium text-slate-700">
                        Subtotal
                      </label>
                      {extractedItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const itemsTotal = extractedItems
                              .filter((item) => item.selected)
                              .reduce((sum, item) => sum + item.amount, 0);
                            handleFormChange('subtotal', itemsTotal.toFixed(2));
                          }}
                          className="text-[10px] px-1.5 py-0.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded transition-colors"
                          title="Calculate from line items"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.subtotal}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          handleFormChange('subtotal', value);
                        }}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  {/* Tax */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                      Tax
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.tax}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          handleFormChange('tax', value);
                        }}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  {/* Tip */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                      Tip
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={formData.tip}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9.]/g, '');
                          handleFormChange('tip', value);
                        }}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                </div>

                {/* IRS Schedule C Category */}
                <div className="md:col-span-2">
                  <CategorySelector
                    category={formData.category}
                    subcategory={formData.subcategory}
                    onCategoryChange={(value) => handleFormChange('category', value)}
                    onSubcategoryChange={(value) => handleFormChange('subcategory', value)}
                    required
                    showSubcategory
                  />
                </div>

                {/* Business Purpose */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Business Purpose <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.businessPurpose}
                    onChange={(e) =>
                      handleFormChange('businessPurpose', e.target.value)
                    }
                    placeholder="e.g., Client meeting, Office supplies, Travel expense"
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <Select
                    value={formData.paymentMethod || 'credit'}
                    onValueChange={(value) =>
                      handleFormChange('paymentMethod', value)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.filter(m => m.value !== '').map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes - Full width */}
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
                    Notes
                  </label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => handleFormChange('notes', e.target.value)}
                    rows={2}
                    placeholder="Add any additional notes (optional)"
                    className="resize-none"
                  />
                </div>

                {/* Line Items - Full width */}
                <div className="md:col-span-2">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                    <label className="block text-xs sm:text-sm font-medium text-slate-700">
                      <span className="flex items-center gap-2">
                        <List className="w-4 h-4" />
                        Line Items ({extractedItems.length})
                      </span>
                    </label>
                    {extractedItems.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm text-cyan-600 font-medium">
                          Total: {formatAmount(selectedItemsTotal, formData.currency)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleFormChange('amount', selectedItemsTotal.toFixed(2))}
                          className="px-2 py-1 text-xs bg-cyan-100 hover:bg-cyan-200 text-cyan-700 rounded transition-colors whitespace-nowrap"
                          title="Apply to Amount field"
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>

                  {/* IRS Compliance Warnings */}
                  {(() => {
                    const amount = parseFloat(formData.amount) || 0;
                    const itemCount = extractedItems.length;
                    const isMixedPurchase = itemCount > 1;
                    const isOver500 = amount >= 500;
                    const isSmallSingleItem = itemCount <= 1 && amount < 75;
                    const isMeals = formData.category === 'meals';

                    // No warning needed for small single-item purchases
                    if (isSmallSingleItem && !isMeals) return null;

                    return (
                      <>
                        {/* $500+ warning */}
                        {isOver500 && !isMeals && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm text-red-800">
                              <strong>Required:</strong> For purchases over $500, itemized details are required for IRS audit compliance.
                            </p>
                          </div>
                        )}
                        {/* Mixed purchase warning (multiple items, not $500+, not meals) */}
                        {isMixedPurchase && !isOver500 && !isMeals && amount >= 75 && (
                          <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm text-amber-800">
                              <strong>Recommended:</strong> For mixed purchases (multiple items), itemized details help with IRS documentation.
                            </p>
                          </div>
                        )}
                        {/* Meals category warning */}
                        {isMeals && !isOver500 && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm text-red-800">
                              <strong>Required:</strong> For Meals category (50% deductible), item details are required. Note: Only restaurant meals qualify - grocery shopping should use "Supplies" category.
                            </p>
                          </div>
                        )}
                        {/* Meals + $500+ combined warning */}
                        {isMeals && isOver500 && (
                          <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-xs sm:text-sm text-red-800">
                              <strong>Required:</strong> For Meals over $500, detailed item information is required for IRS audit compliance. Note: Only restaurant meals qualify for 50% deduction - grocery shopping should use "Supplies" category.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {/* Items Table - Desktop */}
                  {extractedItems.length > 0 && (
                    <div className="hidden sm:block border border-gray-200 rounded-lg overflow-hidden mb-3">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-2 py-2 text-left w-8">
                              <input
                                type="checkbox"
                                checked={extractedItems.length > 0 && extractedItems.every((item) => item.selected)}
                                onChange={(e) => handleSelectAllItems(e.target.checked)}
                                className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                              />
                            </th>
                            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
                            <th className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase w-14">Qty</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-28 whitespace-nowrap">Unit Price</th>
                            <th className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Amount</th>
                            <th className="px-2 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {extractedItems.map((item) => (
                            <tr key={item.id} className={`${item.selected ? 'bg-white' : 'bg-gray-50 opacity-60'}`}>
                              <td className="px-2 py-2 w-8">
                                <input
                                  type="checkbox"
                                  checked={item.selected}
                                  onChange={() => handleToggleItemSelection(item.id)}
                                  className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                                />
                              </td>
                              <td className="px-2 py-2">
                                <input
                                  type="text"
                                  value={item.name}
                                  onChange={(e) => handleUpdateItem(item.id, 'name', e.target.value)}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm"
                                  placeholder="Item name"
                                  title={item.name}
                                />
                              </td>
                              <td className="px-2 py-2 w-14">
                                <input
                                  type="number"
                                  min="1"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateItem(item.id, 'qty', parseInt(e.target.value) || 1)}
                                  className="w-full px-1 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-center"
                                />
                              </td>
                              <td className="px-2 py-2 w-28">
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  value={editingUnitPrice?.id === item.id ? editingUnitPrice.value : item.unitPrice.toFixed(2)}
                                  onFocus={() => setEditingUnitPrice({ id: item.id, value: item.unitPrice.toFixed(2) })}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/[^0-9.]/g, '');
                                    setEditingUnitPrice({ id: item.id, value: val });
                                  }}
                                  onBlur={() => {
                                    if (editingUnitPrice?.id === item.id) {
                                      handleUpdateItem(item.id, 'unitPrice', parseFloat(editingUnitPrice.value) || 0);
                                      setEditingUnitPrice(null);
                                    }
                                  }}
                                  className="w-full px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-cyan-500 text-sm text-right"
                                  placeholder="0.00"
                                />
                              </td>
                              <td className="px-2 py-2 w-24 text-right font-medium text-gray-900 whitespace-nowrap">
                                {formatAmount(item.amount, formData.currency)}
                              </td>
                              <td className="px-2 py-2 w-8">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id)}
                                  className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                                  title="Remove item"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Items Cards - Mobile */}
                  {extractedItems.length > 0 && (
                    <div className="sm:hidden space-y-2 mb-3">
                      {/* Select All */}
                      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 rounded-lg">
                        <input
                          type="checkbox"
                          checked={extractedItems.length > 0 && extractedItems.every((item) => item.selected)}
                          onChange={(e) => handleSelectAllItems(e.target.checked)}
                          className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                        />
                        <span className="text-sm font-medium text-gray-500">Select All</span>
                      </div>
                      {/* Item Cards */}
                      {extractedItems.map((item) => (
                        <div
                          key={item.id}
                          className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                            item.selected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                          }`}
                          onClick={() => setSelectedItemForModal(item)}
                          onKeyDown={(e) => e.key === 'Enter' && setSelectedItemForModal(item)}
                          role="button"
                          tabIndex={0}
                          aria-label={`Edit item: ${item.name}`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={item.selected}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleToggleItemSelection(item.id);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-300 text-cyan-500 focus:ring-cyan-500 shrink-0"
                            />
                            <div className="flex-1 min-w-0 overflow-hidden">
                              <p className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                            </div>
                            <span className="text-xs text-gray-400 shrink-0">{item.qty}x</span>
                            <p className="text-sm font-semibold text-gray-900 shrink-0">
                              {formatAmount(item.amount, formData.currency)}
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveItem(item.id);
                              }}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors shrink-0"
                              title="Remove item"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add new item - Desktop */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Input
                      type="text"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddItem();
                        }
                      }}
                      placeholder="Add new item..."
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!newItemName.trim()}
                      className="p-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Add item"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Add new item - Mobile (opens drawer directly) */}
                  <button
                    type="button"
                    onClick={handleAddNewItemWithDrawer}
                    className="sm:hidden w-full flex items-center justify-center gap-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-cyan-400 hover:text-cyan-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm">Add new item</span>
                  </button>
                </div>

                {/* Save button - Full width */}
                <div className="md:col-span-2 pt-2 space-y-2">
                  {/* Save All button - shown when batch results exist */}
                  {batchResults.length > 1 && (
                    <Button
                      onClick={handleSaveAllReceipts}
                      disabled={saving}
                      className="w-full h-11 sm:h-12 bg-green-500 hover:bg-green-600 text-white"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                          Saving All...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                          Save All {batchResults.length} Receipts
                        </>
                      )}
                    </Button>
                  )}

                  {/* Single save button */}
                  <Button
                    onClick={handleSaveReceipt}
                    disabled={
                      saving ||
                      !formData.date ||
                      !formData.merchant ||
                      !formData.amount ||
                      !formData.businessPurpose
                    }
                    className={`w-full h-11 sm:h-12 ${batchResults.length > 1 ? 'bg-slate-500 hover:bg-slate-600' : 'bg-cyan-500 hover:bg-cyan-600'} text-white`}
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                        {batchResults.length > 1 ? 'Save This Receipt Only' : 'Save Receipt'}
                        {completedCount > 1 && batchResults.length <= 1 && (
                          <Badge variant="secondary" className="ml-2 bg-cyan-400 text-white">
                            +{completedCount - 1}
                          </Badge>
                        )}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No completed files message */}
        {files.length > 0 && !hasFilesToSave && (
          <Card className="text-center py-8">
            <CardContent>
              <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-500 animate-spin mx-auto mb-3 sm:mb-4" />
              <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">
                Processing your receipts...
              </h3>
              <p className="text-sm sm:text-base text-slate-600">
                AI is analyzing your uploads
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Item Detail Bottom Sheet - Mobile */}
      <Sheet open={!!selectedItemForModal} onOpenChange={(open) => !open && setSelectedItemForModal(null)}>
        <SheetContent
          side="bottom"
          className="sm:hidden rounded-t-2xl px-0 pb-[env(safe-area-inset-bottom)] h-auto max-h-[90vh] max-h-[90dvh]"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {selectedItemForModal && (
            <div className="flex flex-col h-full max-h-[90vh] max-h-[90dvh]">
              {/* Handle */}
              <div className="flex justify-center py-2 flex-shrink-0">
                <div className="w-10 h-1 bg-gray-300 rounded-full" />
              </div>
              <SheetHeader className="px-4 pb-3 border-b border-gray-100 flex-shrink-0">
                <SheetTitle className="text-lg font-semibold">
                  {selectedItemForModal.name ? 'Edit Item' : 'New Item'}
                </SheetTitle>
              </SheetHeader>
              {/* Content - scrollable area with keyboard-aware padding */}
              <div className="p-4 space-y-4 overflow-y-auto flex-1 overscroll-contain">
                {/* Item Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Item Name
                  </label>
                  <Textarea
                    value={selectedItemForModal.name}
                    onChange={(e) => {
                      handleUpdateItem(selectedItemForModal.id, 'name', e.target.value);
                      setSelectedItemForModal({ ...selectedItemForModal, name: e.target.value });
                    }}
                    rows={2}
                    className="resize-none text-base"
                    placeholder="Item name"
                    onFocus={(e) => {
                      const target = e.target;
                      const timeoutId = setTimeout(() => {
                        if (target && document.body.contains(target)) {
                          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 300);
                      target.dataset.scrollTimeout = String(timeoutId);
                    }}
                    onBlur={(e) => {
                      const timeoutId = e.target.dataset.scrollTimeout;
                      if (timeoutId) clearTimeout(Number(timeoutId));
                    }}
                  />
                </div>
                {/* Quantity & Unit Price */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={selectedItemForModal.qty}
                      onChange={(e) => {
                        const qty = parseInt(e.target.value) || 1;
                        handleUpdateItem(selectedItemForModal.id, 'qty', qty);
                        setSelectedItemForModal({ ...selectedItemForModal, qty, amount: qty * selectedItemForModal.unitPrice });
                      }}
                      className="text-center text-base"
                      onFocus={(e) => {
                        const target = e.target;
                        const timeoutId = setTimeout(() => {
                          if (target && document.body.contains(target)) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 300);
                        target.dataset.scrollTimeout = String(timeoutId);
                      }}
                      onBlur={(e) => {
                        const timeoutId = e.target.dataset.scrollTimeout;
                        if (timeoutId) clearTimeout(Number(timeoutId));
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit Price
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedItemForModal.unitPrice.toFixed(2)}
                      onChange={(e) => {
                        const unitPrice = parseFloat(e.target.value) || 0;
                        handleUpdateItem(selectedItemForModal.id, 'unitPrice', unitPrice);
                        setSelectedItemForModal({ ...selectedItemForModal, unitPrice, amount: selectedItemForModal.qty * unitPrice });
                      }}
                      className="text-right text-base"
                      placeholder="0.00"
                      onFocus={(e) => {
                        const target = e.target;
                        const timeoutId = setTimeout(() => {
                          if (target && document.body.contains(target)) {
                            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                        }, 300);
                        target.dataset.scrollTimeout = String(timeoutId);
                      }}
                      onBlur={(e) => {
                        const timeoutId = e.target.dataset.scrollTimeout;
                        if (timeoutId) clearTimeout(Number(timeoutId));
                      }}
                    />
                  </div>
                </div>
                {/* Total Amount */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Amount</span>
                    <span className="text-lg font-bold text-gray-900">
                      {formatAmount(selectedItemForModal.qty * selectedItemForModal.unitPrice, formData.currency)}
                    </span>
                  </div>
                </div>
                {/* Selected checkbox */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="item-selected-upload"
                    checked={selectedItemForModal.selected}
                    onChange={() => {
                      handleToggleItemSelection(selectedItemForModal.id);
                      setSelectedItemForModal({ ...selectedItemForModal, selected: !selectedItemForModal.selected });
                    }}
                    className="w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
                  />
                  <label htmlFor="item-selected-upload" className="text-sm text-gray-700">
                    Include in total calculation
                  </label>
                </div>
              </div>
              {/* Footer Actions */}
              <SheetFooter className="flex-row gap-3 p-4 border-t border-gray-100 flex-shrink-0 bg-white">
                <Button
                  variant="outline"
                  onClick={() => {
                    handleRemoveItem(selectedItemForModal.id);
                    setSelectedItemForModal(null);
                  }}
                  className="flex-1 h-11 bg-red-50 text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                >
                  Delete
                </Button>
                <Button
                  onClick={() => setSelectedItemForModal(null)}
                  className="flex-1 h-11 bg-cyan-500 hover:bg-cyan-600"
                >
                  Done
                </Button>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
