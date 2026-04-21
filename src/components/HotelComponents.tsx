import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronRight, MapPin, Navigation, Star, Send, User, AlertCircle, CheckCircle, Loader2, Phone, Tag } from 'lucide-react';
import { Hotel, REVIEWS_SCRIPT_URL, REVIEWS_DATA_URL } from '../data/hotels';
import { FacebookImageGrid } from './FacebookImageGrid';
import { Lightbox } from './Lightbox';
import { motion, AnimatePresence } from 'motion/react';
import { moderateComment } from '../services/geminiService';

interface Review {
  id: string;
  hotelId: string;
  userName: string;
  rating: number;
  comment: string;
  status: 'active' | 'inactive';
  timestamp?: number;
}

// Helper to extract image URLs from gallery_html
const extractImages = (html: string): string[] => {
  // Try to find URLs in the string (could be space separated, newline separated, or inside <img> tags)
  // Exclude trailing commas and other common delimiters
  const urlRegex = /(https?:\/\/[^\s"'<>,]+)/g;
  const matches = html.match(urlRegex);
  return matches || [];
};

// Helper to truncate HTML string to text snippet ending at a sentence
const getSnippet = (html: string, maxChars: number = 240): string => {
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxChars) return text;
  
  // Find a good place to cut: end of a sentence (., !, ?) within the range
  const slice = text.slice(0, maxChars + 40);
  const sentenceEnd = /[.!?](\s|$)/;
  
  let cutIndex = -1;
  let searchIndex = maxChars - 40;
  
  // Look for the last sentence end before maxChars, but not too early
  const matches = [...slice.matchAll(/[.!?](\s|$)/g)];
  for (const match of matches) {
    if (match.index! >= searchIndex && match.index! <= maxChars + 20) {
      cutIndex = match.index! + 1;
    }
  }
  
  if (cutIndex !== -1) {
    return text.slice(0, cutIndex).trim();
  }
  
  // Fallback to word boundary
  const fallbackSlice = text.slice(0, maxChars);
  const lastSpace = fallbackSlice.lastIndexOf(' ');
  return text.slice(0, lastSpace !== -1 ? lastSpace : maxChars).trim() + '...';
};

// Helper to reformat description (Nearby sections)
const formatDescription = (html: string) => {
  if (!html) return '';
  
  const sections = [
    { key: "Thiên nhiên và Thể thao" },
    { key: "Văn hóa và Giải trí" },
    { key: "Ăn uống" }
  ];

  let processedHtml = html;

  sections.forEach(section => {
    // Matches patterns like "Section: item1, item2."
    const regex = new RegExp(`(?:^|<br\\s*\\/?>|\\n|\\.\\s*|<li>)(${section.key}):?\\s*([^.<]*)`, 'gi');
    
    processedHtml = processedHtml.replace(regex, (match, title, itemsStr) => {
      const items = itemsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
      if (items.length === 0) return match;
      
      return `
        <div class="nearby-row">
          <div class="nearby-label">${title}</div>
          <div class="nearby-items">${items.join(', ')}</div>
        </div>
      `;
    });
  });

  return processedHtml;
};

// 1. BOX HOTEL TRÊN TRANG GIẢI (Highlight Box)
export const HotelHighlightBox: React.FC<{ hotels: Hotel[]; onSelect: (hotel: Hotel) => void }> = ({ hotels, onSelect }) => {
  return (
    <section className="py-8 px-4 max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">Khách sạn gợi ý cho runner</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {hotels.slice(0, 3).map((hotel) => {
          const images = extractImages(hotel.gallery_html);
          return (
            <motion.div
              key={hotel.id}
              whileHover={{ y: -2 }}
              className="bg-white overflow-hidden border-b border-gray-100 cursor-pointer transition-all duration-300 group pb-6"
              onClick={() => onSelect(hotel)}
            >
              <div className="aspect-video overflow-hidden rounded-sm">
                <img
                  src={images[0] || 'https://picsum.photos/seed/placeholder/800/450'}
                  alt={hotel.name}
                  className="w-full h-full object-cover transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
                <div className="pt-3">
                  {hotel.location && (
                    <div className="text-[#9F224E] text-[11px] font-bold uppercase tracking-wider mb-1 font-sans">
                      {hotel.location}
                    </div>
                  )}
                  <h3 className="font-serif font-bold text-xl text-[#222] mb-2 leading-tight group-hover:text-[#9F224E] transition-colors">{hotel.name}</h3>
                  
                  <div className="flex items-center gap-3 mb-3">
                    {hotel.stars && parseInt(hotel.stars) > 0 && (
                      <div className="flex text-amber-500 scale-90 -ml-1">
                        {Array.from({ length: parseInt(hotel.stars) }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-current" />
                        ))}
                      </div>
                    )}
                    {hotel.rating && (
                      <div className="text-[#757575] text-[11px] font-bold font-sans">
                        Điểm: {hotel.rating}/10
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    {hotel.price && (
                      <span className="text-[#9F224E] font-bold text-sm font-sans">{hotel.price} / đêm</span>
                    )}
                  </div>
                </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

// 2. TRANG FOLDER HOTEL (Listing)
export const HotelListing: React.FC<{ hotels: Hotel[]; onSelect: (hotel: Hotel) => void }> = ({ hotels, onSelect }) => {
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number } | null>(null);

  return (
    <div className="bg-white min-h-screen py-10 md:px-0 px-4">
      <div className="w-full max-w-[800px] mx-auto space-y-12">
        {hotels.map((hotel) => {
          const images = extractImages(hotel.gallery_html);
          return (
            <div
              key={hotel.id}
              className="bg-white overflow-hidden group pb-8 border-b border-gray-100"
            >
              <div className="p-0">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                      <h3 
                        className="font-serif font-bold text-2xl md:text-3xl text-[#222] cursor-pointer hover:text-[#9F224E] transition-colors leading-tight" 
                        onClick={() => onSelect(hotel)}
                      >
                        {hotel.name}
                      </h3>
                      {hotel.stars && parseInt(hotel.stars) > 0 && (
                        <div className="flex flex-shrink-0 text-amber-500">
                          {Array.from({ length: parseInt(hotel.stars) }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {hotel.location && (
                        <div className="text-[#9F224E] text-xs font-bold uppercase font-sans">
                          {hotel.location}
                        </div>
                      )}
                      {hotel.address && (
                        <div className="text-[#757575] text-xs font-sans">
                          {hotel.address.replace(/^Địa chỉ:?\s*/i, '')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {hotel.rating && (
                      <div className="flex items-center gap-2 text-[#9F224E] font-bold text-sm font-sans whitespace-nowrap">
                        {hotel.rating}/10
                      </div>
                    )}
                    {hotel.price && (
                      <div className="text-[#9F224E] font-bold text-sm font-sans whitespace-nowrap">
                        {hotel.price} / đêm
                      </div>
                    )}
                  </div>
                </div>

                {/* Gallery */}
                <div className="mb-4">
                  <FacebookImageGrid 
                    images={images} 
                    onImageClick={(index) => setLightboxData({ images, index })}
                  />
                </div>

                {/* Description Snippet */}
                {hotel.description_html && (
                  <div className="mb-5">
                    <div 
                      className="hotel-description font-serif"
                      dangerouslySetInnerHTML={{ __html: hotel.description_html }}
                    />
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-6">
                    {hotel.map_url && (
                      <a 
                        href={hotel.map_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#757575] hover:text-[#9F224E] text-xs font-bold font-sans flex items-center gap-1.5 transition-colors uppercase tracking-wider"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        Bản đồ
                      </a>
                    )}
                    <div className="flex items-center gap-1.5 text-[#757575] text-xs font-bold font-sans uppercase tracking-wider">
                      <Phone className="w-3.5 h-3.5" />
                      <a href={`tel:${hotel.contact_phone}`} className="hover:text-[#9F224E]">{hotel.contact_phone}</a>
                    </div>
                  </div>

                  <button 
                    onClick={() => onSelect(hotel)}
                    className="text-[#9F224E] text-xs font-bold font-sans uppercase tracking-wider hover:underline flex items-center gap-1"
                  >
                    Xem Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {lightboxData && (
        <Lightbox 
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};

// 3. HỆ THỐNG ĐÁNH GIÁ VÀ BÌNH LUẬN
const HotelReviews: React.FC<{ hotelId: string; initialRating?: string; initialReviewsCount?: string; onStatsUpdate?: (avg: string, count: number) => void }> = ({ hotelId, initialRating, initialReviewsCount, onStatsUpdate }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(10);
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [globalReviewCount, setGlobalReviewCount] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${REVIEWS_DATA_URL}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Không thể tải bình luận');
      
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      // Get all active reviews to count global daily limit
      const today = new Date().toLocaleDateString('vi-VN');
      let dailyCount = 0;

      const parsedReviews: Review[] = rows.slice(1).map((row, index) => {
        const cols = row.split('\t');
        const baseId = cols[0] || `rev-${index}`;
        const ratingVal = Number(cols[3]) || 10;
        const status = (cols[5]?.trim().toLowerCase() === 'active' ? 'active' : 'inactive') as 'active' | 'inactive';
        const rawTimestamp = cols[6] ? Number(cols[6]) : NaN;
        const timestamp = isNaN(rawTimestamp) ? null : rawTimestamp;
        
        // Check global daily limit (active reviews from today)
        if (status === 'active' && timestamp) {
          const reviewDate = new Date(timestamp).toLocaleDateString('vi-VN');
          if (reviewDate === today) dailyCount++;
        }

        return {
          id: `${baseId}-${index}`,
          hotelId: cols[1] || '',
          userName: cols[2] || '',
          rating: ratingVal,
          comment: cols[4] || '',
          status: status,
          timestamp: timestamp
        };
      }).filter(r => r.hotelId === hotelId && r.status === 'active');

      setGlobalReviewCount(dailyCount);
      setReviews(parsedReviews);
    } catch (err) {
      console.error('Lỗi tải bình luận:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    
    // Check if user has already reviewed this hotel
    const reviewedHotels = JSON.parse(localStorage.getItem('vne_reviewed_hotels') || '[]');
    if (reviewedHotels.includes(hotelId)) {
      setHasReviewed(true);
    }
  }, [hotelId]);

  // Calculate combined stats
  const stats = useMemo(() => {
    const sheetRating = parseFloat(initialRating || '0');
    const sheetCount = parseInt(initialReviewsCount || '0');
    
    const localCount = reviews.length;
    const localSum = reviews.reduce((acc, r) => acc + r.rating, 0);
    
    const totalCount = sheetCount + localCount;
    const totalAvg = totalCount > 0 
      ? ((sheetRating * sheetCount + localSum) / totalCount).toFixed(1)
      : (sheetRating || 0).toString();

    return { avg: totalAvg, count: totalCount };
  }, [reviews, initialRating, initialReviewsCount]);

  useEffect(() => {
    if (onStatsUpdate) {
      onStatsUpdate(stats.avg, stats.count);
    }
  }, [stats.avg, stats.count, onStatsUpdate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    // Check individual limit
    if (hasReviewed) {
      setMessage({ type: 'error', text: 'Bạn đã gửi đánh giá cho khách sạn này rồi. Mỗi người chỉ được đánh giá một lần.' });
      return;
    }

    // Check global daily limit
    if (globalReviewCount >= 1000) {
      setMessage({ type: 'error', text: 'Website đã đạt giới hạn 1000 lượt bình luận trong ngày hôm nay. Vui lòng quay lại vào ngày mai.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      // AI Moderation
      let isValid = true;
      // Trình AI kiểm soát cả tên và nội dung
      const moderation = await moderateComment(userName.trim(), newComment.trim() || "(Chỉ đánh giá điểm)");
      isValid = moderation.isValid;
      
      const reviewData = {
        id: Date.now().toString(),
        hotelId: hotelId,
        userName: userName.trim(),
        rating: newRating,
        comment: newComment.trim() || "(Chỉ đánh giá điểm)",
        status: isValid ? 'active' : 'inactive',
        timestamp: Date.now(),
        uid: localStorage.getItem('vne_reviewer_uid') || (() => {
          const newUid = 'uid-' + Math.random().toString(36).substr(2, 9);
          localStorage.setItem('vne_reviewer_uid', newUid);
          return newUid;
        })()
      };

      if (REVIEWS_SCRIPT_URL) {
        await fetch(REVIEWS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData)
        });
      }

      if (isValid) {
        // Record local submission
        const reviewedHotels = JSON.parse(localStorage.getItem('vne_reviewed_hotels') || '[]');
        reviewedHotels.push(hotelId);
        localStorage.setItem('vne_reviewed_hotels', JSON.stringify(reviewedHotels));
        setHasReviewed(true);

        setMessage({ type: 'success', text: 'Cảm ơn bạn đã gửi ý kiến! Đánh giá của bạn đã được ghi nhận.' });
        setNewComment('');
        setNewRating(10);
        setTimeout(fetchReviews, 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: 'Bình luận của bạn không được hiển thị do vi phạm tiêu chuẩn cộng đồng.' 
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-16 border-t border-[#e5e5e5] pt-12 font-serif">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6 border-b border-[#eee] pb-6">
        <div>
          <h3 className="text-2xl font-serif font-black text-[#000] mb-2 uppercase tracking-tight">Ý kiến bạn đọc</h3>
          <p className="text-[#666] text-sm font-sans italic">Hệ thống ghi nhận và hiển thị những bình luận phù hợp tiêu chuẩn cộng đồng</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
              <div className="text-3xl font-serif font-black text-[#9F224E] leading-none mb-1">{stats.avg}</div>
              <div className="text-[10px] uppercase font-bold text-[#757575] font-sans tracking-widest">{stats.count} đánh giá</div>
          </div>
          <div className="h-10 w-px bg-[#eee]"></div>
          <div className="flex text-amber-500 scale-90">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`w-5 h-5 ${s <= Math.round(parseFloat(stats.avg) / 2) ? 'fill-current' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      {hasReviewed ? (
        <div className="bg-[#fcfcfc] p-10 mb-12 border border-[#eee] text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h4 className="text-lg font-serif font-black text-[#000] mb-2 uppercase">Bạn đã đánh giá khách sạn này</h4>
          <p className="text-[#666] font-sans italic text-sm">Cảm ơn bạn đã chia sẻ trải nghiệm. Mỗi bài viết chỉ được phép gửi đánh giá một lần.</p>
        </div>
      ) : globalReviewCount >= 1000 ? (
        <div className="bg-[#fff1f0] p-10 mb-12 border border-[#ffa39e] text-center">
          <AlertCircle className="w-12 h-12 text-[#9F224E] mx-auto mb-4" />
          <h4 className="text-lg font-serif font-black text-[#000] mb-2 uppercase">Giới hạn bình luận trong ngày</h4>
          <p className="text-[#666] font-sans italic text-sm">Hệ thống đã đạt giới hạn 1000 lượt bình luận trong ngày. Vui lòng quay lại sau.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-[#f7f7f7] p-8 mb-12 border border-[#e5e5e5]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div>
              <label className="block text-xs font-bold text-[#757575] uppercase tracking-widest mb-3 font-sans">Danh tính của bạn</label>
              <input 
                type="text" 
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Họ tên hoặc Biệt danh..."
                className="w-full px-4 py-3 rounded-none border border-[#e5e5e5] focus:border-[#9F224E] outline-none transition-all font-serif"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-xs font-bold text-[#757575] uppercase tracking-widest font-sans">Đánh giá của bạn</label>
                <span className="text-xl font-serif font-black text-[#9F224E]">{newRating}/10</span>
              </div>
              <div className="flex flex-col gap-2 h-12 justify-center">
                <input 
                  type="range" 
                  min="1" 
                  max="10" 
                  step="1"
                  value={newRating}
                  onChange={(e) => setNewRating(parseInt(e.target.value))}
                  className="rating-slider"
                />
                <div className="flex justify-between px-1 text-[10px] font-bold text-[#999] font-sans">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <span key={n}>{n}</span>)}
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-xs font-bold text-[#757575] uppercase tracking-widest mb-3 font-sans">Nội dung bình luận</label>
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ý kiến của bạn về chất lượng dịch vụ, phòng ốc và trải nghiệm tại đây..."
              className="w-full px-4 py-4 rounded-none border border-[#e5e5e5] focus:border-[#9F224E] outline-none transition-all min-h-[120px] resize-none font-serif leading-relaxed"
            />
          </div>

          <AnimatePresence>
            {message && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className={`mb-6 p-4 text-sm font-sans flex items-center gap-3 ${
                  message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-[#9F224E] border border-red-100'
                }`}
              >
                {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
                {message.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit"
            disabled={isSubmitting}
            className="bg-[#9F224E] hover:bg-black disabled:bg-gray-400 text-white font-bold py-4 px-12 rounded-none transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] font-sans"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang gửi...
              </>
            ) : (
              <>
                Gửi bình luận <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      {/* List */}
      <div className="space-y-10 divide-y divide-[#eee]">
        {loadingReviews ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-[#9F224E] animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 bg-[#fafafa] border-y border-[#eee]">
            <p className="text-[#999] italic font-serif">Chưa có bình luận nào từ bạn đọc. Hãy là người đầu tiên gửi ý kiến.</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="pt-8 block">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-bold text-[#222] font-sans text-sm">{review.userName}</h4>
                  {review.timestamp && (
                    <span className="text-[10px] text-[#999] font-sans font-medium">{new Date(review.timestamp).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#9F224E]/5 text-[#9F224E] text-[10px] font-bold font-sans uppercase border border-[#9F224E]/10">
                  <Star className="w-3 h-3 fill-current" />
                  {review.rating}/10
                </div>
              </div>
              <p className="text-[#444] text-[17px] leading-relaxed font-serif">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 4. TRANG CHI TIẾT HOTEL
export const HotelDetail: React.FC<{ hotel: Hotel; onBack: () => void }> = ({ hotel, onBack }) => {
  const [lightboxData, setLightboxData] = useState<{ images: string[]; index: number } | null>(null);
  const [liveStats, setLiveStats] = useState({ avg: hotel.rating || '0', count: parseInt(hotel.reviews_count || '0') });
  const images = extractImages(hotel.gallery_html);
  const formattedDescription = useMemo(() => formatDescription(hotel.description_html), [hotel.description_html]);

  const handleStatsUpdate = useCallback((avg: string, count: number) => {
    setLiveStats(prev => {
      if (prev.avg === avg && prev.count === count) return prev;
      return { avg, count };
    });
  }, []);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <button 
          onClick={onBack}
          className="mb-6 text-[#9F224E] hover:underline flex items-center gap-1 font-bold font-sans text-xs uppercase tracking-widest"
        >
          <ChevronRight className="w-4 h-4 rotate-180" /> Quay lại
        </button>

        <div className="flex flex-col mb-8 border-b border-gray-100 pb-8">
          <h1 className="text-3xl md:text-5xl font-serif font-black text-[#000] leading-tight mb-4">
            {hotel.name}
          </h1>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            {hotel.stars && parseInt(hotel.stars) > 0 && (
              <div className="flex text-amber-500">
                {Array.from({ length: parseInt(hotel.stars) }).map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-current" />
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <span className="w-1 h-3 bg-[#9F224E] hidden md:block"></span>
              <div className="text-[#9F224E] text-xs font-bold uppercase font-sans tracking-widest">
                {hotel.location}
              </div>
            </div>

            {hotel.address && (
              <div className="flex items-center gap-2 text-[#757575] font-serif text-sm italic">
                <MapPin className="w-4 h-4 text-[#9F224E]/60" />
                {hotel.address.replace(/^Địa chỉ:?\s*/i, '')}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          <div className="bg-[#f7f7f7] border-l-4 border-[#9F224E] p-6">
            <p className="text-[11px] uppercase font-bold text-[#757575] font-sans tracking-widest mb-1">Điểm đánh giá tiêu chuẩn</p>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-serif font-black text-[#000]">{liveStats.avg}</p>
              <span className="text-sm font-sans text-[#757575]">/ 10 ({liveStats.count} người đánh giá)</span>
            </div>
          </div>
          
          {hotel.price && (
            <div className="bg-[#f7f7f7] border-l-4 border-green-700 p-6">
              <p className="text-[11px] uppercase font-bold text-[#757575] font-sans tracking-widest mb-1">Khoảng giá phòng</p>
              <p className="text-3xl font-serif font-black text-green-800">{hotel.price} <span className="text-sm font-normal">/ đêm</span></p>
            </div>
          )}
        </div>

        <div className="mb-8">
          <FacebookImageGrid 
            images={images} 
            onImageClick={(index) => setLightboxData({ images, index })}
          />
        </div>

        {formattedDescription && (
          <div 
            className="hotel-description-full mb-12"
            dangerouslySetInnerHTML={{ __html: formattedDescription }}
          />
        )}

        {/* Map Embed Section */}
        {hotel.map_url && (
          <div className="mb-12">
            <h3 className="text-xl font-serif font-black text-[#000] mb-4 uppercase tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#9F224E]" />
              Vị trí khách sạn
            </h3>
            <div className="w-full h-[300px] md:h-[400px] border border-[#e5e5e5]">
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(hotel.name + ' ' + (hotel.location || ''))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

        {/* Contact & Booking Section */}
        {(hotel.contact_phone || hotel.contact_name) && (
          <div className="bg-[#f7f7f7] border border-[#e5e5e5] p-8 mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-[#9F224E] flex items-center justify-center text-white">
                <Phone className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-[#000] font-sans font-black text-xs uppercase tracking-widest mb-1">Liên hệ đặt phòng</h4>
                {hotel.contact_name && (
                  <p className="text-[#9F224E] font-serif font-bold text-xl">{hotel.contact_name}</p>
                )}
              </div>
            </div>
            {hotel.contact_phone && (
              <a 
                href={`tel:${hotel.contact_phone}`}
                className="w-full md:w-auto bg-[#000] hover:bg-[#9F224E] text-white font-bold py-4 px-12 transition-all flex items-center justify-center gap-3 text-xs uppercase tracking-[0.2em] font-sans"
              >
                <Phone className="w-4 h-4 fill-current" />
                {hotel.contact_phone}
              </a>
            )}
          </div>
        )}

        {/* Review System (Fixed stats update) */}
        <HotelReviews 
          hotelId={hotel.id} 
          initialRating={hotel.rating} 
          initialReviewsCount={hotel.reviews_count}
          onStatsUpdate={handleStatsUpdate}
        />
      </div>

      {lightboxData && (
        <Lightbox 
          images={lightboxData.images}
          initialIndex={lightboxData.index}
          onClose={() => setLightboxData(null)}
        />
      )}
    </div>
  );
};
