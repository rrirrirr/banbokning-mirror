'use client';

import { useState, useMemo, useEffect } from 'react';
import { DaySchedule, BookingSlot } from '@/lib/calendar';
import { CalendarIcon, Clock, MapPin, X, ChevronDown, RefreshCw, UserCircle2, Settings, ShoppingCart, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Props {
  initialData: DaySchedule[];
}

type Grade = 'A' | 'B' | 'C' | 'D' | 'E' | 'None';

interface TimeRule {
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  start: string;
  end: string;
  grade: Grade;
}

interface Persona {
  id: string;
  name: string;
  rules: TimeRule[];
}

const INITIAL_PERSONAS: Persona[] = [
  {
    id: 'none',
    name: 'Ingen förinställning',
    rules: []
  },
  {
    id: 'mans',
    name: 'Måns',
    rules: [
      { days: [1, 2, 3, 4, 5], start: '00:00', end: '23:59', grade: 'E' },
      { days: [1, 2, 3, 4, 5], start: '17:00', end: '18:00', grade: 'B' },
      { days: [1, 2, 3, 4, 5], start: '18:00', end: '19:00', grade: 'A' },
      { days: [1, 2, 3, 4, 5], start: '19:00', end: '20:00', grade: 'B' },
      { days: [1, 2, 3, 4, 5], start: '20:00', end: '21:00', grade: 'C' },
      { days: [1, 2, 3, 4, 5], start: '21:00', end: '22:00', grade: 'D' },
      { days: [6, 0], start: '00:00', end: '23:59', grade: 'E' },
      { days: [6, 0], start: '08:00', end: '10:00', grade: 'B' },
      { days: [6, 0], start: '10:00', end: '12:00', grade: 'A' },
      { days: [6, 0], start: '12:00', end: '14:00', grade: 'B' },
      { days: [6, 0], start: '14:00', end: '16:00', grade: 'C' },
      { days: [6, 0], start: '16:00', end: '19:00', grade: 'D' },
    ]
  },
  {
    id: 'carlos',
    name: 'Carlos',
    rules: [
      { days: [1, 2, 3, 4, 5], start: '00:00', end: '23:59', grade: 'E' },
      { days: [1, 2, 3, 4, 5], start: '17:00', end: '18:00', grade: 'C' },
      { days: [1, 2, 3, 4, 5], start: '18:00', end: '19:00', grade: 'B' },
      { days: [1, 2, 3, 4, 5], start: '19:00', end: '21:00', grade: 'A' },
      { days: [6, 0], start: '00:00', end: '23:59', grade: 'E' },
      { days: [6, 0], start: '08:00', end: '10:00', grade: 'E' },
      { days: [6, 0], start: '10:00', end: '16:00', grade: 'C' },
      { days: [6, 0], start: '16:00', end: '19:00', grade: 'A' },
      { days: [6, 0], start: '19:00', end: '20:00', grade: 'B' },
      { days: [6, 0], start: '20:00', end: '23:59', grade: 'D' },
    ]
  }
];

function getGrade(dayOfWeek: number, time: string, rules: TimeRule[]): Grade {
  if (!rules || rules.length === 0) return 'None';
  let bestGrade: Grade = 'None';
  const gradeValue: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, None: 0 };
  
  for (const rule of rules) {
    if (rule.days.includes(dayOfWeek) && time >= rule.start && time < rule.end) {
      if (gradeValue[rule.grade] > gradeValue[bestGrade]) {
        bestGrade = rule.grade;
      }
    }
  }
  return bestGrade;
}

interface Block {
  start: string;
  end: string;
  slots: BookingSlot[];
  date: string;
  grade: Grade;
}

interface CartItem {
  id: string;
  date: string;
  track: 'A' | 'B' | 'C' | 'D';
  startTime: string;
  endTime: string;
  durationHours: number;
}

