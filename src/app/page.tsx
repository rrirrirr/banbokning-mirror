import CalendarClient from '@/components/CalendarClient';
import { getCalendarData } from '@/lib/actions';

// We want to force dynamic rendering so the calendar is always fresh
export const dynamic = 'force-dynamic';

export default async function Home() {
  const data = await getCalendarData();
  
  return <CalendarClient initialData={data} />;
}
