import * as cheerio from 'cheerio';

export interface TrackInfo {
  available: boolean;
  text: string;
  style: string;
}

export interface BookingSlot {
  time: string; // e.g., "08:00"
  tracks: {
    A: boolean; // true if available, false if booked
    B: boolean;
    C: boolean;
    D: boolean;
  };
  trackInfo: {
    A: TrackInfo;
    B: TrackInfo;
    C: TrackInfo;
    D: TrackInfo;
  };
  // 15-minute granularity support
  subSlots?: {
    // First 15 minutes of the 30-minute block
    first: {
      tracks: { A: boolean; B: boolean; C: boolean; D: boolean; };
      trackInfo: { A: TrackInfo; B: TrackInfo; C: TrackInfo; D: TrackInfo; };
    };
    // Second 15 minutes of the 30-minute block
    second: {
      tracks: { A: boolean; B: boolean; C: boolean; D: boolean; };
      trackInfo: { A: TrackInfo; B: TrackInfo; C: TrackInfo; D: TrackInfo; };
    };
  };
}

export interface DaySchedule {
  date: string; // YYYY-MM-DD
  slots: BookingSlot[];
}

export async function fetchAndParseCalendar(monthUrl?: string): Promise<DaySchedule[]> {
  const url = monthUrl || 'https://www.banbokning.se/sundbyberg/index.php?view=month';
  const response = await fetch(url, { cache: 'no-store' });
  const html = await response.text();
  const $ = cheerio.load(html);

  const days: DaySchedule[] = [];

  $('td[align="center"]').each((_, dayCell) => {
    const dateLink = $(dayCell).find('a[href*="date="]').first();
    if (!dateLink.length) return;

    const href = dateLink.attr('href') || '';
    const dateMatch = href.match(/date=(\d{4})(\d{2})(\d{2})/);
    if (!dateMatch) return;

    const dateStr = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    
    const slotTable = $(dayCell).find('table.slot, table.slot-today').first();
    if (!slotTable.length) return;

    const slots: BookingSlot[] = [];
    
    const getTrackInfo = (el: any): TrackInfo => {
      if (!el || el.length === 0) return { available: false, text: '', style: '' };
      const textRaw = $(el).text().replace(/\xA0/g, '').trim();
      const hasOnMouseOver = $(el).attr('onmouseover');
      let infoText = textRaw;
      if (hasOnMouseOver) {
        const match = hasOnMouseOver.match(/overlib\('([^']+)'\)/);
        if (match) {
          infoText = match[1].replace(/<br>/gi, ' - ').replace(/<br\/>/gi, ' - ');
        }
      }
      return {
        available: textRaw === '' && !hasOnMouseOver,
        text: infoText,
        style: $(el).attr('class') || ''
      };
    };

    const rawRows = slotTable.find('tr').toArray();
    let currentSlot: BookingSlot | null = null;

    for (let i = 0; i < rawRows.length; i++) {
      const row = rawRows[i];
      if ($(row).find('th').length > 0) continue;

      const tds = $(row).find('td');
      if (tds.length === 0) continue;

      const firstTd = $(tds[0]);
      
      // The time column always has rowspan="2" marking a 30-minute block
      if (firstTd.attr('rowspan') === '2') {
        const time = firstTd.text().trim();
        const trackCells = tds.slice(1);
        
        const infoA = getTrackInfo(trackCells[0]);
        const infoB = getTrackInfo(trackCells[1]);
        const infoC = getTrackInfo(trackCells[2]);
        const infoD = getTrackInfo(trackCells[3]);

        currentSlot = {
          time,
          tracks: {
            A: infoA.available,
            B: infoB.available,
            C: infoC.available,
            D: infoD.available,
          },
          trackInfo: {
            A: infoA,
            B: infoB,
            C: infoC,
            D: infoD,
          }
        };
      } else {
        // This is the second row of the 30-minute block
        if (currentSlot) {
          const trackCells = tds;
          const infoA = getTrackInfo(trackCells[0]);
          const infoB = getTrackInfo(trackCells[1]);
          const infoC = getTrackInfo(trackCells[2]);
          const infoD = getTrackInfo(trackCells[3]);

          // Check if first and second halves differ for any track
          const hasMixedA = currentSlot.tracks.A !== infoA.available || currentSlot.trackInfo.A.text !== infoA.text;
          const hasMixedB = currentSlot.tracks.B !== infoB.available || currentSlot.trackInfo.B.text !== infoB.text;
          const hasMixedC = currentSlot.tracks.C !== infoC.available || currentSlot.trackInfo.C.text !== infoC.text;
          const hasMixedD = currentSlot.tracks.D !== infoD.available || currentSlot.trackInfo.D.text !== infoD.text;
          
          const hasAnyMixed = hasMixedA || hasMixedB || hasMixedC || hasMixedD;

          if (hasAnyMixed) {
            // Store both halves separately for 15-minute granularity
            currentSlot.subSlots = {
              first: {
                tracks: { ...currentSlot.tracks },
                trackInfo: { ...currentSlot.trackInfo }
              },
              second: {
                tracks: { A: infoA.available, B: infoB.available, C: infoC.available, D: infoD.available },
                trackInfo: { A: infoA, B: infoB, C: infoC, D: infoD }
              }
            };
          }

          // For backward compatibility, use AND logic for the main slot
          currentSlot.tracks.A = currentSlot.tracks.A && infoA.available;
          currentSlot.tracks.B = currentSlot.tracks.B && infoB.available;
          currentSlot.tracks.C = currentSlot.tracks.C && infoC.available;
          currentSlot.tracks.D = currentSlot.tracks.D && infoD.available;
          
          slots.push(currentSlot);
          currentSlot = null;
        }
      }
    }

    days.push({ date: dateStr, slots });
  });

  return days;
}
