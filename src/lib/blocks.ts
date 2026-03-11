import { BookingSlot, DaySchedule, TrackInfo } from './calendar';

export interface TimeBlock {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  available: boolean;
  bookingInfo: string;
}

type TrackKey = 'A' | 'B' | 'C' | 'D';

function addMinutes(timeStr: string, mins: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function getDurationMinutes(startTime: string, endTime: string): number {
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;
  
  if (endTotal < startTotal) {
    // Crosses midnight (e.g., 21:15 to 00:00)
    return (24 * 60 - startTotal) + endTotal;
  }
  
  return endTotal - startTotal;
}

interface SubSlotInfo {
  startTime: string;
  endTime: string;
  available: boolean;
  bookingInfo: string;
}

function getSubSlots(slot: BookingSlot, track: TrackKey): SubSlotInfo[] {
  const subSlots: SubSlotInfo[] = [];
  
  if (slot.subSlots) {
    // Has 15-minute granularity data
    const first = slot.subSlots.first;
    const second = slot.subSlots.second;
    
    subSlots.push({
      startTime: slot.time,
      endTime: addMinutes(slot.time, 15),
      available: first.tracks[track],
      bookingInfo: first.trackInfo[track].text || ''
    });
    
    subSlots.push({
      startTime: addMinutes(slot.time, 15),
      endTime: addMinutes(slot.time, 30),
      available: second.tracks[track],
      bookingInfo: second.trackInfo[track].text || ''
    });
  } else {
    // Standard 30-minute slot
    subSlots.push({
      startTime: slot.time,
      endTime: addMinutes(slot.time, 30),
      available: slot.tracks[track],
      bookingInfo: slot.trackInfo[track].text || ''
    });
  }
  
  return subSlots;
}

export function buildTimeBlocks(
  day: DaySchedule,
  track: TrackKey,
  minDurationMinutes?: number
): TimeBlock[] {
  const blocks: TimeBlock[] = [];
  let currentBlock: TimeBlock | null = null;

  for (const slot of day.slots) {
    const subSlots = getSubSlots(slot, track);
    
    for (const subSlot of subSlots) {
      const subSlotDuration = getDurationMinutes(subSlot.startTime, subSlot.endTime);
      
      if (!currentBlock) {
        // Start first block
        currentBlock = {
          startTime: subSlot.startTime,
          endTime: subSlot.endTime,
          durationMinutes: subSlotDuration,
          available: subSlot.available,
          bookingInfo: subSlot.bookingInfo
        };
      } else if (
        currentBlock.available === subSlot.available &&
        currentBlock.bookingInfo === subSlot.bookingInfo
      ) {
        // Extend current block (same availability status and booking info)
        currentBlock.endTime = subSlot.endTime;
        currentBlock.durationMinutes += subSlotDuration;
      } else {
        // Different status - save current and start new
        if (!minDurationMinutes || currentBlock.durationMinutes >= minDurationMinutes) {
          blocks.push(currentBlock);
        }
        currentBlock = {
          startTime: subSlot.startTime,
          endTime: subSlot.endTime,
          durationMinutes: subSlotDuration,
          available: subSlot.available,
          bookingInfo: subSlot.bookingInfo
        };
      }
    }
  }

  // Don't forget the last block
  if (currentBlock) {
    if (!minDurationMinutes || currentBlock.durationMinutes >= minDurationMinutes) {
      blocks.push(currentBlock);
    }
  }

  return blocks;
}

export function getAllTracks(): TrackKey[] {
  return ['A', 'B', 'C', 'D'];
}
