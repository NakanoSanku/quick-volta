export function getLocalDateAndHour(now: Date, timezone: string): { localDate: string; localHour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return { localDate: `${get('year')}-${get('month')}-${get('day')}`, localHour: Number(get('hour')) };
}
