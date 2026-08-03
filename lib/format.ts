/** Money is stored in minor units; render it in the business currency. */
export function formatMoney(minorUnits: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

export function formatDate(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: timezone,
  }).format(date);
}

export function formatTime(date: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: timezone,
  }).format(date);
}

export function formatRelativeDay(date: Date, timezone: string) {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.floor((now.getTime() - date.getTime()) / dayMs);
  if (diff <= 0) return `Today, ${formatTime(date, timezone)}`;
  if (diff === 1) return `Yesterday, ${formatTime(date, timezone)}`;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(date);
}
