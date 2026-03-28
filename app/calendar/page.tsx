import { redirect } from 'next/navigation'

export default function CalendarPage() {
  // Calendar moved to /tasks/calendar
  redirect('/tasks/calendar')
}
