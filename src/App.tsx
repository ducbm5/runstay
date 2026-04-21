/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Hotel, TSV_URL } from './data/hotels';
import { HotelHighlightBox, HotelListing, HotelDetail } from './components/HotelComponents';
import { Loader2, AlertCircle } from 'lucide-react';

type View = 'home' | 'detail';

const CACHE_KEY = 'hotel_data_cache';
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLocationId, setActiveLocationId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);

  const fetchHotels = async () => {
    try {
      console.log('Fetching hotels from:', TSV_URL);
      // Check cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
          console.log('Using cached hotel data');
          setHotels(data);
          if (data.length > 0) {
            setActiveLocationId(data[0].location_id || 'other');
          }
          setLoading(false);
          return;
        }
      }

      const response = await fetch(TSV_URL);
      if (!response.ok) throw new Error(`Không thể tải dữ liệu từ Google Sheets (Status: ${response.status})`);
      
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      console.log(`Parsed ${rows.length} rows from TSV`);
      
      if (rows.length <= 1) {
        throw new Error('Dữ liệu Google Sheets trống hoặc không đúng định dạng');
      }

      // Skip header row
      const dataRows = rows.slice(1);
      
      const parsedHotels: Hotel[] = dataRows.map((row, index) => {
        const cols = row.split('\t');
        if (cols.length < 9) {
          console.warn(`Row ${index + 2} has insufficient columns:`, cols.length);
        }
        // Ensure unique ID by combining hotel_id with index
        const baseId = cols[0] || Math.random().toString(36).substr(2, 9);
        return {
          id: `${baseId}-${index}`,
          hotel_id: cols[0] || '',
          url: cols[1] || '',
          name: cols[2] || '',
          location: cols[3] || '',
          address: cols[4] || '',
          price: cols[5] || '',
          rating: cols[6] || '',
          stars: cols[7] || '',
          reviews_count: cols[8] || '',
          contact_name: cols[9] || '',
          contact_phone: cols[10] || '',
          gallery_html: cols[11] || '',
          description_html: cols[12] || '',
          map_url: cols[13] || '',
          location_id: cols[14] || '',
          update_time: cols[15] || ''
        };
      });

      console.log('Successfully parsed hotels:', parsedHotels.length);
      setHotels(parsedHotels);
      
      // Set initial active location if not set
      if (parsedHotels.length > 0) {
        const firstLocId = parsedHotels[0].location_id || 'other';
        setActiveLocationId(firstLocId);
      }

      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data: parsedHotels,
        timestamp: Date.now()
      }));
      setLoading(false);
    } catch (err) {
      console.error('Fetch error details:', err);
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  // Sort hotels by newest first
  const sortedHotels = useMemo(() => {
    return [...hotels].sort((a, b) => {
      // Handle custom date format "HH:mm:ss DD/MM/YYYY" or standard ISO
      const parseDate = (dateStr: string) => {
        if (!dateStr) return 0;
        const parts = dateStr.match(/(\d{2}):(\d{2}):(\d{2}) (\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (parts) {
          return new Date(Number(parts[6]), Number(parts[5]) - 1, Number(parts[4]), Number(parts[1]), Number(parts[2]), Number(parts[3])).getTime();
        }
        return new Date(dateStr).getTime();
      };
      return parseDate(b.update_time) - parseDate(a.update_time);
    });
  }, [hotels]);

  const handleSelectHotel = (hotel: Hotel) => {
    setSelectedHotel(hotel);
    setCurrentView('detail');
    window.scrollTo(0, 0);
  };

  const handleBackToHome = () => {
    setCurrentView('home');
    setSelectedHotel(null);
    window.scrollTo(0, 0);
  };

  const handleLocationChange = (id: string) => {
    setActiveLocationId(id);
    setVisibleCount(10);
    window.scrollTo(0, 0);
  };

  // Helper to parse date for sorting
  const parseDate = (dateStr: string) => {
    if (!dateStr) return 0;
    const parts = dateStr.match(/(\d{2}):(\d{2}):(\d{2}) (\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (parts) {
      return new Date(Number(parts[6]), Number(parts[5]) - 1, Number(parts[4]), Number(parts[1]), Number(parts[2]), Number(parts[3])).getTime();
    }
    return new Date(dateStr).getTime();
  };

  // Unique locations for the menu, sorted by the latest update_time in each location
  const locations = useMemo(() => {
    const locMap = new Map<string, { name: string; latestUpdate: number }>();
    
    hotels.forEach(h => {
      if (h.location_id && h.location) {
        const currentUpdate = parseDate(h.update_time);
        const existing = locMap.get(h.location_id);
        if (!existing || currentUpdate > existing.latestUpdate) {
          locMap.set(h.location_id, { name: h.location, latestUpdate: currentUpdate });
        }
      }
    });

    return Array.from(locMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.latestUpdate - a.latestUpdate);
  }, [hotels]);

  // Filtered hotels for the active location
  const filteredHotels = useMemo(() => {
    return sortedHotels.filter(h => (h.location_id || 'other') === activeLocationId);
  }, [sortedHotels, activeLocationId]);

  const displayedHotels = useMemo(() => {
    return filteredHotels.slice(0, visibleCount);
  }, [filteredHotels, visibleCount]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 text-[#9F224E] animate-spin mb-4" />
        <p className="text-[#888] font-bold uppercase tracking-widest text-[10px] font-sans">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <div className="bg-white p-10 rounded-sm border border-gray-100 max-w-sm">
          <AlertCircle className="w-12 h-12 text-[#9F224E] mx-auto mb-4 opacity-20" />
          <p className="text-gray-900 font-serif font-black text-xl mb-4">Lỗi hệ thống</p>
          <p className="text-[#666] text-sm mb-8 leading-relaxed font-serif">{error}</p>
          <button 
            onClick={() => { setLoading(true); fetchHotels(); }}
            className="w-full bg-[#9F224E] text-white px-6 py-4 rounded-none font-bold text-xs uppercase tracking-widest hover:bg-black transition-all"
          >
            Thử lại ngay
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'detail' && selectedHotel) {
    return <HotelDetail hotel={selectedHotel} onBack={handleBackToHome} />;
  }

  return (
    <div className="bg-white min-h-screen font-serif">
      {/* Location Menu */}
      <div className="bg-white border-b-2 border-[#e5e5e5] sticky top-0 z-30">
        <div className="max-w-[800px] mx-auto px-4">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-4">
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => handleLocationChange(loc.id)}
                className={`whitespace-nowrap pb-1 text-xs font-bold transition-all border-b-2 uppercase tracking-wider font-sans ${
                  activeLocationId === loc.id 
                    ? 'text-[#9F224E] border-[#9F224E]' 
                    : 'text-[#757575] border-transparent hover:text-black'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlight Section */}
      <div className="bg-white border-b border-gray-100 mb-8 pt-4">
        <HotelHighlightBox hotels={filteredHotels} onSelect={handleSelectHotel} />
      </div>

      {/* Main Feed Section */}
      <div className="pb-20">
        <div className="max-w-[800px] mx-auto px-4 mb-8 flex justify-between items-end border-b border-[#e5e5e5] pb-2">
          <div>
            <h2 className="text-xl font-bold text-[#9F224E] font-sans uppercase tracking-widest">
              {locations.find(l => l.id === activeLocationId)?.name || 'Khách sạn'}
            </h2>
          </div>
          <button 
            onClick={() => { localStorage.removeItem(CACHE_KEY); setLoading(true); fetchHotels(); }}
            className="text-[10px] font-bold uppercase tracking-widest text-[#757575] hover:text-[#9F224E] transition-colors font-sans"
          >
            Làm mới
          </button>
        </div>
        
        <div className="max-w-[800px] mx-auto px-4">
          <HotelListing hotels={displayedHotels} onSelect={handleSelectHotel} />
          
          {filteredHotels.length > visibleCount && (
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="bg-white border border-[#e5e5e5] text-[#222] font-bold text-xs uppercase tracking-widest py-4 px-12 rounded-none hover:bg-gray-50 transition-all font-sans active:scale-95"
              >
                Xem thêm tin
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
