import React from 'react';

interface FacebookImageGridProps {
  images: string[];
  onImageClick?: (index: number) => void;
}

export const FacebookImageGrid: React.FC<FacebookImageGridProps> = ({ 
  images, 
  onImageClick 
}) => {
  const count = images.length;

  if (count === 0) return null;

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onImageClick) onImageClick(index);
  };

  const renderImage = (src: string, index: number, className: string = "", extraOverlay: number = 0) => {
    return (
      <div 
        key={index}
        className={`relative overflow-hidden cursor-pointer group ${className}`}
        onClick={(e) => handleImageClick(e, index)}
      >
        <img
          src={src}
          alt={`Gallery ${index + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300 group-hover:opacity-80"
          referrerPolicy="no-referrer"
        />
        {extraOverlay > 0 && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
            <span className="text-white text-xl md:text-2xl font-bold">
              +{extraOverlay} ảnh
            </span>
          </div>
        )}
      </div>
    );
  };

  // MOBILE: 1 large + horizontal scroll or grid
  // DESKTOP: Hero (70%) + Side (30%, 2 rows) + Bottom Strip (up to 6 images)

  const hasBottom = count > 3;
  const bottomImages = images.slice(3, 9);
  const bottomGridCols = Math.min(bottomImages.length, 6);

  return (
    <div className="w-full flex flex-col gap-[4px]">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-10 gap-[4px] h-auto md:h-[400px] overflow-hidden">
        {/* Main Hero Image - 70% width (7/10) */}
        <div className="md:col-span-7 h-[250px] md:h-full relative overflow-hidden">
          {renderImage(images[0], 0, "h-full w-full")}
        </div>

        {/* Side Column - 30% width (3/10) */}
        {count > 1 && (
          <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-1 md:grid-rows-2 gap-[4px] h-[120px] md:h-full overflow-hidden">
            {renderImage(images[1], 1, "h-full w-full")}
            {count > 2 ? (
              renderImage(images[2], 2, "h-full w-full")
            ) : (
              <div className="hidden md:block bg-gray-50 h-full" />
            )}
          </div>
        )}
      </div>

      {/* Bottom Strip Segment */}
      {hasBottom && (
        <div 
          className="grid gap-[4px] w-full" 
          style={{ gridTemplateColumns: `repeat(${bottomGridCols}, minmax(0, 1fr))` }}
        >
          {bottomImages.map((src, i) => {
            const index = i + 3;
            const isLastVisible = i === bottomGridCols - 1;
            const extraCount = count - (3 + bottomGridCols);
            
            return renderImage(
              src, 
              index, 
              "aspect-square w-full", 
              isLastVisible && extraCount > 0 ? extraCount : 0
            );
          })}
        </div>
      )}
    </div>
  );
};
