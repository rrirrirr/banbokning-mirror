import { getCalendarData } from '@/lib/actions';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { buildTimeBlocks, getAllTracks } from '@/lib/blocks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  const startTimeParam = searchParams.get('startTime');
  const endTimeParam = searchParams.get('endTime');
  const minDurationParam = searchParams.get('minDuration');

  const minDurationMinutes = minDurationParam ? parseInt(minDurationParam, 10) : undefined;

  const data = await getCalendarData();

  // Filter by date if provided
  let filteredData = data;
  if (dateParam) {
    filteredData = data.filter(day => day.date === dateParam);
  }

  // Filter by time range if provided
  if (startTimeParam || endTimeParam) {
    filteredData = filteredData.map(day => ({
      ...day,
      slots: day.slots.filter(slot => {
        if (startTimeParam && slot.time < startTimeParam) return false;
        if (endTimeParam && slot.time >= endTimeParam) return false;
        return true;
      })
    })).filter(day => day.slots.length > 0);
  }

  let markdown = '# Banbokning Sundbyberg Calendar\n\n';

  // Add filter info
  const filters: string[] = [];
  if (dateParam) filters.push(`**Date**: ${dateParam}`);
  if (startTimeParam || endTimeParam) {
    filters.push(`**Time Range**: ${startTimeParam || '00:00'} - ${endTimeParam || '24:00'}`);
  }
  if (minDurationMinutes) {
    filters.push(`**Minimum Duration**: ${minDurationMinutes} minutes`);
  }

  if (filters.length > 0) {
    markdown += filters.join(' | ') + '\n\n';
  }

  if (!filteredData || filteredData.length === 0) {
    markdown += 'No calendar data available for the specified filters.\n';
    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  // Generate track-based block output
  for (const day of filteredData) {
    markdown += `## ${day.date}\n\n`;

    if (day.slots.length === 0) {
      markdown += '*No slots in specified time range*\n\n';
      continue;
    }

    for (const track of getAllTracks()) {
      const blocks = buildTimeBlocks(day, track, minDurationMinutes);

      if (blocks.length === 0) {
        continue;
      }

      markdown += `### Bana ${track}\n\n`;

      for (const block of blocks) {
        const status = block.available ? '✓ Available' : 'Booked';
        const durationHours = Math.floor(block.durationMinutes / 60);
        const durationMins = block.durationMinutes % 60;
        let durationStr = '';
        if (durationHours > 0) durationStr += `${durationHours}h `;
        if (durationMins > 0 || durationHours === 0) durationStr += `${durationMins}min`;

        if (block.available) {
          markdown += `- **${block.startTime} - ${block.endTime}** (${durationStr.trim()}) ${status}\n`;
        } else {
          markdown += `- **${block.startTime} - ${block.endTime}** (${durationStr.trim()}) ${status}${block.bookingInfo ? `: ${block.bookingInfo}` : ''}\n`;
        }
      }

      markdown += '\n';
    }
  }

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
