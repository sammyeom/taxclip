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
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 transition-all duration-500 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      {/* Tooltip / Speech bubble */}
      <div className="hidden sm:block animate-bounce">
        <div className="relative bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg shadow-lg">
          Join 50+ smart founders
          {/* Arrow pointing right */}
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-slate-900" />
        </div>
      </div>

      {/* Floating CTA Button */}
      <Button
        onClick={handleClick}
        className="rounded-full bg-primary hover:bg-primary/90 text-white shadow-xl hover:shadow-2xl transition-all duration-300 h-12 px-5 sm:h-14 sm:px-6 text-sm sm:text-base font-semibold"
      >
        <Camera className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
        Start Scanning Free
      </Button>
    </div>
  );
}
