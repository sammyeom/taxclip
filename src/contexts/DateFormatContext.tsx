'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserSettings } from '@/lib/supabase';

type DateFormatType = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

interface DateFormatContextType {
  dateFormat: DateFormatType;
  setDateFormat: (format: DateFormatType) => void;
  formatDate: (dateString: string | Date | null, options?: FormatOptions) => string;
  formatDateTime: (dateString: string | Date | null) => string;
}

interface FormatOptions {
  showWeekday?: boolean;
  showYear?: boolean;
  shortMonth?: boolean;
}

const DateFormatContext = createContext<DateFormatContextType | undefined>(undefined);

export function DateFormatProvider({ children }: { children: ReactNode }) {
  const [dateFormat, setDateFormat] = useState<DateFormatType>('MM/DD/YYYY');

  useEffect(() => {
    loadDateFormat();
  }, []);

  const loadDateFormat = async () => {
    try {
      const { data } = await getUserSettings();
      if (data?.date_format) {
        setDateFormat(data.date_format as DateFormatType);
      }
    } catch (error) {
      console.error('Error loading date format:', error);
    }
  };

  const formatDate = (dateString: string | Date | null, options?: FormatOptions): string => {
    if (!dateString) return '-';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    // Short month names
    const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    let formatted = '';

    // Handle weekday prefix
    if (options?.showWeekday) {
      formatted += weekdays[date.getDay()] + ', ';
    }

    // Format based on user preference
    if (options?.shortMonth) {
      // Use short month format like "Jan 15, 2025"
      const monthName = shortMonths[date.getMonth()];
      if (options?.showYear !== false) {
        formatted += `${monthName} ${parseInt(day)}, ${year}`;
      } else {
        formatted += `${monthName} ${parseInt(day)}`;
      }
    } else {
      // Use numeric format based on preference
      switch (dateFormat) {
        case 'DD/MM/YYYY':
          formatted += options?.showYear !== false ? `${day}/${month}/${year}` : `${day}/${month}`;
          break;
        case 'YYYY-MM-DD':
          formatted += options?.showYear !== false ? `${year}-${month}-${day}` : `${month}-${day}`;
          break;
        case 'MM/DD/YYYY':
        default:
          formatted += options?.showYear !== false ? `${month}/${day}/${year}` : `${month}/${day}`;
          break;
      }
    }

    return formatted;
  };

  const formatDateTime = (dateString: string | Date | null): string => {
    if (!dateString) return '-';

    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) return '-';

    const datePart = formatDate(date, { shortMonth: true });
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    return `${datePart} ${hour12}:${minutes} ${ampm}`;
  };

  return (
    <DateFormatContext.Provider value={{ dateFormat, setDateFormat, formatDate, formatDateTime }}>
      {children}
    </DateFormatContext.Provider>
  );
}

export function useDateFormat() {
  const context = useContext(DateFormatContext);
  if (context === undefined) {
    throw new Error('useDateFormat must be used within a DateFormatProvider');
  }
  return context;
}
