'use server';

import { fetchAndParseCalendar, DaySchedule } from './calendar';

export async function getCalendarData(): Promise<DaySchedule[]> {
  return await fetchAndParseCalendar();
}
