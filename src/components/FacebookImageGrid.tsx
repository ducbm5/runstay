import React from 'react';

interface FacebookImageGridProps {
  images: string[];
  onImageClick?: (index: number) => void;
}

export const FacebookImageGrid: React.FC<FacebookImageGridProps> = ({ images, onImageClick }) => {
  const count = images.length;

  if (count === 0) return null;

  const handleImageClick = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    if (onImageClick) onImageClick(index);
  };

  if (count === 1) {
    return (
      <div className="w-full overflow-hidden rounded-lg cursor-pointer" onClick={(e) => handleImageClick(e, 0)}>
        <img
          src={images[0]}
          alt="Hotel"
          className="w-full h-auto object-cover hover:opacity-95 transition-opacity"
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
        {images.map((img, i) => (
          <div key={i} className="cursor-pointer" onClick={(e) => handleImageClick(e, i)}>
            <img
              src={img}
              alt={`Hotel ${i + 1}`}
              className="w-full aspect-square object-cover hover:opacity-95 transition-opacity"
              referrerPolicy="no-referrer"
            />
          </div>
        ))}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
        <div className="cursor-pointer" onClick={(e) => handleImageClick(e, 0)}>
          <img
            src={images[0]}
            alt="Hotel 1"
            className="w-full h-full object-cover row-span-2 hover:opacity-95 transition-opacity"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="grid grid-rows-2 gap-1">
          {images.slice(1).map((img, i) => (
            <div key={i} className="cursor-pointer" onClick={(e) => handleImageClick(e, i + 1)}>
              <img
                src={img}
                alt={`Hotel ${i + 2}`}
                className="w-full aspect-square object-cover hover:opacity-95 transition-opacity"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4 or more images
  return (
    <div className="grid grid-cols-2 gap-1 overflow-hidden rounded-lg">
      {images.slice(0, 4).map((img, i) => (
        <div key={i} className="relative cursor-pointer" onClick={(e) => handleImageClick(e, i)}>
          <img
            src={img}
            alt={`Hotel ${i + 1}`}
            className="w-full aspect-square object-cover hover:opacity-95 transition-opacity"
            referrerPolicy="no-referrer"
          />
          {i === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
              +{count - 4}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
