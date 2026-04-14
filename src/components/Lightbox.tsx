import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LightboxProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const Lightbox: React.FC<LightboxProps> = ({ images, initialIndex, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex]);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center"
        onClick={onClose}
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white z-10 bg-gradient-to-b from-black/50 to-transparent">
          <div className="text-sm font-medium">
            {currentIndex + 1} / {images.length}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Image */}
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-12" onClick={(e) => e.stopPropagation()}>
          <motion.img
            key={currentIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            src={images[currentIndex]}
            alt={`Image ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain shadow-2xl"
            referrerPolicy="no-referrer"
          />

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 md:left-8 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 md:right-8 p-3 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 overflow-x-auto py-2" onClick={(e) => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`relative flex-shrink-0 w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                i === currentIndex ? 'border-blue-500 scale-110' : 'border-transparent opacity-50 hover:opacity-100'
              }`}
            >
              <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
