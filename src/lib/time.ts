const DHAKA_TIMEZONE = "Asia/Dhaka";

function getDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: DHAKA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    second: map.second,
  };
}
export function nowDhakaIso(date: Date = new Date()) {
  const { year, month, day, hour, minute, second } = getDateParts(date);
  return `${year}-${month}-${day}T${hour}:${minute}:${second}+06:00`;
}

export function todayDhaka() {
  const { year, month, day } = getDateParts();
  return `${year}-${month}-${day}`;
}

export function addDaysToDateOnly(dateOnly: string, days: number) {
  const date = new Date(`${dateOnly}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
