import { useMemo, useState } from 'react';
import type { GameItem, PlannedStream, StreamRecord } from '../types';
import {
  formatDateRu,
  formatDateTimeRu,
  formatDuration,
  groupStreamsByDate,
  normalizeForMatch,
  normalizePlannedEntries,
  parseStreamTitle,
  toDateKey,
} from '../utils/format';
import { StreamEditorModal } from './AdminModals';

interface CalendarTabProps {
  games: GameItem[];
  streams: StreamRecord[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
  isAdmin?: boolean;
  onSaveStreams?: (next: StreamRecord[]) => void;
}

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const PAGE_SIZE = 10;

export function CalendarTab({
  games,
  streams,
  calendar,
  isAdmin = false,
  onSaveStreams,
}: CalendarTabProps) {
  const [editingStream, setEditingStream] = useState<{
    item: StreamRecord | null;
    isNew: boolean;
  } | null>(null);
  const todayKey = useMemo(() => toDateKey(Date.now()), []);
  const sortedStreams = useMemo(
    () => [...streams].sort((a, b) => b.start - a.start),
    [streams],
  );
  const streamsByDate = useMemo(() => groupStreamsByDate(sortedStreams), [sortedStreams]);

  const gameImageByName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of games) {
      map[g.name.toLowerCase()] = g.image;
    }
    return map;
  }, [games]);

  const initialDate = useMemo(() => new Date(), []);

  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [brokenCovers, setBrokenCovers] = useState<Record<string, boolean>>({});

  const rawMonthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('ru-RU', {
    month: 'long',
    year: 'numeric',
  });
  const monthLabel = rawMonthLabel.charAt(0).toUpperCase() + rawMonthLabel.slice(1);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: Array<{ dateKey: string; day: number; isCurrentMonth: boolean }> = [];

    // Дни предыдущего месяца для заполнения первой недели
    const prevMonthLastDate = new Date(viewYear, viewMonth, 0);
    const prevYear = prevMonthLastDate.getFullYear();
    const prevMonth = prevMonthLastDate.getMonth();
    const prevDaysCount = prevMonthLastDate.getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      const day = prevDaysCount - i;
      const m = String(prevMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      cells.push({ dateKey: `${prevYear}-${m}-${d}`, day, isCurrentMonth: false });
    }

    // Дни текущего месяца
    for (let day = 1; day <= daysInMonth; day++) {
      const m = String(viewMonth + 1).padStart(2, '0');
      const d = String(day).padStart(2, '0');
      cells.push({ dateKey: `${viewYear}-${m}-${d}`, day, isCurrentMonth: true });
    }

    // Дни следующего месяца для завершения последней недели
    const remainder = cells.length % 7;
    if (remainder !== 0) {
      const nextMonthDate = new Date(viewYear, viewMonth + 1, 1);
      const nextYear = nextMonthDate.getFullYear();
      const nextMonth = nextMonthDate.getMonth();
      const trailing = 7 - remainder;
      for (let day = 1; day <= trailing; day++) {
        const m = String(nextMonth + 1).padStart(2, '0');
        const d = String(day).padStart(2, '0');
        cells.push({ dateKey: `${nextYear}-${m}-${d}`, day, isCurrentMonth: false });
      }
    }

    return cells;
  }, [viewYear, viewMonth]);

  const changeMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  const goToToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    setSelectedDateKey(todayKey);
  };

  const matchGameInTitle = (gameName?: string, streamTitle?: string): GameItem | undefined => {
    if (!streamTitle) return undefined;
    if (gameName && gameName.toLowerCase() !== 'just chatting') return undefined;
    const lowerTitle = streamTitle.toLowerCase();
    const normTitle = normalizeForMatch(streamTitle);
    return games.find((g) => {
      const gLower = g.name.toLowerCase();
      const gNorm = normalizeForMatch(g.name);
      return lowerTitle.includes(gLower) || (gNorm.length > 0 && normTitle.includes(gNorm));
    });
  };

  const findCover = (
    gameName?: string,
    streamTitle?: string,
    directImage?: string,
  ): string | undefined => {
    const matched = matchGameInTitle(gameName, streamTitle);
    if (matched) return matched.image;
    if (directImage) return directImage;
    if (gameName) {
      const exact = gameImageByName[gameName.toLowerCase()];
      if (exact) return exact;
      return `https://static-cdn.jtvnw.net/ttv-boxart/${encodeURIComponent(gameName)}-285x380.jpg`;
    }
    return undefined;
  };

  const selectedStreams = streamsByDate[selectedDateKey] ?? [];
  const selectedPlanned = normalizePlannedEntries(calendar[selectedDateKey]);

  const filteredHistory = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return sortedStreams;
    return sortedStreams.filter((s) => {
      const matched = matchGameInTitle(s.game, s.title);
      return (
        s.title.toLowerCase().includes(q) ||
        s.game.toLowerCase().includes(q) ||
        (matched ? matched.name.toLowerCase().includes(q) : false)
      );
    });
  }, [sortedStreams, searchQuery, games]);

  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / PAGE_SIZE));
  const safePage = Math.min(historyPage, totalPages);
  const pagedHistory = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, safePage]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setHistoryPage(1);
  };

  return (
    <div className="page-stack">
      <div className="calendar-layout">
        {/* Компактный календарь слева с миниатюрами */}
        <section className="panel cal-panel">
          <div className="panel-header">
            <h2 className="panel-title">Календарь стримов</h2>
            <button type="button" className="btn btn-sm" onClick={goToToday}>
              Сегодня
            </button>
          </div>

          <div className="cal-header">
            <button type="button" className="btn btn-sm" onClick={() => changeMonth(-1)}>
              ← Назад
            </button>
            <strong className="cal-month">{monthLabel}</strong>
            <button type="button" className="btn btn-sm" onClick={() => changeMonth(1)}>
              Вперёд →
            </button>
          </div>

          <div className="cal-weekdays">
            {WEEKDAYS.map((w, idx) => (
              <div key={w} className={`cal-weekday ${idx >= 5 ? 'is-weekend' : ''}`}>
                {w}
              </div>
            ))}
          </div>

          <div className="cal-grid">
            {calendarCells.map((cell, idx) => {
              const dayStreams = streamsByDate[cell.dateKey] ?? [];
              const dayPlans = normalizePlannedEntries(calendar[cell.dateKey]);
              const isToday = cell.dateKey === todayKey;
              const isSelected = cell.dateKey === selectedDateKey;
              const isWeekend = idx % 7 >= 5;

              const primaryTitle = dayPlans[0]?.title || dayPlans[0]?.game || dayStreams[0]?.game;
              const cover =
                dayPlans[0]?.image ||
                findCover(dayPlans[0]?.game, dayPlans[0]?.title) ||
                findCover(dayStreams[0]?.game, dayStreams[0]?.title, dayStreams[0]?.image);
              const showCover = Boolean(cover && !brokenCovers[cell.dateKey]);
              const totalCount = dayStreams.length + dayPlans.length;
              const hasEvents = totalCount > 0;

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  className={`cal-cell ${!cell.isCurrentMonth ? 'is-other-month' : ''} ${
                    isSelected ? 'is-selected' : ''
                  } ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''}`}
                >
                  <div className="cal-cell-top">
                    <span className="cal-day">{cell.day}</span>
                    {totalCount > 1 && <span className="cal-count-tag">+{totalCount - 1}</span>}
                  </div>

                  <div className="cal-thumb-wrap">
                    {showCover ? (
                      <img
                        src={cover}
                        alt={primaryTitle ?? ''}
                        className="cal-thumb-img"
                        loading="lazy"
                        onError={() =>
                          setBrokenCovers((prev) => ({ ...prev, [cell.dateKey]: true }))
                        }
                      />
                    ) : primaryTitle ? (
                      <span className="cal-thumb-text">{primaryTitle}</span>
                    ) : null}
                  </div>

                  <div className="cal-dots">
                    {dayStreams.length > 0 && <span className="dot dot-past" title="Прошедший стрим" />}
                    {dayPlans.length > 0 && <span className="dot dot-plan" title="Запланировано" />}
                  </div>

                  {hasEvents && (
                    <div className="cal-tooltip" role="tooltip">
                      {dayPlans.map((plan, pIdx) => (
                        <div key={`p-${pIdx}`} className="cal-tooltip-row is-plan">
                          <span className="cal-tooltip-tag">План:</span> {plan.title}
                        </div>
                      ))}
                      {dayStreams.map((st) => {
                        const matched = matchGameInTitle(st.game, st.title);
                        return (
                          <div key={st.id} className="cal-tooltip-row">
                            <span className="cal-tooltip-tag">Стрим:</span>{' '}
                            {matched ? `Просмотр: ${matched.name}` : st.game}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="cal-legend">
            <span>
              <span className="dot dot-past" /> Прошедший стрим
            </span>
            <span>
              <span className="dot dot-plan" /> Запланировано
            </span>
            <span>
              <span className="cal-today-sample" /> Сегодня
            </span>
          </div>
        </section>

        {/* Детали выбранного дня справа от календаря */}
        <section className="panel cal-details-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              {formatDateRu(selectedDateKey)}
              {selectedDateKey === todayKey ? ' (Сегодня)' : ''}
            </h2>
          </div>

          {selectedPlanned.length > 0 && (
            <div className="day-section">
              <div className="day-subtitle">Запланировано</div>
              {selectedPlanned.map((plan, idx) => {
                const cover =
                  plan.image || findCover(plan.game, plan.title);
                return (
                  <div key={idx} className="stream-box is-plan stream-box-row">
                    {cover && (
                      <img
                        src={cover}
                        alt={plan.title ?? ''}
                        className="stream-box-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="stream-box-body">
                      <div className="stream-title">{plan.title}</div>
                      {plan.game && !plan.title?.toLowerCase().startsWith(plan.game.toLowerCase()) && (
                        <div className="stream-cat">Категория: {plan.game}</div>
                      )}
                      {plan.source && (
                        <div className="stream-meta">
                          <span>{plan.source === 'twitch' ? 'Игра' : 'Просмотр'}</span>
                        </div>
                      )}
                      {plan.time && <div className="stream-meta">Время: {plan.time}</div>}
                      {plan.note && <div className="stream-meta">{plan.note}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedStreams.length > 0 && (
            <div className="day-section">
              <div className="day-subtitle">Прошедшие стримы</div>
              {selectedStreams.map((s) => {
                const parsed = parseStreamTitle(s.title);
                const matched = matchGameInTitle(s.game, s.title);
                const cover = findCover(s.game, s.title, s.image);
                const categoryLabel = matched
                  ? `${s.game} • Просмотр: ${matched.name}`
                  : s.game;

                return (
                  <div key={s.id} className="stream-box stream-box-row">
                    {cover && (
                      <img
                        src={cover}
                        alt={matched ? matched.name : s.game}
                        className="stream-box-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="stream-box-body">
                      <div className="admin-stream-head">
                        <div className="stream-cat">{categoryLabel}</div>
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm admin-edit-btn"
                            title="Редактировать"
                            onClick={() => setEditingStream({ item: s, isNew: false })}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                      {parsed.tags.length > 0 && (
                        <div className="stream-tags">
                          {parsed.tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="tag-badge">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="stream-title">{parsed.cleanTitle}</div>
                      <div className="stream-meta">
                        <span>{formatDateTimeRu(s.start)}</span>
                        <span>Длительность: {formatDuration(s.start, s.end)}</span>
                      </div>
                      {(s.vodUrl || s.boostyUrl) && (
                        <div className="stream-links">
                          {s.vodUrl && (
                            <a
                              className="btn btn-sm"
                              href={s.vodUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              VOD
                            </a>
                          )}
                          {s.boostyUrl && (
                            <a
                              className="btn btn-sm btn-boosty"
                              href={s.boostyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Запись на Boosty
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedPlanned.length === 0 && selectedStreams.length === 0 && (
            <p className="muted">На выбранную дату стримов нет.</p>
          )}
        </section>
      </div>

      {/* История прошедших стримов с пагинацией по 10 */}
      <section className="panel">
        <div className="panel-header">
          <h2 className="panel-title">История прошедших стримов ({filteredHistory.length})</h2>
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setEditingStream({ item: null, isNew: true })}
            >
              + Добавить
            </button>
          )}
        </div>

        <div className="history-search">
          <input
            type="text"
            className="search-input"
            placeholder="Поиск по названию стрима или категории..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="table-wrap">
          <table className="history-table">
            <thead>
              <tr>
                <th>Дата и время</th>
                <th>Категория</th>
                <th>Название стрима</th>
                <th>Длительность</th>
                <th>Запись</th>
              </tr>
            </thead>
            <tbody>
              {pagedHistory.map((s) => {
                const parsed = parseStreamTitle(s.title);
                const matched = matchGameInTitle(s.game, s.title);
                const categoryLabel = matched
                  ? `${s.game} • Просмотр: ${matched.name}`
                  : s.game;
                return (
                  <tr key={s.id}>
                    <td className="td-nowrap">{formatDateTimeRu(s.start)}</td>
                    <td className="td-cat">{categoryLabel}</td>
                    <td>
                      <div>{parsed.cleanTitle}</div>
                      {parsed.tags.length > 0 && (
                        <div className="stream-tags td-tags">
                          {parsed.tags.map((tag, idx) => (
                            <span key={`${tag}-${idx}`} className="tag-badge">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="td-nowrap">{formatDuration(s.start, s.end)}</td>
                    <td className="td-nowrap">
                      <div className="table-links">
                        {s.boostyUrl && (
                          <a
                            className="btn btn-sm btn-boosty"
                            href={s.boostyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Boosty
                          </a>
                        )}
                        {s.vodUrl && (
                          <a
                            className="btn btn-sm"
                            href={s.vodUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            VOD
                          </a>
                        )}
                        {!s.boostyUrl && !s.vodUrl && !isAdmin && <span className="muted">—</span>}
                        {isAdmin && (
                          <button
                            type="button"
                            className="btn btn-sm admin-edit-btn"
                            title="Редактировать"
                            onClick={() => setEditingStream({ item: s, isNew: false })}
                          >
                            ✎
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {pagedHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="td-empty">
                    Ничего не найдено.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <button
              type="button"
              className="btn btn-sm"
              disabled={safePage <= 1}
              onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
            >
              ← Пред.
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  className={`btn btn-sm ${page === safePage ? 'is-active' : ''}`}
                  onClick={() => setHistoryPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-sm"
              disabled={safePage >= totalPages}
              onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
            >
              След. →
            </button>
          </div>
        )}
      </section>

      {isAdmin && editingStream && (
        <StreamEditorModal
          stream={editingStream.item}
          isNew={editingStream.isNew}
          onClose={() => setEditingStream(null)}
          onSave={(saved) => {
            if (!onSaveStreams) return;
            const next = editingStream.isNew
              ? [saved, ...streams]
              : streams.map((s) => (s.id === saved.id ? saved : s));
            onSaveStreams(next);
            setEditingStream(null);
          }}
          onDelete={
            editingStream.item
              ? () => {
                  if (!onSaveStreams || !editingStream.item) return;
                  onSaveStreams(streams.filter((s) => s.id !== editingStream.item!.id));
                  setEditingStream(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
