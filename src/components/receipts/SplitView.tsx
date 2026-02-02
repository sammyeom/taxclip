'use client';

import { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  List,
  DollarSign,
  Calendar,
  Store,
  Tag,
  CreditCard,
  Mail,
  Check,
  Briefcase,
} from 'lucide-react';
import { LineItem } from '@/types/database';

export interface ExtractedData {
  date: string;
  vendor: string;
  amount: number;
  subtotal?: number;
  tax?: number;
  tip?: number;
  currency?: string;
  items: LineItem[] | string[];
  category: string;
  paymentMethod?: string;
  businessPurpose?: string;
}

// Currency symbol mapping
const CURRENCY_INFO: Record<string, { symbol: string; name: string }> = {
  USD: { symbol: '$', name: 'USD' },
  EUR: { symbol: '€', name: 'EUR' },
  GBP: { symbol: '£', name: 'GBP' },
  JPY: { symbol: '¥', name: 'JPY' },
  KRW: { symbol: '₩', name: 'KRW' },
  CNY: { symbol: '¥', name: 'CNY' },
  CAD: { symbol: 'C$', name: 'CAD' },
  AUD: { symbol: 'A$', name: 'AUD' },
  CHF: { symbol: 'CHF', name: 'CHF' },
  INR: { symbol: '₹', name: 'INR' },
  SGD: { symbol: 'S$', name: 'SGD' },
  HKD: { symbol: 'HK$', name: 'HKD' },
  TWD: { symbol: 'NT$', name: 'TWD' },
  THB: { symbol: '฿', name: 'THB' },
  MXN: { symbol: 'MX$', name: 'MXN' },
  BRL: { symbol: 'R$', name: 'BRL' },
};

// Helper to normalize items to LineItem format
const normalizeItems = (items: LineItem[] | string[]): LineItem[] => {
  if (!items || items.length === 0) return [];

  // Check if first item is a string (legacy format)
  if (typeof items[0] === 'string') {
    return (items as string[]).map((name, index) => ({
      id: `legacy_${index}`,
      name,
      qty: 1,
      unitPrice: 0,
      amount: 0,
      selected: true,
    }));
  }

  return items as LineItem[];
};

interface SplitViewProps {
  images: string[]; // Array of image URLs or base64
  extractedData: ExtractedData;
  emailText?: string; // Email text to display when no images
  onDataChange?: (field: keyof ExtractedData, value: string | number | string[]) => void;
  editable?: boolean;
}

