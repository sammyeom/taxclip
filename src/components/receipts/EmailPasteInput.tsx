'use client';

import { useState, useCallback } from 'react';
import { Mail, Loader2, Check, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { parseEmailText, validateParsedEmail } from '@/lib/email-parser';
import { ParsedEmailData } from '@/types/evidence';

interface ExtractedFormData {
  date: string;
  merchant: string;
  amount: string;
  currency: string;
}

interface EmailPasteInputProps {
  onDataExtracted: (data: ExtractedFormData, parsedData: ParsedEmailData) => void;
  onEmailTextChange?: (text: string) => void;
  initialEmailText?: string;
  showAlways?: boolean;
}

export default function EmailPasteInput({
  onDataExtracted,
  onEmailTextChange,
  initialEmailText = '',
  showAlways = false,
}: EmailPasteInputProps) {
  const [emailText, setEmailText] = useState(initialEmailText);
  const [isExpanded, setIsExpanded] = useState(showAlways);
  const [isParsing, setIsParsing] = useState(false);
  const [isExtracted, setIsExtracted] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    confidence: number;
    missingFields: string[];
  } | null>(null);

  const handleTextChange = useCallback((text: string) => {
    setEmailText(text);
    setIsExtracted(false);
    setValidationResult(null);
    onEmailTextChange?.(text);
  }, [onEmailTextChange]);

  const handleSubmit = useCallback(() => {
    if (!emailText.trim()) return;

    setIsParsing(true);

    setTimeout(() => {
      try {
        const parsed = parseEmailText(emailText);
        const validation = validateParsedEmail(parsed);

        setValidationResult(validation);
        setIsExtracted(true);

        // Extract form data and notify parent
        const formData: ExtractedFormData = {
          date: parsed.date || '',
          merchant: parsed.vendor || '',
          amount: parsed.total ? parsed.total.toString() : '',
          currency: parsed.currency || 'USD',
        };

        onDataExtracted(formData, parsed);
      } catch (error) {
        console.error('Email parsing failed:', error);
        setValidationResult({
          isValid: false,
          confidence: 0,
          missingFields: ['parsing failed'],
        });
      } finally {
        setIsParsing(false);
      }
    }, 300);
  }, [emailText, onDataExtracted]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header - Collapsible Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-cyan-500" />
          <span className="font-medium text-slate-900">
            Paste Email Text
          </span>
          {isExtracted && (
            <Check className="w-4 h-4 text-green-500" />
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <p className="text-sm text-slate-600">
            Paste your order confirmation email to automatically extract date, vendor, amount, and currency.
          </p>

          {/* Text Input Area */}
          <textarea
            value={emailText}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Paste your email text here...&#10;&#10;Example:&#10;Order Confirmation&#10;Amazon.com&#10;Order Date: January 15, 2024&#10;Order Total: $49.99"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-y text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-mono"
          />

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!emailText.trim() || isParsing}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isParsing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </button>

          {/* Status Message */}
          {isExtracted && validationResult && (
            <div className={`p-3 rounded-lg text-sm ${
              validationResult.isValid
                ? 'bg-green-50 border border-green-200'
                : 'bg-yellow-50 border border-yellow-200'
            }`}>
              {validationResult.isValid ? (
                <div className="flex items-center gap-2 text-green-700">
                  <Check className="w-4 h-4" />
                  Data extracted! Review and edit in the form below.
                </div>
              ) : (
                <div className="text-yellow-700">
                  Could not find some data: {validationResult.missingFields.join(', ')}. Please fill in manually.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
