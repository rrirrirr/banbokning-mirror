import { getCalendarData } from '@/lib/actions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function addMinutes(timeStr: string, mins: number) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + mins;
  const newH = Math.floor(total / 60);
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export async function GET() {
  const data = await getCalendarData();

  // Same filtering logic as main page
  const targetBookings: Array<{ date: string, startTime: string, endTime: string, track: string, name: string }> = [];

  data.forEach(day => {
    let currentBlocks: Record<string, { startTime: string, endTime: string, track: string, name: string }> = {};

    day.slots.forEach((slot, index) => {
      ['A', 'B', 'C', 'D'].forEach(track => {
        const t = track as 'A' | 'B' | 'C' | 'D';
        const info = slot.trackInfo[t];
        const textLower = info.text ? info.text.toLowerCase() : '';

        const isTarget = !info.available && info.text && (
          textLower.includes("westerberg") ||
          textLower.includes("westerboyz") ||
          textLower.includes("winge")
        ) && !textLower.includes("westerberg d ä") && !textLower.includes("runnqvist");

        if (isTarget) {
          if (currentBlocks[t] && currentBlocks[t].name === info.text && currentBlocks[t].endTime === slot.time) {
            currentBlocks[t].endTime = addMinutes(slot.time, 30);
          } else {
            if (currentBlocks[t]) {
              targetBookings.push({ date: day.date, ...currentBlocks[t] });
            }
            currentBlocks[t] = { startTime: slot.time, endTime: addMinutes(slot.time, 30), track: t, name: info.text };
          }
        } else {
          if (currentBlocks[t]) {
            targetBookings.push({ date: day.date, ...currentBlocks[t] });
            delete currentBlocks[t];
          }
        }
      });

      if (index === day.slots.length - 1) {
        Object.values(currentBlocks).forEach(block => {
          targetBookings.push({ date: day.date, ...block });
        });
        currentBlocks = {};
      }
    });
  });

  // Filter to only future bookings
  const now = new Date();
  const currentYMD = now.toLocaleDateString('sv-SE').split(' ')[0];
  const currentHM = now.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  const futureBookings = targetBookings.filter(b => {
    if (b.date < currentYMD) return false;
    if (b.date === currentYMD && b.endTime <= currentHM) return false;
    return true;
  }).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    if (a.startTime !== b.startTime) return a.startTime.localeCompare(b.startTime);
    return a.track.localeCompare(b.track);
  });

  let markdown = '# Bookings by Westerberg\n\n';

  if (futureBookings.length === 0) {
    markdown += 'No upcoming bookings found for Westerberg.\n';
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Group by date
  const byDate = futureBookings.reduce((acc, b) => {
    if (!acc[b.date]) acc[b.date] = [];
    acc[b.date].push(b);
    return acc;
  }, {} as Record<string, typeof futureBookings>);

  for (const [date, dateBookings] of Object.entries(byDate)) {
    markdown += `## ${date}\n\n`;
    for (const b of dateBookings) {
      markdown += `- **Bana ${b.track}**: ${b.startTime} - ${b.endTime} | ${b.name}\n`;
    }
    markdown += '\n';
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
