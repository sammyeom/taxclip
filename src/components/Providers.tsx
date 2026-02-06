'use client';

import { DateFormatProvider } from '@/contexts/DateFormatContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <DateFormatProvider>
        {children}
      </DateFormatProvider>
    </ThemeProvider>
  );
}
