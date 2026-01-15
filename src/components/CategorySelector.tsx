'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertCircle, Info, X } from 'lucide-react';
import {
  IRS_SCHEDULE_C_CATEGORIES,
  CATEGORY_KEYS,
  getSubcategories,
  getCategoryNote,
  formatCategoryWithLine,
  Subcategory,
} from '@/constants/irs-categories';

// ============================================================================
// TYPES
// ============================================================================

interface CategorySelectorProps {
  /** Current category value */
  category: string;
  /** Current subcategory value (optional) */
  subcategory?: string;
  /** Callback when category changes */
  onCategoryChange: (category: string) => void;
  /** Callback when subcategory changes */
  onSubcategoryChange?: (subcategory: string) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
  /** Show subcategory selector */
  showSubcategory?: boolean;
  /** Compact mode for mobile */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CategorySelector({
  category,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  required = false,
  disabled = false,
  className = '',
  showSubcategory = true,
  compact = false,
}: CategorySelectorProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isSubcategoryOpen, setIsSubcategoryOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const categoryRef = useRef<HTMLDivElement>(null);
  const subcategoryRef = useRef<HTMLDivElement>(null);

  // Get current category data
  const currentCategory = IRS_SCHEDULE_C_CATEGORIES[category];
  const subcategories = getSubcategories(category);
  const categoryNote = getCategoryNote(category);
  const currentSubcategory = subcategories.find((s) => s.key === subcategory);

  // Filter categories based on search
  const filteredCategories = CATEGORY_KEYS.filter((key) => {
    const cat = IRS_SCHEDULE_C_CATEGORIES[key];
    const searchLower = searchTerm.toLowerCase();
    return (
      cat.label.toLowerCase().includes(searchLower) ||
      cat.line.toLowerCase().includes(searchLower) ||
      cat.description.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
        setSearchTerm('');
      }
      if (subcategoryRef.current && !subcategoryRef.current.contains(event.target as Node)) {
        setIsSubcategoryOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset subcategory when category changes
  useEffect(() => {
    if (onSubcategoryChange && subcategory) {
      const validSubcategory = subcategories.find((s) => s.key === subcategory);
      if (!validSubcategory) {
        onSubcategoryChange('');
      }
    }
  }, [category, subcategory, subcategories, onSubcategoryChange]);

  const handleCategorySelect = (key: string) => {
    onCategoryChange(key);
    setIsCategoryOpen(false);
    setSearchTerm('');
    // Reset subcategory when category changes
    if (onSubcategoryChange) {
      onSubcategoryChange('');
    }
  };

  const handleSubcategorySelect = (key: string) => {
    if (onSubcategoryChange) {
      onSubcategoryChange(key);
    }
    setIsSubcategoryOpen(false);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category Selector */}
      <div>
        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
          IRS Schedule C Category {required && <span className="text-red-500">*</span>}
        </label>
        <div ref={categoryRef} className="relative">
          <button
            type="button"
            onClick={() => !disabled && setIsCategoryOpen(!isCategoryOpen)}
            disabled={disabled}
            className={`
              w-full px-3 sm:px-4 py-2.5 text-sm text-left
              border border-gray-300 rounded-lg
              focus:outline-none focus:ring-2 focus:ring-cyan-500
              bg-white flex items-center justify-between
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}
              ${compact ? 'py-2' : 'py-2.5'}
            `}
          >
            <span className={currentCategory ? 'text-gray-900' : 'text-gray-500'}>
              {currentCategory ? formatCategoryWithLine(category) : 'Select category...'}
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${
                isCategoryOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Category Dropdown */}
          {isCategoryOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
              {/* Search Input */}
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
              </div>

              {/* Category List */}
              <div className="overflow-y-auto max-h-64">
                {filteredCategories.length > 0 ? (
                  filteredCategories.map((key) => {
                    const cat = IRS_SCHEDULE_C_CATEGORIES[key];
                    const isSelected = category === key;
                    const hasNote = cat.note;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleCategorySelect(key)}
                        className={`
                          w-full px-3 py-2.5 text-left text-sm
                          hover:bg-cyan-50 transition-colors
                          ${isSelected ? 'bg-cyan-100 text-cyan-900' : 'text-gray-700'}
                          ${hasNote ? 'border-l-4 border-amber-400' : ''}
                        `}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span className="text-cyan-600 text-xs">Line {cat.line}</span>
                              <span>{cat.label}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {cat.description}
                            </p>
                          </div>
                          {hasNote && (
                            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 ml-2" />
                          )}
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-center text-gray-500 text-sm">
                    No categories found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Category Note Banner */}
        {categoryNote && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="text-xs text-amber-800">{categoryNote}</span>
          </div>
        )}

        {/* Category Description */}
        {currentCategory && !compact && (
          <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span>{currentCategory.description}</span>
          </div>
        )}
      </div>

      {/* Subcategory Selector */}
      {showSubcategory && currentCategory && subcategories.length > 0 && (
        <div>
          <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
            Subcategory
            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
          </label>
          <div ref={subcategoryRef} className="relative">
            <button
              type="button"
              onClick={() => !disabled && setIsSubcategoryOpen(!isSubcategoryOpen)}
              disabled={disabled}
              className={`
                w-full px-3 sm:px-4 py-2.5 text-sm text-left
                border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-cyan-500
                bg-white flex items-center justify-between
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-gray-400'}
                ${compact ? 'py-2' : 'py-2.5'}
              `}
            >
              <span className={currentSubcategory ? 'text-gray-900' : 'text-gray-500'}>
                {currentSubcategory ? currentSubcategory.label : 'Select subcategory...'}
              </span>
              <div className="flex items-center gap-1">
                {currentSubcategory && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onSubcategoryChange) onSubcategoryChange('');
                    }}
                    className="p-0.5 hover:bg-gray-200 rounded"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    isSubcategoryOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Subcategory Dropdown */}
            {isSubcategoryOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {subcategories.map((sub: Subcategory) => {
                  const isSelected = subcategory === sub.key;

                  return (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => handleSubcategorySelect(sub.key)}
                      className={`
                        w-full px-3 py-2.5 text-left text-sm
                        hover:bg-cyan-50 transition-colors
                        ${isSelected ? 'bg-cyan-100 text-cyan-900' : 'text-gray-700'}
                      `}
                    >
                      <div className="font-medium">{sub.label}</div>
                      <p className="text-xs text-gray-500 mt-0.5">{sub.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subcategory Description */}
          {currentSubcategory && !compact && (
            <div className="mt-1.5 flex items-start gap-1.5 text-xs text-gray-500">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>{currentSubcategory.description}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SIMPLE SELECT VERSION (For backwards compatibility)
// ============================================================================

interface SimpleCategorySelectorProps {
  /** Current category value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

export function SimpleCategorySelector({
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: SimpleCategorySelectorProps) {
  const categoryNote = getCategoryNote(value);

  return (
    <div className={className}>
      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1">
        Category {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full px-3 sm:px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
      >
        {CATEGORY_KEYS.map((key) => {
          const cat = IRS_SCHEDULE_C_CATEGORIES[key];
          return (
            <option key={key} value={key}>
              Line {cat.line} - {cat.label}
            </option>
          );
        })}
      </select>

      {/* Category Note Banner */}
      {categoryNote && (
        <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <span className="text-xs text-amber-800">{categoryNote}</span>
        </div>
      )}
    </div>
  );
}