export default function SplitView({
  images,
  extractedData,
  emailText,
  onDataChange,
  editable = false,
}: SplitViewProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
        setCurrentImageIndex(currentImageIndex - 1);
      } else if (e.key === 'ArrowRight' && currentImageIndex < images.length - 1) {
        setCurrentImageIndex(currentImageIndex + 1);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentImageIndex, images.length, isFullscreen]);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  const nextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1);
    }
  };

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1);
    }
  };

  // Format currency with symbol and code (e.g., "$1,234.56 USD")
  const formatCurrency = (amount: number, currencyCode?: string) => {
    const code = currencyCode || 'USD';
    const info = CURRENCY_INFO[code] || { symbol: '$', name: code };

    // Format number with commas and 2 decimal places
    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${info.symbol}${formattedNumber} ${info.name}`;
  };

  // Format amount for line items (symbol + number only)
  const formatAmount = (amount: number, currencyCode?: string) => {
    const code = currencyCode || 'USD';
    const info = CURRENCY_INFO[code] || { symbol: '$', name: code };

    const formattedNumber = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${info.symbol}${formattedNumber}`;
  };

  // Calculate total from subtotal + tax + tip
  const getCalculatedTotal = (): number => {
    const subtotal = extractedData.subtotal ?? 0;
    const tax = extractedData.tax ?? 0;
    const tip = extractedData.tip ?? 0;

    // If subtotal exists, calculate total from subtotal + tax + tip
    if (subtotal > 0 || tax > 0 || tip > 0) {
      return subtotal + tax + tip;
    }
    // Otherwise use the original amount
    return extractedData.amount;
  };

  const calculatedTotal = getCalculatedTotal();

  // Category label mapping
  const categoryLabels: Record<string, string> = {
    advertising: 'Advertising',
    office_expense: 'Office Expense',
    supplies: 'Supplies',
    meals: 'Meals (50% deductible)',
    travel: 'Travel',
    utilities: 'Utilities',
    car_truck: 'Car & Truck',
    insurance: 'Insurance',
    legal_professional: 'Legal & Professional',
    rent_lease: 'Rent/Lease',
    repairs_maintenance: 'Repairs & Maintenance',
    other: 'Other',
  };

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${isFullscreen ? 'h-full p-4' : ''}`}>
        {/* Left Panel - Image Viewer or Email Text */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {images.length > 0 ? (
                <>
                  <ImageIcon className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Receipt Image
                    {images.length > 1 && ` (${currentImageIndex + 1}/${images.length})`}
                  </span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Email Text
                  </span>
                </>
              )}
            </div>
            {images.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4 text-gray-600" />
                </button>
                <button
                  onClick={handleResetZoom}
                  className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded transition-colors"
                >
                  {Math.round(zoomLevel * 100)}%
                </button>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4 text-gray-600" />
                </button>
                <div className="w-px h-4 bg-gray-300 mx-1" />
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                >
                  <Maximize2 className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            )}
          </div>

          {/* Content Container */}
          <div
            ref={imageContainerRef}
            className={`relative flex-1 overflow-auto bg-gray-100 ${isFullscreen ? 'h-[calc(100vh-120px)]' : 'h-[280px] sm:h-[400px] lg:h-[500px]'}`}
          >
            {images.length > 0 ? (
              <div
                className="min-h-full flex items-start justify-center p-4"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'top center',
                }}
              >
                <img
                  src={images[currentImageIndex]}
                  alt={`Receipt page ${currentImageIndex + 1}`}
                  className="max-w-full h-auto shadow-lg rounded"
                  draggable={false}
                />
              </div>
            ) : emailText ? (
              <div className="h-full p-4 overflow-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  {emailText}
                </pre>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2" />
                  <p>No image available</p>
                </div>
              </div>
            )}

            {/* Navigation Arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  disabled={currentImageIndex === 0}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-lg transition-all ${
                    currentImageIndex === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-white hover:scale-110'
                  }`}
                >
                  <ChevronLeft className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={nextImage}
                  disabled={currentImageIndex === images.length - 1}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/90 shadow-lg transition-all ${
                    currentImageIndex === images.length - 1
                      ? 'opacity-30 cursor-not-allowed'
                      : 'hover:bg-white hover:scale-110'
                  }`}
                >
                  <ChevronRight className="w-5 h-5 text-gray-700" />
                </button>
              </>
            )}
          </div>

          {/* Image Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 p-3 border-t border-gray-200 bg-gray-50 overflow-x-auto">
              {images.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    index === currentImageIndex
                      ? 'border-cyan-500 ring-2 ring-cyan-200'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <img
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel - Extracted Data */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col">
          {/* Data Header */}
          <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-gray-50">
            <List className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Extracted Data</span>
          </div>

          {/* Data Content */}
          <div className={`flex-1 overflow-auto p-4 ${isFullscreen ? 'h-[calc(100vh-120px)]' : ''}`}>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {/* Vendor */}
              <div className="col-span-2 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg p-4 border border-cyan-100">
                <div className="flex items-center gap-2 text-cyan-600 mb-1">
                  <Store className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Vendor</span>
                </div>
                <p className="text-lg font-semibold text-gray-900 truncate">
                  {extractedData.vendor || 'Unknown'}
                </p>
              </div>

              {/* Amount */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 border border-green-100">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Total</span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(calculatedTotal, extractedData.currency)}
                </p>
              </div>

              {/* Date */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Date</span>
                </div>
                <p className="text-lg font-semibold text-gray-900">
                  {extractedData.date || 'Unknown'}
                </p>
              </div>

              {/* Category */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-100">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Tag className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Category</span>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {categoryLabels[extractedData.category] || extractedData.category}
                </p>
              </div>

              {/* Payment Method */}
              {extractedData.paymentMethod && (
                <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600 mb-1">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Payment</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 capitalize">
                    {extractedData.paymentMethod}
                  </p>
                </div>
              )}

              {/* Business Purpose */}
              {extractedData.businessPurpose && (
                <div className="col-span-2 bg-gradient-to-r from-rose-50 to-pink-50 rounded-lg p-4 border border-rose-100">
                  <div className="flex items-center gap-2 text-rose-600 mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs font-medium uppercase tracking-wide">Business Purpose</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {extractedData.businessPurpose}
                  </p>
                </div>
              )}
            </div>

            {/* Items Table */}
            {(() => {
              const normalizedItems = normalizeItems(extractedData.items);
              const selectedTotal = normalizedItems
                .filter((item) => item.selected)
                .reduce((sum, item) => sum + item.amount, 0);

              return (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <List className="w-4 h-4" />
                      Line Items ({normalizedItems.length})
                    </h3>
                    {normalizedItems.length > 0 && selectedTotal > 0 && (
                      <span className="text-sm text-cyan-600 font-medium">
                        Selected: {formatAmount(selectedTotal, extractedData.currency)}
                      </span>
                    )}
                  </div>

                  {normalizedItems.length > 0 ? (
                    <>
                      {/* Desktop Table */}
                      <div className="hidden sm:block max-h-[300px] overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-10"></th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase w-16">Qty</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Unit Price</th>
                              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase w-24">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {normalizedItems.map((item, index) => (
                              <tr
                                key={item.id || index}
                                className={`transition-colors ${item.selected ? 'hover:bg-cyan-50' : 'bg-gray-50 opacity-60'}`}
                              >
                                <td className="px-3 py-2 text-center">
                                  {item.selected ? (
                                    <Check className="w-4 h-4 text-green-500 mx-auto" />
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-gray-900">{item.name}</td>
                                <td className="px-3 py-2 text-center text-gray-600">{item.qty}</td>
                                <td className="px-3 py-2 text-right text-gray-600">
                                  {formatAmount(item.unitPrice, extractedData.currency)}
                                </td>
                                <td className="px-3 py-2 text-right font-medium text-gray-900">
                                  {formatAmount(item.amount, extractedData.currency)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards */}
                      <div className="sm:hidden max-h-[300px] overflow-auto p-2 space-y-2">
                        {normalizedItems.map((item, index) => (
                          <div
                            key={item.id || index}
                            className={`border rounded-lg p-3 ${
                              item.selected ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className="shrink-0">
                                {item.selected ? (
                                  <Check className="w-4 h-4 text-green-500" />
                                ) : (
                                  <span className="text-gray-300 text-sm">-</span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate" title={item.name}>{item.name}</p>
                              </div>
                              <span className="text-xs text-gray-400 shrink-0">{item.qty}x</span>
                              <p className="text-sm font-semibold text-gray-900 shrink-0">
                                {formatAmount(item.amount, extractedData.currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="px-4 py-8 text-center text-gray-400">
                      <List className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No line items extracted</p>
                    </div>
                  )}

                  {/* Subtotal, Tax, Tip Section */}
                  {(extractedData.subtotal !== undefined || extractedData.tax !== undefined || extractedData.tip !== undefined) && (
                    <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
                      <div className="space-y-2">
                        {/* Subtotal */}
                        {extractedData.subtotal !== undefined && extractedData.subtotal > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="text-gray-900 font-medium">
                              {formatAmount(extractedData.subtotal, extractedData.currency)}
                            </span>
                          </div>
                        )}
                        {/* Tax */}
                        {extractedData.tax !== undefined && extractedData.tax > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Tax</span>
                            <span className="text-gray-900 font-medium">
                              {formatAmount(extractedData.tax, extractedData.currency)}
                            </span>
                          </div>
                        )}
                        {/* Tip */}
                        {extractedData.tip !== undefined && extractedData.tip > 0 && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">Tip</span>
                            <span className="text-gray-900 font-medium">
                              {formatAmount(extractedData.tip, extractedData.currency)}
                            </span>
                          </div>
                        )}
                        {/* Separator line */}
                        <div className="border-t border-gray-300 my-2"></div>
                        {/* Total */}
                        <div className="flex justify-between items-center">
                          <span className="text-gray-900 font-semibold">Total</span>
                          <span className="text-lg text-green-600 font-bold">
                            {formatAmount(calculatedTotal, extractedData.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Multi-image notice */}
            {images.length > 1 && (
              <div className="mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg text-sm text-cyan-600">
                <p className="font-medium">Multi-Page Receipt</p>
                <p className="text-xs mt-1 text-cyan-600">
                  Data extracted from {images.length} images. Use arrow keys or thumbnails to navigate.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
