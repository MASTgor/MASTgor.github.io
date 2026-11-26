import type { PlannedStream, StreamRecord, TwitchLiveState } from '../types';

export function toDateKey(timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function formatDateRu(dateInput: string | number): string {
  const d = typeof dateInput === 'number' ? new Date(dateInput) : new Date(`${dateInput}T12:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTimeRu(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(startMs: number, endMs: number): string {
  const totalMinutes = Math.max(1, Math.round((endMs - startMs) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function formatTotalDuration(totalMs: number): string {
  const totalMinutes = Math.max(0, Math.round(totalMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} мин`;
  if (minutes === 0) return `${hours} ч`;
  return `${hours} ч ${minutes} мин`;
}

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9]+/gi, ' ')
    .replace(/(^|\s)и(\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchStreamsForGame(
  item: { name: string; dateFrom?: string; dateTo?: string },
  streams: StreamRecord[],
): StreamRecord[] {
  const lowerName = item.name.toLowerCase();
  const normName = normalizeForMatch(item.name);
  return streams
    .filter((s) => {
      const lowerTitle = s.title.toLowerCase();
      const normTitle = normalizeForMatch(s.title);
      const nameMatch =
        s.game.toLowerCase() === lowerName ||
        (s.game.toLowerCase() === 'just chatting' &&
          (lowerTitle.includes(lowerName) || (normName.length > 0 && normTitle.includes(normName))));
      if (!nameMatch) return false;
      const dateKey = toDateKey(s.start);
      if (item.dateFrom && dateKey < item.dateFrom) return false;
      if (item.dateTo && dateKey > item.dateTo) return false;
      return true;
    })
    .sort((a, b) => b.start - a.start);
}

export function normalizePlannedEntries(
  raw: PlannedStream[] | PlannedStream | string | undefined,
): PlannedStream[] {
  if (!raw) return [];
  if (typeof raw === 'string') return [{ title: raw }];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.map((item) => ({
    ...item,
    title: item.title || (item.name ? `${item.name}${item.year ?? ''}` : 'Запланированный стрим'),
    game: item.game || item.name,
  }));
}

export function groupStreamsByDate(streams: StreamRecord[]): Record<string, StreamRecord[]> {
  const map: Record<string, StreamRecord[]> = {};
  for (const stream of streams) {
    const key = toDateKey(stream.start);
    if (!map[key]) map[key] = [];
    map[key].push(stream);
  }
  return map;
}

export function parseStreamTitle(rawTitle: string): { cleanTitle: string; tags: string[] } {
  const titleStr = String(rawTitle || '');
  const tagRegex = /\[(.*?)\]/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(titleStr)) !== null) {
    const t = match[1].trim();
    if (t) tags.push(t);
  }

  const withoutTags = titleStr.replace(tagRegex, '').trim();
  const parts = withoutTags
    .split('|')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(![\p{L}\p{N}_]+\s*)+$/u.test(s));

  return {
    cleanTitle: parts.join(' • ') || withoutTags || 'Без описания',
    tags,
  };
}

export function matchPlannedForGame(
  item: { id: string; name: string },
  calendar: Record<string, PlannedStream[] | PlannedStream | string>,
): Array<{ dateKey: string; plan: PlannedStream }> {
  const todayKey = toDateKey(Date.now());
  const lowerName = item.name.toLowerCase();
  const normName = normalizeForMatch(item.name);
  const result: Array<{ dateKey: string; plan: PlannedStream }> = [];

  for (const dateKey of Object.keys(calendar).sort()) {
    if (dateKey < todayKey) continue;
    const entries = normalizePlannedEntries(calendar[dateKey]);
    for (const p of entries) {
      const matches =
        (p.id && String(p.id) === String(item.id)) ||
        (p.game && p.game.toLowerCase() === lowerName) ||
        (p.name && p.name.toLowerCase() === lowerName) ||
        (p.title &&
          (p.title.toLowerCase().includes(lowerName) ||
            (normName.length > 0 && normalizeForMatch(p.title).includes(normName))));
      if (matches) {
        result.push({ dateKey, plan: p });
      }
    }
  }
  return result;
}

export function findNextStreamDate(
  item: { id: string; name: string },
  calendar: Record<string, PlannedStream[] | PlannedStream | string>,
): string | undefined {
  const todayKey = toDateKey(Date.now());
  const lowerName = item.name.toLowerCase();
  const matchingDates = Object.keys(calendar)
    .filter((dateKey) => dateKey >= todayKey)
    .sort()
    .filter((dateKey) => {
      const entries = normalizePlannedEntries(calendar[dateKey]);
      return entries.some(
        (p) =>
          (p.id && String(p.id) === String(item.id)) ||
          (p.game && p.game.toLowerCase() === lowerName) ||
          (p.name && p.name.toLowerCase() === lowerName) ||
          (p.title && p.title.toLowerCase().includes(lowerName)),
      );
    });
  return matchingDates[0];
}

export async function fetchTwitchLiveStatus(channel: string): Promise<TwitchLiveState> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://decapi.me/twitch/uptime/${encodeURIComponent(channel)}`, {
      signal: controller.signal,
    });
    if (!res.ok) return { status: 'offline' };
    const text = (await res.text()).trim();
    const lower = text.toLowerCase();
    if (!text || lower.includes('offline') || lower.includes('not found') || lower.includes('error')) {
      return { status: 'offline' };
    }
    return { status: 'live', uptimeText: text };
  } catch {
    return { status: 'offline' };
  } finally {
    window.clearTimeout(timer);
  }
}
