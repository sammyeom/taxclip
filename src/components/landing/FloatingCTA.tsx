'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FloatingCTA() {
  const [isVisible, setIsVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsVisible(scrollY > 600);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleClick = () => {
    router.push('/sign-up');
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2 transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {/* Tooltip / Speech bubble - positioned above button */}
      <div className="hidden sm:block animate-bounce">
        <div className="relative bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg">
          Join 50+ smart founders
          {/* Arrow pointing down */}
          <div className="absolute left-1/2 -bottom-2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-slate-900" />
        </div>
      </div>

      {/* Floating CTA Button */}
      <Button
        onClick={handleClick}
        className="rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-xl hover:shadow-2xl transition-all duration-300 h-12 px-5 sm:h-14 sm:px-6 text-sm sm:text-base font-semibold"
      >
        <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        Start Scanning Free
      </Button>
    </div>
  );
}
