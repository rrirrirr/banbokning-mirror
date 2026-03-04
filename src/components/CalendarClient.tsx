'use client';

import { useState, useMemo, useEffect } from 'react';
import { DaySchedule, BookingSlot } from '@/lib/calendar';
import { CalendarIcon, Clock, MapPin, X, ChevronRight, ChevronDown, Info, RefreshCw, UserCircle2, Settings, ShoppingCart, Trash2 } from 'lucide-react';
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
    name: 'No Preset',
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

function BookingForm({ bookingData, onClose }: { bookingData: any, onClose: () => void }) {
  // Generate all possible 30-min slots in this available block
  const slots: string[] = [];
  let current = bookingData.time;
  for (let i = 0; i <= bookingData.maxDurationHours * 2; i++) {
    slots.push(current);
    current = addMinutes(current, 30);
  }

  const [startIndex, setStartIndex] = useState(0);
  const [endIndex, setEndIndex] = useState(slots.length - 1);

  const startTime = slots[startIndex];
  const endTime = slots[endIndex];
  const lengthHours = (endIndex - startIndex) * 0.5;

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div 
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
            Slutför Bokning
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
             <X size={20} />
          </button>
        </div>
        
        <div className="p-6 bg-white">
          <form action="https://www.banbokning.se/sundbyberg/book.php" method="POST" target="_blank" onSubmit={() => setTimeout(onClose, 100)}>
            {/* Hidden Fields for backend compatibility */}
            <input type="hidden" name="update_id" value="0" />
            <input type="hidden" name="date" value={bookingData.date.replace(/-/g, '')} />
            <input type="hidden" name="bookdate" value={bookingData.date} />
            <input type="hidden" name="series_id" value="0" />
            <input type="hidden" name="access" value="3" />
            <input type="hidden" name="booktime" value={`${startTime}:00`} />
            <input type="hidden" name="booklength" value={lengthHours} />
            <input type="hidden" name="sheet[]" value={{ 'A': 1, 'B': 2, 'C': 3, 'D': 4 }[bookingData.track as 'A' | 'B' | 'C' | 'D']} />

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                 <div>
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Datum</div>
                   <div className="font-black text-slate-900 text-lg">{bookingData.date}</div>
                 </div>
                 <div className="text-right">
                   <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bana</div>
                   <div className="font-black text-blue-600 text-2xl leading-none">{bookingData.track}</div>
                 </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3">Välj tid (Start & Slut)</label>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Starttid</label>
                      <select 
                        value={startIndex}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setStartIndex(val);
                          if (val >= endIndex) setEndIndex(val + 1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        {slots.slice(0, -1).map((t, i) => (
                          <option key={`start-${i}`} value={i}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="text-slate-300 font-black mt-4">
                      <ChevronRight size={20} />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-400 uppercase block mb-1">Sluttid</label>
                      <select 
                        value={endIndex}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEndIndex(val);
                          if (val <= startIndex) setStartIndex(val - 1);
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-base font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                      >
                        {slots.slice(1).map((t, i) => {
                          const actualIndex = i + 1;
                          return (
                            <option key={`end-${actualIndex}`} value={actualIndex} disabled={actualIndex <= startIndex}>
                              {t}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                     <span className="inline-block bg-blue-100 text-blue-800 font-bold text-xs px-3 py-1 rounded-full">
                       Totalt: {lengthHours} timmar
                     </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Information / Anteckning</label>
                <input 
                  type="text" 
                  name="comment" 
                  defaultValue="" 
                  placeholder="Skriv din anteckning här..."
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-lg py-3.5 rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
                  disabled={lengthHours <= 0}
                >
                  Boka {lengthHours > 0 ? `${lengthHours}h` : ''}
                </button>
                <p className="text-center text-xs font-medium text-slate-400 mt-3">
                  Öppnas säkert i en ny flik. <br/>Kräver att du är inloggad på Banbokning.se.
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function CalendarClient({ initialData }: Props) {
  const router = useRouter();
  const [data] = useState<DaySchedule[]>(initialData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters State
  const [personas, setPersonas] = useState<Persona[]>(INITIAL_PERSONAS);
  const [activePersonaId, setActivePersonaId] = useState<string>('mans');
  const [minGrade, setMinGrade] = useState<Grade>('E');
  
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configJson, setConfigJson] = useState('');
  const [bookingData, setBookingData] = useState<{
    date: string;
    time: string;
    track: 'A' | 'B' | 'C' | 'D';
    maxDurationHours: number;
  } | null>(null);

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
      alert("Invalid JSON format. Please check your syntax.");
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

  // Cart helper functions
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const addToCart = (item: Omit<CartItem, 'id'>) => {
    const exists = cart.some(c =>
      c.track === item.track &&
      c.date === item.date &&
      c.startTime === item.startTime
    );
    if (exists) return;
    setCart(prev => [...prev, { ...item, id: generateId() }]);
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(c => c.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (date: string, track: string, startTime: string) => {
    return cart.some(c =>
      c.date === date &&
      c.track === track &&
      c.startTime === startTime
    );
  };

  const openBookingTab = (item: CartItem) => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.banbokning.se/sundbyberg/book.php';
    form.target = '_blank';

    const fields = {
      update_id: '0',
      date: item.date.replace(/-/g, ''),
      bookdate: item.date,
      series_id: '0',
      access: '3',
      booktime: `${item.startTime}:00`,
      booklength: item.durationHours.toString(),
      'sheet[]': ({ 'A': '1', 'B': '2', 'C': '3', 'D': '4' } as const)[item.track],
      comment: 'BanbokningMirror'
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
    document.body.removeChild(form);
  };

  const bookAll = () => {
    cart.forEach((item, i) => {
      setTimeout(() => openBookingTab(item), i * 400);
    });
    setTimeout(() => clearCart(), cart.length * 400 + 1000);
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
        <div className="flex justify-end mb-4">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
            Sync Calendar
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8">
          <div className="flex flex-col gap-5">
            {/* Personas & Grades */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 w-full">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <UserCircle2 size={14} /> Time Preset (Persona)
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
                    <Settings size={16} /> Configure
                  </button>
                </div>
              </div>

              {activePersonaId !== 'none' && (
                <div className="md:w-48 shrink-0">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Minimum Grade</label>
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
              <h3 className="text-xl font-bold text-slate-900">No available times</h3>
              <p className="text-slate-500 mt-2 font-medium">Try adjusting your filters or checking another week.</p>
            </div>
          ) : (
            filteredData.map((day) => {
              const blocks = getBlocksForDay(day);
              if (blocks.length === 0) return null;

              return (
                <div key={day.date} className="relative pt-2 pb-4">
                  <div className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md py-3 -mx-4 px-4 mb-3 border-b border-slate-200 shadow-sm flex items-center justify-between">
                    <h2 className="font-black text-slate-900 text-lg tracking-tight">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
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
                              <div className="flex items-center gap-2">
                                <div className="font-black text-slate-900 text-xl tracking-tight">
                                  {b.start} <span className="text-slate-400 font-medium px-1 text-lg">to</span> {b.end}
                                </div>
                                {b.grade !== 'None' && (
                                  <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${GRADE_COLORS[b.grade].badge}`}>
                                    Grade {b.grade}
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-500 font-semibold mt-1">
                                {b.slots.length} available {b.slots.length === 1 ? 'slot' : 'slots'}
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
                                      
                                      const getAvailableDuration = (track: 'A' | 'B' | 'C' | 'D', startIndex: number) => {
                                         let count = 0;
                                         for(let i = startIndex; i < dayData.slots.length; i++) {
                                           if(dayData.slots[i].trackInfo[track].available) {
                                             count++;
                                           } else {
                                             break;
                                           }
                                         }
                                         return count * 30; // duration in minutes
                                      };

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
                                                const originalIndex = dayData.slots.findIndex(s => s.time === slot.time);
                                                const prevSlot = idx > 0 ? visibleSlots[idx - 1] : undefined;
                                                
                                                const info = slot.trackInfo[track];
                                                const prevInfo = prevSlot?.trackInfo[track];
                                                
                                                const isSameAsPrev = prevInfo && prevInfo.text === info.text && prevInfo.available === info.available;
                                                
                                                let bgColor = 'bg-slate-100 text-slate-600';
                                                if (info.available) bgColor = 'bg-white text-slate-400';
                                                else if (info.text.toLowerCase().includes('isvård')) bgColor = 'bg-rose-100/60 text-rose-800';
                                                else if (info.text.toLowerCase().includes('träning')) bgColor = 'bg-green-100/60 text-green-900';
                                                else if (info.text.toLowerCase().includes('uthyrning')) bgColor = 'bg-amber-100/60 text-amber-900';

                                                if (info.available) {
                                                  const isSelecting = bookingData?.track === track && bookingData?.date === selectedBlock.date;
                                                  const isSelected = isSelecting && slot.time >= bookingData.time && slot.time < addMinutes(bookingData.time, bookingData.maxDurationHours * 60);
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
                                                            const item = cart.find(c => c.date === selectedBlock.date && c.track === track && c.startTime === slot.time);
                                                            if (item) removeFromCart(item.id);
                                                          } else if (!isSelecting) {
                                                            // First click - add to cart and start selection
                                                            addToCart({
                                                              date: selectedBlock.date,
                                                              track: track,
                                                              startTime: slot.time,
                                                              endTime: addMinutes(slot.time, 30),
                                                              durationHours: 0.5
                                                            });
                                                            setBookingData({
                                                              date: selectedBlock.date,
                                                              time: slot.time,
                                                              track: track,
                                                              maxDurationHours: 0.5
                                                            });
                                                          } else if (isSelected) {
                                                            // Click on selected slot - add current range to cart and keep selecting
                                                            addToCart({
                                                              date: bookingData.date,
                                                              track: bookingData.track,
                                                              startTime: bookingData.time,
                                                              endTime: addMinutes(bookingData.time, bookingData.maxDurationHours * 60),
                                                              durationHours: bookingData.maxDurationHours
                                                            });
                                                            // Keep the selection active for more bookings
                                                            setBookingData(null);
                                                          } else {
                                                            // Click on unselected slot - expand and add new slot
                                                            if (slot.time === addMinutes(bookingData.time, bookingData.maxDurationHours * 60)) {
                                                              const newDuration = bookingData.maxDurationHours + 0.5;
                                                              setBookingData({ ...bookingData, maxDurationHours: newDuration });
                                                              // Add the new slot
                                                              addToCart({
                                                                date: bookingData.date,
                                                                track: bookingData.track,
                                                                startTime: slot.time,
                                                                endTime: addMinutes(slot.time, 30),
                                                                durationHours: 0.5
                                                              });
                                                            } else if (addMinutes(slot.time, 30) === bookingData.time) {
                                                              const newDuration = bookingData.maxDurationHours + 0.5;
                                                              setBookingData({ ...bookingData, time: slot.time, maxDurationHours: newDuration });
                                                              // Add the new slot
                                                              addToCart({
                                                                date: bookingData.date,
                                                                track: bookingData.track,
                                                                startTime: slot.time,
                                                                endTime: addMinutes(slot.time, 30),
                                                                durationHours: 0.5
                                                              });
                                                            } else {
                                                              // New selection starting from this slot - add to cart
                                                              addToCart({
                                                                date: selectedBlock.date,
                                                                track: track,
                                                                startTime: slot.time,
                                                                endTime: addMinutes(slot.time, 30),
                                                                durationHours: 0.5
                                                              });
                                                              setBookingData({
                                                                date: selectedBlock.date,
                                                                time: slot.time,
                                                                track: track,
                                                                maxDurationHours: 0.5
                                                              });
                                                            }
                                                          }
                                                        }}
                                                      >
                                                        <div className={`w-full h-full rounded transition-all flex items-center justify-center ${
                                                          inCart 
                                                            ? 'bg-emerald-100 border-2 border-emerald-500' 
                                                            : isSelected 
                                                              ? 'bg-emerald-500 shadow-sm border border-emerald-600' 
                                                              : 'bg-white border border-slate-200 hover:border-emerald-300'
                                                        }`}>
                                                          {inCart && <span className="text-emerald-600 font-black text-[10px]">✓</span>}
                                                          {!inCart && isSelected && <span className="text-white font-black text-[10px]">✓</span>}
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
                                 
                                 {/* Add to Cart Button */}
                                  {bookingData && bookingData.date === selectedBlock.date && (
                                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">Bana {bookingData.track}</span>
                                        <span className="text-slate-400">•</span>
                                        <span className="font-black text-slate-900">{bookingData.time} - {addMinutes(bookingData.time, bookingData.maxDurationHours * 60)} ({bookingData.maxDurationHours}t)</span>
                                      </div>
                                      <button
                                        onClick={() => setBookingData(null)}
                                        className="px-3 py-2 rounded-lg text-slate-500 hover:bg-slate-200 font-bold text-sm transition-colors"
                                      >
                                        Avbryt
                                      </button>
                                    </div>
                                  )}
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
                Configure Presets (JSON)
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
                You can add, remove, or modify your presets below using JSON. Use days 0-6 (0 = Sunday). Grades can be A, B, C, D, or E.
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
                Cancel
              </button>
              <button
                onClick={saveConfig}
                className="px-5 py-2.5 rounded-xl text-sm font-black bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
              >
                Save Configuration
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
                          onClick={() => removeFromCart(item.id)}
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
                    className="flex-[2] bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-black shadow-sm transition-transform active:scale-95"
                  >
                    Boka alla
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
