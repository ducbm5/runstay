/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Hotel, TSV_URL } from './data/hotels';
import { HotelHighlightBox, HotelListing, HotelDetail } from './components/HotelComponents';
import { Loader2 } from 'lucide-react';

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
      // Check cache
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TIME) {
          setHotels(data);
          if (data.length > 0) {
            setActiveLocationId(data[0].location_id || 'other');
          }
          setLoading(false);
          return;
        }
      }

      const response = await fetch(TSV_URL);
      if (!response.ok) throw new Error('Không thể tải dữ liệu từ Google Sheets');
      
      const text = await response.text();
      const rows = text.split('\n').filter(row => row.trim() !== '');
      
      // Skip header row
      const dataRows = rows.slice(1);
      
      const parsedHotels: Hotel[] = dataRows.map((row) => {
        const cols = row.split('\t');
        return {
          id: cols[0] || Math.random().toString(36).substr(2, 9),
          hotel_id: cols[0] || '',
          url: cols[1] || '',
          name: cols[2] || '',
          gallery_html: cols[3] || '',
          description_html: cols[4] || '',
          map_url: cols[5] || '',
          location: cols[6] || '',
          location_id: cols[7] || '',
          update_time: cols[8] || ''
        };
      });

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
      console.error('Fetch error:', err);
      setError('Đã có lỗi xảy ra khi tải dữ liệu. Vui lòng thử lại sau.');
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-gray-600 font-medium">Đang tải dữ liệu khách sạn...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md">
          <p className="text-red-500 font-bold text-lg mb-2">Lỗi!</p>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => { setLoading(true); fetchHotels(); }}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'detail' && selectedHotel) {
    return <HotelDetail hotel={selectedHotel} onBack={handleBackToHome} />;
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Location Menu */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm">
        <div className="max-w-[800px] mx-auto px-4">
          <div className="flex items-center gap-8 overflow-x-auto no-scrollbar py-4">
            {locations.map(loc => (
              <button
                key={loc.id}
                onClick={() => handleLocationChange(loc.id)}
                className={`whitespace-nowrap pb-2 text-sm font-extrabold transition-all border-b-2 uppercase tracking-tight ${
                  activeLocationId === loc.id 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Highlight Section */}
      <div className="bg-white border-b border-gray-100">
        <HotelHighlightBox hotels={filteredHotels} onSelect={handleSelectHotel} />
      </div>

      {/* Main Feed Section */}
      <div className="py-4">
        <div className="max-w-[800px] mx-auto px-4 mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">
            {locations.find(l => l.id === activeLocationId)?.name || 'Khách sạn'}
          </h2>
          <button 
            onClick={() => { localStorage.removeItem(CACHE_KEY); setLoading(true); fetchHotels(); }}
            className="text-xs text-blue-600 hover:underline"
          >
            Làm mới dữ liệu
          </button>
        </div>
        
        <div className="max-w-[800px] mx-auto px-4">
          <HotelListing hotels={displayedHotels} onSelect={handleSelectHotel} />
          
          {filteredHotels.length > visibleCount && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setVisibleCount(prev => prev + 10)}
                className="bg-white border border-gray-200 text-blue-600 font-bold py-3 px-10 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
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