interface RecentBooking extends CartItem {
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

function addMinutes(timeStr: string, mins: number) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}
const BANBOKNING_STYLES: Record<string, { bg: string, header: string, text: string }> = {
  style_1: { bg: '#B3EEAC', header: '#1a4c15', text: '#49483c' }, // Träning
  style_2: { bg: '#ACDBEE', header: '#2b4958', text: '#49483c' }, // Seriespel?
  style_3: { bg: '#E7D6A2', header: '#55561a', text: '#49483c' }, // Uthyrning
  style_4: { bg: '#fad4d4', header: '#D96666', text: '#49483c' }, // Isvård
  style_5: { bg: '#D1C2F0', header: '#6633CC', text: '#49483c' }, // Lunchcurling
  style_6: { bg: '#BDE6E1', header: '#22AA99', text: '#49483c' },
  style_7: { bg: '#F5CCB8', header: '#DD5511', text: '#49483c' },
  style_8: { bg: '#C2DCC7', header: '#329262', text: '#49483c' },
  style_9: { bg: '#E7DCCE', header: '#B08B59', text: '#49483c' },
  default: { bg: '#f1f5f9', header: '#64748b', text: '#475569' }
};

const GRADE_COLORS: Record<Grade, { block: string, icon: string, badge: string }> = {
  A: {
    block: 'bg-emerald-50 border-emerald-300 hover:border-emerald-500 hover:shadow-emerald-100',
    icon: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
    badge: 'bg-emerald-500 text-white shadow-sm border border-emerald-600'
  },
  B: {
    block: 'bg-teal-50 border-teal-300 hover:border-teal-500 hover:shadow-teal-100',
    icon: 'bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white',
    badge: 'bg-teal-500 text-white shadow-sm border border-teal-600'
  },
  C: {
    block: 'bg-yellow-50 border-yellow-300 hover:border-yellow-500 hover:shadow-yellow-100',
    icon: 'bg-yellow-100 text-yellow-700 group-hover:bg-yellow-600 group-hover:text-white',
    badge: 'bg-yellow-500 text-white shadow-sm border border-yellow-600'
  },
  D: {
    block: 'bg-orange-50 border-orange-300 hover:border-orange-500 hover:shadow-orange-100',
    icon: 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white',
    badge: 'bg-orange-500 text-white shadow-sm border border-orange-600'
  },
  E: {
    block: 'bg-rose-50 border-rose-300 hover:border-rose-500 hover:shadow-rose-100',
    icon: 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white',
    badge: 'bg-rose-500 text-white shadow-sm border border-rose-600'
  },
  None: {
    block: 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-blue-50',
    icon: 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white',
    badge: 'bg-slate-100 text-slate-500 border border-slate-200'
  }
};

