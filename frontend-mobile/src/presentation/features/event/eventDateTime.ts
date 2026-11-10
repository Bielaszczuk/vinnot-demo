const pad = (value: number) => String(value).padStart(2, "0");

export function toLocalDateTimeInput(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return [
    `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`,
  ].join("T");
}

export function parseLocalDateTime(value?: string | null): Date | null {
  if (!value?.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function localDateTimeToIso(value: string): string | null {
  const parsed = parseLocalDateTime(value);
  return parsed ? parsed.toISOString() : null;
}

export function createDefaultEventDateTimes(): {
  startDate: string;
  endDate: string;
} {
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(0);
  start.setHours(start.getHours() + 1);

  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  return {
    startDate: toLocalDateTimeInput(start.toISOString()),
    endDate: toLocalDateTimeInput(end.toISOString()),
  };
}

export function mergeDatePart(current: Date, selected: Date): Date {
  const merged = new Date(current);
  merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
  return merged;
}

export function mergeTimePart(current: Date, selected: Date): Date {
  const merged = new Date(current);
  merged.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
  return merged;
}
