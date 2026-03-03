import { getCalendarData } from '@/lib/actions';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = await getCalendarData();
  
  let markdown = '# Banbokning Sundbyberg Calendar\n\n';
  markdown += 'This is the unrendered markdown view of the current booking calendar.\n\n';

  if (!data || data.length === 0) {
    markdown += 'No calendar data available.\n';
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  for (const day of data) {
    markdown += `## ${day.date}\n\n`;
    
    const availableSlots = day.slots.filter(s => s.tracks.A || s.tracks.B || s.tracks.C || s.tracks.D);
    
    if (availableSlots.length === 0) {
      markdown += '*Fully booked*\n\n';
      continue;
    }

    markdown += '| Time | Track A | Track B | Track C | Track D |\n';
    markdown += '|---|---|---|---|---|\n';
    
    for (const slot of day.slots) {
      const a = slot.tracks.A ? 'Available' : 'Booked';
      const b = slot.tracks.B ? 'Available' : 'Booked';
      const c = slot.tracks.C ? 'Available' : 'Booked';
      const d = slot.tracks.D ? 'Available' : 'Booked';
      
      markdown += `| ${slot.time} | ${a} | ${b} | ${c} | ${d} |\n`;
    }
    
    markdown += '\n';
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