export default function CalendarClient({ initialData }: Props) {
  const router = useRouter();
  const data = initialData;
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>('mans');
  const [minGrade, setMinGrade] = useState<Grade>('B');

  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configJson, setConfigJson] = useState('');

  const activePersona = useMemo(() => personas.find(p => p.id === activePersonaId) || personas[0], [activePersonaId, personas]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const openConfig = () => {
    setConfigJson(JSON.stringify(personas, null, 2));
    setIsConfigOpen(true);
  };

  const saveConfig = () => {
    try {
      const parsed = JSON.parse(configJson);
      setPersonas(parsed);
      setIsConfigOpen(false);
    } catch (e) {
      alert("Ogiltigt JSON-format. Kontrollera din syntax.");
    }
  };

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('banbokning-cart-v1');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch {
        localStorage.removeItem('banbokning-cart-v1');
      }
    }
  }, []);

  // Save cart to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('banbokning-cart-v1', JSON.stringify(cart));
  }, [cart]);

  // Load filter settings from localStorage on mount
  useEffect(() => {
    const savedPersonaId = localStorage.getItem('banbokning-active-persona-v1');
    if (savedPersonaId) {
      setActivePersonaId(savedPersonaId);
    }
    const savedMinGrade = localStorage.getItem('banbokning-min-grade-v1') as Grade;
    if (savedMinGrade && ['A', 'B', 'C', 'D', 'E'].includes(savedMinGrade)) {
      setMinGrade(savedMinGrade);
    }
  }, []);

  // Save filter settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('banbokning-active-persona-v1', activePersonaId);
  }, [activePersonaId]);

  useEffect(() => {
    localStorage.setItem('banbokning-min-grade-v1', minGrade);
  }, [minGrade]);

  const [isLoggedIn, setIsLoggedIn] = useState(true); // Default true so it doesn't flash before effect
  
  // Load login state
  useEffect(() => {
    const savedLogin = localStorage.getItem('banbokning-logged-in-v1');
    setIsLoggedIn(savedLogin === 'true');
  }, []);

  const handleSetLoggedIn = (val: boolean) => {
    setIsLoggedIn(val);
    localStorage.setItem('banbokning-logged-in-v1', val ? 'true' : 'false');
  };

  // Cart helper functions
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Find the booking that contains this slot (or returns null if not in any booking)
  const findBookingForSlot = (date: string, track: string, slotTime: string): CartItem | null => {
    return cart.find(c =>
      c.date === date &&
      c.track === track &&
      slotTime >= c.startTime &&
      slotTime < c.endTime
    ) || null;
  };

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    // Check if slot is already part of a booking
    const existingBooking = findBookingForSlot(item.date, item.track, item.startTime);
    if (existingBooking) return;

    // Find all bookings for this date/track
    const trackBookings = cart.filter(c => c.date === item.date && c.track === item.track);

    // Check for adjacent bookings
    const adjacentBefore = trackBookings.find(c => c.endTime === item.startTime);
    const adjacentAfter = trackBookings.find(c => c.startTime === item.endTime);

    // Remove adjacent bookings and create merged booking
    const bookingsToRemove = [adjacentBefore, adjacentAfter].filter((b): b is CartItem => b !== null);
    const otherBookings = cart.filter(c => !bookingsToRemove.includes(c));

    let mergedItem: Omit<CartItem, 'id'>;
    if (adjacentBefore && adjacentAfter) {
      // Merge both - the new slot connects them
      mergedItem = {
        date: item.date,
        track: item.track,
        startTime: adjacentBefore.startTime,
        endTime: adjacentAfter.endTime,
        durationHours: adjacentBefore.durationHours + adjacentAfter.durationHours + 0.5
      };
    } else if (adjacentBefore) {
      // Extend booking before
      mergedItem = {
        date: item.date,
        track: item.track,
        startTime: adjacentBefore.startTime,
        endTime: item.endTime,
        durationHours: adjacentBefore.durationHours + 0.5
      };
    } else if (adjacentAfter) {
      // Extend booking after
      mergedItem = {
        date: item.date,
        track: item.track,
        startTime: item.startTime,
        endTime: adjacentAfter.endTime,
        durationHours: adjacentAfter.durationHours + 0.5
      };
    } else {
      // No adjacent bookings, add as new
      mergedItem = item;
    }

    setCart([...otherBookings, { ...mergedItem, id: generateId() }]);
  };

  const removeFromCart = (date: string, track: string, slotTime: string) => {
    const booking = findBookingForSlot(date, track, slotTime);
    if (booking) {
      setCart(prev => prev.filter(c => c.id !== booking.id));
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (date: string, track: string, slotTime: string) => {
    return findBookingForSlot(date, track, slotTime) !== null;
  };

  const openBookingTab = (item: CartItem) => {
    const iframeName = `booking-iframe-${item.id}`;
    let iframe = document.getElementById(iframeName) as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.id = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.banbokning.se/sundbyberg/book.php';
    form.target = iframeName;

    const fields = {
      update_id: '0',
      date: item.date.replace(/-/g, ''),
      bookdate: item.date,
      series_id: '0',
      access: '3',
      booktime: `${item.startTime}:00`,
      booklength: item.durationHours.toString(),
      'sheet[]': ({ 'A': '1', 'B': '2', 'C': '3', 'D': '4' } as const)[item.track],
      comment: 'Westerberg'
    };

    for (const [key, value] of Object.entries(fields)) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = key;
      input.value = value as string;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
    
    // Clean up form immediately, but leave iframe so it can complete the request
    document.body.removeChild(form);
    setTimeout(() => {
      const oldIframe = document.getElementById(iframeName);
      if (oldIframe) document.body.removeChild(oldIframe);
    }, 10000); // Remove iframe after 10s
  };

  const [isBooking, setIsBooking] = useState(false);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  useEffect(() => {
    if (recentBookings.length === 0) return;
    
    let changed = false;
    const updatedBookings = recentBookings.map(rb => {
      if (rb.status === 'confirmed') return rb;
      
      const dayData = data.find(d => d.date === rb.date);
      if (!dayData) return rb; // Can't verify yet
      
      let allBooked = true;
      let someBooked = false;
      let someWesterberg = false;
      
      let currentTime = rb.startTime;
      while (currentTime < rb.endTime) {
        const slot = dayData.slots.find(s => s.time === currentTime);
        if (slot) {
          const trackInfo = slot.trackInfo[rb.track];
          if (trackInfo.available) {
             allBooked = false;
          } else {
             someBooked = true;
             if (trackInfo.text.toLowerCase().includes('westerberg')) {
                someWesterberg = true;
             }
          }
        }
        currentTime = addMinutes(currentTime, 30);
      }
      
      // If it's been more than 15 seconds and still not booked
      const isOld = Date.now() - rb.timestamp > 15000;
      
      if (allBooked && someBooked) {
         changed = true;
         return { ...rb, status: 'confirmed' as const };
      } else if (someWesterberg) {
         changed = true;
         return { ...rb, status: 'confirmed' as const };
      } else if (isOld && !allBooked) {
         changed = true;
         return { ...rb, status: 'failed' as const };
      }
      
      return rb;
    });
    
    if (changed) {
      setRecentBookings(updatedBookings);
    }
  }, [data, recentBookings]);

  const bookAll = () => {
    setIsBooking(true);
    
    const newRecent = cart.map(item => ({
      ...item,
      status: 'pending' as const,
      timestamp: Date.now()
    }));
    setRecentBookings(prev => [...newRecent, ...prev]);
    
    cart.forEach((item, i) => {
      setTimeout(() => openBookingTab(item), i * 150);
    });
    
    setTimeout(() => {
      clearCart();
      setIsBooking(false);
      setIsCartOpen(false);
      setIsReceiptOpen(true);
      
      // We wait a tiny bit to allow the backend requests to fully register in their database
      setTimeout(() => {
        handleRefresh();
      }, 1500);

    }, cart.length * 150 + 500);
  };

  const filteredData = useMemo(() => {
    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return data
      .filter(day => day.date >= todayDateStr)
      .map(day => {
        const filteredSlots = day.slots.filter(slot => {
          const hasAvailable = slot.tracks.A || slot.tracks.B || slot.tracks.C || slot.tracks.D;
          if (!hasAvailable) return false;
          return true;
        });
        return { ...day, slots: filteredSlots };
      }).filter(day => day.slots.length > 0);
  }, [data]);

  const allGrades: Grade[] = ['A', 'B', 'C', 'D', 'E'];

  const getBlocksForDay = (day: DaySchedule): Block[] => {
    const blocks: Block[] = [];
    let currentBlock: Block | null = null;
    const dateObj = new Date(day.date);
    const dayOfWeek = dateObj.getDay();
    const gradeValue: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, None: 0 };
    
    for (let i = 0; i < day.slots.length; i++) {
      const slot = day.slots[i];
      const avail = Object.entries(slot.tracks).filter(([_, v]) => v).map(([k]) => k);
      const isAvail = avail.length > 0;
      
      if (isAvail) {
        const grade = getGrade(dayOfWeek, slot.time, activePersona.rules);

        if (!currentBlock) {
          currentBlock = { start: slot.time, end: addMinutes(slot.time, 30), slots: [slot], date: day.date, grade };
        } else {
          // Continue block if time is contiguous AND grade matches
          if (currentBlock.end === slot.time && currentBlock.grade === grade) {
            currentBlock.end = addMinutes(slot.time, 30);
            currentBlock.slots.push(slot);
          } else {
            blocks.push(currentBlock);
            currentBlock = { start: slot.time, end: addMinutes(slot.time, 30), slots: [slot], date: day.date, grade };
          }
        }
      }
    }
    if (currentBlock) blocks.push(currentBlock);
    
    return blocks.filter(b => {
      // Must be at least 1 hour
      if (b.slots.length < 2) return false;
      
      // If persona is active, must meet minimum grade requirement
      if (activePersonaId !== 'none') {
        if (gradeValue[b.grade] < gradeValue[minGrade]) return false;
      }
      
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12 font-sans relative">
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-4 gap-4 flex-wrap">
          {!isLoggedIn ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-50/80 p-3 rounded-xl shadow-sm border border-blue-100 flex-1">
              <div className="flex-1">
                <span className="text-sm font-bold text-blue-900 block">Kräver inloggning på Banbokning.se</span>
                <span className="text-xs text-blue-700">Du måste vara inloggad för att kunna boka. Öppna sidan, logga in och kom tillbaka hit.</span>
              </div>
              <div className="flex items-center gap-2">
                <a 
                  href="https://www.banbokning.se/sundbyberg/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                >
                  Öppna inloggning
                </a>
                <button 
                  onClick={() => handleSetLoggedIn(true)}
                  className="text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg transition-colors whitespace-nowrap shadow-sm"
                >
                  Jag är inloggad
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-emerald-50/80 p-2 px-3 rounded-xl shadow-sm border border-emerald-100">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Inloggad läge aktivt
              </span>
              <button 
                onClick={() => handleSetLoggedIn(false)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 ml-2 underline decoration-emerald-300 underline-offset-2"
              >
                Ändra
              </button>
            </div>
          )}

          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50 h-9"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Synkronisera kalender</span>
            <span className="sm:hidden">Synka</span>
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8">
          <div className="flex flex-col gap-5">
            {/* Personas & Grades */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCircle2 size={14} /> Tidspreset (Persona)
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative flex-1">
                    <select
                      value={activePersonaId}
                      onChange={(e) => setActivePersonaId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm appearance-none"
                    >
                      {personas.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                  <button 
                    onClick={openConfig}
                    className="shrink-0 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors border border-slate-200"
                  >
                    <Settings size={16} /> Konfigurera
                  </button>
                </div>
              </div>

              {activePersonaId !== 'none' && (
                <div className="md:w-48 shrink-0">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Minsta betyg</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allGrades.map((grade) => {
                      const gradeValue: Record<Grade, number> = { A: 5, B: 4, C: 3, D: 2, E: 1, None: 0 };
                      const isSelected = gradeValue[grade] >= gradeValue[minGrade];
                      
                      return (
                        <button
                          key={grade}
                          onClick={() => setMinGrade(grade)}
                          className={`w-8 h-8 rounded-lg text-sm font-black flex items-center justify-center transition-all border shadow-sm ${
                            isSelected
                              ? GRADE_COLORS[grade].badge
                              : 'bg-white border-slate-200 text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          {grade}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-8">
          {filteredData.length === 0 ? (
            <div className="text-center py-20 text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center">
              <div className="bg-slate-50 p-4 rounded-full mb-4">
                <CalendarIcon size={32} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Inga tillgängliga tider</h3>
              <p className="text-slate-500 mt-2 font-medium">Försök att justera dina filter eller kontrollera en annan vecka.</p>
            </div>
          ) : (
            filteredData.map((day) => {
              const blocks = getBlocksForDay(day);
              if (blocks.length === 0) return null;

              return (
                <div key={day.date} className="relative pt-2 pb-4">
                  <div className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md py-3 -mx-4 px-4 mb-3 border-b border-slate-200 shadow-sm flex items-center justify-between">
                    <h2 className="font-black text-slate-900 text-lg tracking-tight">
                      {new Date(day.date).toLocaleDateString('sv-SE', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>
                  </div>
                  
                  <div className="space-y-3">
                    {blocks.map((b, idx) => (
                      <div 
                        key={idx}
                        className={`flex flex-col rounded-2xl border transition-all shadow-sm ${GRADE_COLORS[b.grade].block}`}
                      >
                        <div 
                           onClick={() => setSelectedBlock(selectedBlock?.start === b.start && selectedBlock?.date === day.date ? null : { ...b, date: day.date })}
                           className="flex items-center justify-between p-4 cursor-pointer group"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-3.5 rounded-xl transition-colors ${GRADE_COLORS[b.grade].icon}`}>
                              <Clock size={24} />
                            </div>
                            <div>
                              <div className="flex flex-col items-start justify-center">
                                {(() => {
                                  const lastSlotTime = b.slots[b.slots.length - 1].time;
                                  const startHour = b.start.split(':')[0];
                                  const lastHour = lastSlotTime.split(':')[0];
                                  
                                  if (startHour === lastHour) {
                                    return (
                                      <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-black text-slate-900 text-xl tracking-tight">{b.start}</span>
                                        {b.grade !== 'None' && (
                                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${GRADE_COLORS[b.grade].badge}`}>
                                            Betyg {b.grade}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <>
                                        <span className="text-slate-500 font-semibold text-sm leading-tight mb-0.5">Starttider mellan</span>
                                        <div className="flex flex-wrap items-center gap-2">
                                          <div className="font-black text-slate-900 text-xl tracking-tight flex items-center gap-1.5 whitespace-nowrap">
                                            <span>{b.start}</span>
                                            <span className="text-slate-400 font-medium text-lg">och</span>
                                            <span>{lastSlotTime}</span>
                                          </div>
                                          {b.grade !== 'None' && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${GRADE_COLORS[b.grade].badge}`}>
                                              Betyg {b.grade}
                                            </span>
                                          )}
                                        </div>
                                      </>
                                    );
                                  }
                                })()}
                              </div>
                              <div className="text-sm text-slate-500 font-semibold mt-1">
                                {(() => {
                                  const tracks = new Set<string>();
                                  b.slots.forEach(slot => {
                                    if (slot.tracks.A) tracks.add('A');
                                    if (slot.tracks.B) tracks.add('B');
                                    if (slot.tracks.C) tracks.add('C');
                                    if (slot.tracks.D) tracks.add('D');
                                  });
                                  const sortedTracks = Array.from(tracks).sort();
                                  if (sortedTracks.length === 0) return '';
                                  if (sortedTracks.length === 1) return `Bana ${sortedTracks[0]}`;
                                  return `Bana ${sortedTracks.join(', ')}`;
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="text-slate-300 group-hover:text-slate-500 transition-transform duration-300 pr-2">
                            <ChevronDown size={24} strokeWidth={3} className={selectedBlock?.start === b.start && selectedBlock?.date === day.date ? 'rotate-180' : ''} />
                          </div>
                        </div>

                        {/* Accordion Content */}
                        {selectedBlock?.start === b.start && selectedBlock?.date === day.date && (
                          <div className="pt-0 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl">
                             <div className="mt-2 bg-white rounded-xl border-y sm:border border-slate-200 overflow-hidden shadow-sm flex flex-col mx-4 mb-4">
                                <div 
                                  className="overflow-x-auto pb-4 custom-scrollbar" 
                                  ref={(el) => {
                                    if (el) {
                                      // On mount, wait a tick and scroll to center the first available block
                                      setTimeout(() => {
                                        const bookBtn = el.querySelector('button');
                                        if (bookBtn && el.parentElement) {
                                           const scrollLeft = bookBtn.getBoundingClientRect().left + el.scrollLeft - el.getBoundingClientRect().left - (el.clientWidth / 2) + (bookBtn.clientWidth / 2);
                                           el.scrollTo({ left: scrollLeft, behavior: 'smooth' });
                                        }
                                      }, 50);
                                    }
                                  }}
                                >
                                  <div className="w-max min-w-full text-xs">
                                    {(() => {
                                      const dayData = data.find(d => d.date === selectedBlock.date);
                                      if (!dayData) return null;
                                      
                                      // Find indices to slice
                                      const startIdx = dayData.slots.findIndex(s => s.time === selectedBlock.start);
                                      const endIdx = dayData.slots.findIndex(s => s.time === selectedBlock.end);
                                      
                                      const validStartIdx = startIdx !== -1 ? startIdx : 0;
                                      const validEndIdx = endIdx !== -1 ? endIdx : dayData.slots.length - 1;
                                      
                                      // Show 1.5 hours (3 slots) before and after
                                      const sliceStart = Math.max(0, validStartIdx - 3);
                                      const sliceEnd = Math.min(dayData.slots.length, validEndIdx + 4);
                                      
                                      const visibleSlots = dayData.slots.slice(sliceStart, sliceEnd);

                                      const tracks: ('A' | 'B' | 'C' | 'D')[] = ['A', 'B', 'C', 'D'];

                                      return (
                                        <div className="flex flex-col pt-2">
                                          {/* Track Rows */}
                                          {tracks.map((track, trackIdx) => (
                                            <div key={track} className={`flex flex-col bg-slate-50 ${trackIdx < 3 ? 'border-b-4 border-slate-200/60 pb-1' : ''}`}>
                                              {/* Row Header: Track Name */}
                                              <div className="sticky left-0 z-10 w-max pl-2 pt-1.5 pb-1">
                                                <div className="inline-block px-2.5 py-0.5 text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white border border-slate-200 shadow-sm rounded-md">
                                                  Bana {track}
                                                </div>
                                              </div>
                                              
                                              {/* Cells for this track */}
                                              <div className="flex bg-white border-y border-slate-200/80">
                                                {visibleSlots.map((slot, idx) => {
                                                const prevSlot = idx > 0 ? visibleSlots[idx - 1] : undefined;

                                                const info = slot.trackInfo[track];
                                                const prevInfo = prevSlot?.trackInfo[track];

                                                const isSameAsPrev = prevInfo && prevInfo.text === info.text && prevInfo.available === info.available;

                                                if (info.available) {
                                                  const inCart = isInCart(selectedBlock.date, track, slot.time);

                                                  return (
                                                    <div
                                                      key={slot.time}
                                                      className="shrink-0 flex flex-col items-center p-0.5 border-r border-slate-200/50"
                                                      style={{ width: '3rem' }}
                                                    >
                                                      <div
                                                        className="w-full aspect-square rounded transition-all flex items-center justify-center cursor-pointer hover:bg-slate-100"
                                                        onClick={() => {
                                                          if (inCart) {
                                                            // Remove from cart
                                                            removeFromCart(selectedBlock.date, track, slot.time);
                                                          } else {
                                                            // Add to cart
                                                            addToCart({
                                                              date: selectedBlock.date,
                                                              track: track,
                                                              startTime: slot.time,
                                                              endTime: addMinutes(slot.time, 30),
                                                              durationHours: 0.5
                                                            });
                                                          }
                                                        }}
                                                      >
                                                        <div className={`w-full h-full rounded transition-all flex items-center justify-center ${
                                                          inCart
                                                            ? 'bg-emerald-500 shadow-sm border border-emerald-600'
                                                            : 'bg-white border border-slate-200 hover:border-emerald-300'
                                                        }`}>
                                                          {inCart && <span className="text-white font-black text-[10px]">✓</span>}
                                                        </div>
                                                      </div>
                                                      <span className={`text-[8px] font-bold mt-0.5 ${inCart ? 'text-emerald-600' : 'text-slate-500'}`}>{slot.time}</span>
                                                    </div>
                                                  );
                                                }

                                                if (!info.available && !isSameAsPrev) {
                                                  let spanCount = 1;
                                                  for (let i = idx + 1; i < visibleSlots.length; i++) {
                                                    if (visibleSlots[i].trackInfo[track].text === info.text) {
                                                      spanCount++;
                                                    } else {
                                                      break;
                                                    }
                                                  }
                                                  
                                                  const blockStartTime = slot.time;
                                                  const blockEndTime = addMinutes(slot.time, spanCount * 30);
                                                  
                                                  // Find the official color style
                                                  const styleKey = info.style.includes('style_') ? info.style.split(' ')[0] : 'default';
                                                  const palette = BANBOKNING_STYLES[styleKey] || BANBOKNING_STYLES.default;

                                                  return (
                                                    <div 
                                                      key={slot.time} 
                                                      style={{ width: `${spanCount * 3}rem`, backgroundColor: palette.bg }} 
                                                      className="shrink-0 flex flex-col border-r border-slate-200/50 overflow-hidden min-h-[44px]"
                                                    >
                                                      <div 
                                                        style={{ backgroundColor: palette.header }}
                                                        className="px-1 py-0.5 text-[8px] font-black text-white truncate leading-none text-center"
                                                      >
                                                        {blockStartTime}-{blockEndTime}
                                                      </div>
                                                      <div 
                                                        style={{ color: palette.text }}
                                                        className="flex-1 flex items-center justify-center text-[9px] text-center font-bold leading-tight px-1 py-0.5 overflow-hidden"
                                                      >
                                                        <span className="line-clamp-2">{info.text || 'Bokad'}</span>
                                                      </div>
                                                    </div>
                                                  );
                                                }

                                                if (!info.available && isSameAsPrev) return null;
                                                return null;
                                              })}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      );
                                     })()}
                                   </div>
                                 </div>
                              </div>
                           </div>
                         )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Config Modal */}
      {isConfigOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setIsConfigOpen(false)}
        >
          <div 
            className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                <Settings size={20} className="text-blue-600" />
                Konfigurera förinställningar (JSON)
              </h3>
              <button 
                onClick={() => setIsConfigOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                 <X size={20} />
              </button>
            </div>
            
            <div className="p-6 bg-slate-50 flex-1">
              <p className="text-sm text-slate-500 mb-4 font-medium">
                Du kan lägga till, ta bort eller ändra dina förinställningar nedan med JSON. Använd dagar 0-6 (0 = Söndag). Betyg kan vara A, B, C, D eller E.
              </p>
              <textarea
                value={configJson}
                onChange={e => setConfigJson(e.target.value)}
                className="w-full h-96 p-4 rounded-xl border border-slate-300 font-mono text-sm bg-slate-900 text-slate-50 focus:ring-2 focus:ring-blue-500 outline-none"
                spellCheck={false}
              />
            </div>
            
            <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
              <button
                onClick={() => setIsConfigOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Avbryt
              </button>
              <button
                onClick={saveConfig}
                className="px-5 py-2.5 rounded-xl text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                Spara konfiguration
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Cart Button - Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsCartOpen(true)}
          className="relative bg-slate-900 hover:bg-slate-800 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 transition-transform hover:scale-105 active:scale-95 border border-slate-700"
        >
          <ShoppingCart size={24} />
          {cart.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-emerald-500 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
              {cart.length}
            </span>
          )}
          <span className="font-bold text-sm hidden sm:inline">
            {cart.length === 0 ? 'Varukorg' : `${cart.length} bokningar`}
          </span>
        </button>
      </div>

      {/* Cart Modal */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <ShoppingCart size={24} className="text-emerald-600" />
                Din varukorg ({cart.length})
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="font-medium">Din varukorg är tom</p>
                  <p className="text-sm mt-1">Välj tider och lägg till i varukorgen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map(item => (
                    <div
                      key={item.id}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-200"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-lg text-blue-600">{item.track}</span>
                          <span className="text-slate-400">•</span>
                          <span className="font-bold text-slate-700">{item.date}</span>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.date, item.track, item.startTime)}
                          className="p-2 hover:bg-rose-100 hover:text-rose-600 rounded-lg text-slate-400 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <div className="font-bold text-slate-900">
                        {item.startTime} - {item.endTime}
                        <span className="text-slate-500 font-normal ml-2">
                          ({item.durationHours}t)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cart.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
                <div className="flex items-center justify-between mb-4 text-sm text-slate-600">
                  <span>{cart.length} bokningar</span>
                  <span className="font-bold">
                    {cart.reduce((sum, item) => sum + item.durationHours, 0)} timmar totalt
                  </span>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={clearCart}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors border border-slate-300"
                  >
                    Töm varukorg
                  </button>
                  <button
                    onClick={bookAll}
                    disabled={isBooking}
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-black shadow-sm transition-transform active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isBooking ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        Bokar...
                      </>
                    ) : (
                      'Boka alla'
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-4 text-center font-medium">
                  Observera: Du måste vara inloggad på banbokning.se för att bokningarna ska genomföras. Använd inloggningen överst på sidan först.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Receipt / Confirmation Modal */}
      {isReceiptOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          onClick={() => setIsReceiptOpen(false)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-600" />
                Bokningsstatus
              </h3>
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <p className="text-sm text-slate-600 font-medium mb-4">
                Dina bokningar har skickats. Vi övervakar kalendern för att bekräfta att de dyker upp (det kan ta några sekunder).
              </p>
              <div className="space-y-3">
                {recentBookings.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-lg text-blue-600">{item.track}</span>
                        <span className="text-slate-400">•</span>
                        <span className="font-bold text-slate-700">{item.date}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {item.startTime} - {item.endTime}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'pending' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                          <RefreshCw size={14} className="animate-spin" />
                          Väntar...
                        </span>
                      )}
                      {item.status === 'confirmed' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          <CheckCircle2 size={14} />
                          Bekräftad
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                          <AlertCircle size={14} />
                          Okänt / Gick ej igenom
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-white rounded-b-2xl flex gap-3">
              <button
                onClick={handleRefresh}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors border border-blue-200 flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> Uppdatera manuellt
              </button>
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-300"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
