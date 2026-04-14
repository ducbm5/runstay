import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, Navigation, Star, Send, User, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
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
              whileHover={{ y: -4, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
              className="bg-white rounded-xl overflow-hidden border border-gray-100 cursor-pointer transition-all"
              onClick={() => onSelect(hotel)}
            >
              <div className="aspect-video overflow-hidden">
                <img
                  src={images[0] || 'https://picsum.photos/seed/placeholder/800/450'}
                  alt={hotel.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="p-4">
                <div className="flex items-center gap-1 text-blue-600 text-[10px] font-bold uppercase tracking-wider mb-1">
                  <MapPin className="w-2.5 h-2.5" />
                  {hotel.location}
                </div>
                <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">{hotel.name}</h3>
                <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed mt-2">
                  {hotel.description_html.replace(/<[^>]*>/g, '').trim()}
                </p>
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
    <div className="bg-gray-50 min-h-screen py-8 px-4">
      <div className="max-w-[800px] mx-auto space-y-6">
        {hotels.map((hotel) => {
          const images = extractImages(hotel.gallery_html);
          return (
            <div
              key={hotel.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-xl text-gray-900 cursor-pointer hover:underline" onClick={() => onSelect(hotel)}>
                    {hotel.name}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    {hotel.location && (
                      <div className="flex items-center gap-1 text-gray-500 text-xs">
                        <MapPin className="w-3 h-3" />
                        <span>{hotel.location}</span>
                      </div>
                    )}
                    {hotel.map_url && (
                      <a 
                        href={hotel.map_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 text-xs font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Xem bản đồ</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Gallery */}
              <div className="px-4">
                <FacebookImageGrid 
                  images={images} 
                  onImageClick={(index) => setLightboxData({ images, index })}
                />
              </div>

              {/* Content */}
              <div className="p-4">
                <div 
                  className="prose prose-sm max-w-none text-gray-800 hotel-description"
                  dangerouslySetInnerHTML={{ __html: hotel.description_html }}
                />
              </div>

              {/* Footer / Action */}
              <div className="px-4 pb-4 border-t border-gray-50 pt-3 flex justify-end">
                <button 
                  onClick={() => onSelect(hotel)}
                  className="text-blue-600 font-semibold text-sm flex items-center gap-1 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                  Xem chi tiết <ChevronRight className="w-4 h-4" />
                </button>
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
const HotelReviews: React.FC<{ hotelId: string }> = ({ hotelId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [userName, setUserName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const fetchReviews = async () => {
    try {
      const response = await fetch(`${REVIEWS_DATA_URL}&t=${Date.now()}`);
      if (!response.ok) throw new Error('Không thể tải bình luận');
      
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      // Header: id, hotelId, userName, rating, comment, status
      const parsedReviews: Review[] = rows.slice(1).map((row) => {
        const cols = row.split('\t');
        return {
          id: cols[0] || '',
          hotelId: cols[1] || '',
          userName: cols[2] || '',
          rating: Number(cols[3]) || 5,
          comment: cols[4] || '',
          status: (cols[5]?.trim().toLowerCase() === 'active' ? 'active' : 'inactive') as 'active' | 'inactive'
        };
      }).filter(r => r.hotelId === hotelId && r.status === 'active');

      setReviews(parsedReviews);
    } catch (err) {
      console.error('Lỗi tải bình luận:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [hotelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userName.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      // AI Moderation
      const moderation = await moderateComment(newComment);
      
      const reviewData = {
        id: Date.now().toString(),
        hotelId: hotelId,
        userName: userName.trim(),
        rating: newRating,
        comment: newComment.trim(),
        status: moderation.isValid ? 'active' : 'inactive',
        timestamp: Date.now()
      };

      // Gửi lên Google Sheets
      if (REVIEWS_SCRIPT_URL) {
        await fetch(REVIEWS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reviewData)
        });
      }

      if (moderation.isValid) {
        setMessage({ type: 'success', text: 'Cảm ơn bạn đã đánh giá! Bình luận của bạn đã được gửi và đang được cập nhật.' });
        setNewComment('');
        setNewRating(5);
        setTimeout(fetchReviews, 3000);
      } else {
        setMessage({ type: 'error', text: 'Bình luận của bạn đang chờ kiểm duyệt do chứa nội dung không phù hợp.' });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'Đã có lỗi xảy ra. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : 'Chưa có';

  return (
    <div className="mt-12 border-t border-gray-100 pt-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">Đánh giá & Bình luận</h3>
          <p className="text-gray-500 text-sm">Chia sẻ trải nghiệm của bạn về khách sạn này</p>
        </div>
        <div className="bg-blue-50 px-6 py-3 rounded-2xl flex items-center gap-3 self-start">
          <div className="text-3xl font-black text-blue-600">{averageRating}</div>
          <div>
            <div className="flex text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`w-4 h-4 ${s <= Number(averageRating) ? 'fill-current' : ''}`} />
              ))}
            </div>
            <div className="text-xs text-blue-600 font-medium">{reviews.length} đánh giá</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-2xl mb-10 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Tên của bạn</label>
            <input 
              type="text" 
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập tên..."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Đánh giá của bạn</label>
            <div className="flex items-center gap-2 h-10">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setNewRating(s)}
                  className={`transition-all ${s <= newRating ? 'text-amber-400' : 'text-gray-300'}`}
                >
                  <Star className={`w-6 h-6 ${s <= newRating ? 'fill-current' : ''}`} />
                </button>
              ))}
              <span className="ml-2 text-sm font-bold text-gray-600">{newRating}/5</span>
            </div>
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-bold text-gray-700 mb-1">Bình luận</label>
          <textarea 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Viết cảm nhận của bạn về khách sạn, dịch vụ..."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all min-h-[100px] resize-none"
            required
          />
        </div>

        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
                message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
              }`}
            >
              {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold py-3 px-8 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Đang phân tích...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" /> Gửi đánh giá
            </>
          )}
        </button>
      </form>

      {/* List */}
      <div className="space-y-6">
        {loadingReviews ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400">Chưa có bình luận nào. Hãy là người đầu tiên!</p>
          </div>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="flex gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-bold text-gray-900">{review.userName}</h4>
                  {review.timestamp && (
                    <span className="text-xs text-gray-400">{new Date(review.timestamp).toLocaleDateString('vi-VN')}</span>
                  )}
                </div>
                <div className="flex text-amber-400 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-current' : ''}`} />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
              </div>
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
  const images = extractImages(hotel.gallery_html);

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={onBack}
          className="mb-6 text-gray-500 hover:text-gray-900 flex items-center gap-2 font-medium"
        >
          <ChevronRight className="w-5 h-5 rotate-180" /> Quay lại
        </button>

        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-2 leading-tight">
          {hotel.name}
        </h1>

        <div className="flex flex-wrap gap-3 mb-6">
          {hotel.location && (
            <div className="inline-flex items-center gap-2 text-gray-600 font-medium bg-gray-100 px-4 py-2 rounded-xl">
              <MapPin className="w-5 h-5 text-gray-400" />
              {hotel.location}
            </div>
          )}
          
          {hotel.map_url && (
            <a 
              href={hotel.map_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium bg-blue-50 px-4 py-2 rounded-xl transition-colors"
            >
              <Navigation className="w-5 h-5" />
              Xem vị trí trên Google Maps
            </a>
          )}
        </div>

        <div className="mb-8">
          <FacebookImageGrid 
            images={images} 
            onImageClick={(index) => setLightboxData({ images, index })}
          />
        </div>

        <div 
          className="prose prose-lg max-w-none text-gray-800 mb-10 hotel-description-full"
          dangerouslySetInnerHTML={{ __html: hotel.description_html }}
        />

        {/* Review System */}
        <HotelReviews hotelId={hotel.id} />
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
