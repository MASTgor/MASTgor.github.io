import { useMemo, useState } from 'react';
import type {
  FaqItem,
  GameItem,
  NewsItem,
  PlannedStream,
  StreamRecord,
  TwitchLiveState,
} from '../types';
import {
  findNextStreamDate,
  formatDateRu,
  formatDateTimeRu,
  formatDuration,
  normalizeForMatch,
  normalizePlannedEntries,
  parseStreamTitle,
  toDateKey,
} from '../utils/format';
import { FaqEditorModal, NewsEditorModal } from './AdminModals';
import { GameDetailsModal } from './GameDetailsModal';
import { SnakeWidget } from './SnakeWidget';

interface HomeTabProps {
  games: GameItem[];
  streams: StreamRecord[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
  news: NewsItem[];
  faq: FaqItem[];
  liveState: TwitchLiveState;
  isAdmin?: boolean;
  onSaveNews?: (next: NewsItem[]) => void;
  onSaveFaq?: (next: FaqItem[]) => void;
  onOpenDate?: (dateKey: string) => void;
}

const NEWS_PAGE_SIZE = 3;

export function HomeTab({
  games,
  streams,
  calendar,
  news,
  faq,
  liveState,
  isAdmin = false,
  onSaveNews,
  onSaveFaq,
  onOpenDate,
}: HomeTabProps) {
  const [previewError, setPreviewError] = useState(false);
  const [newsPage, setNewsPage] = useState(1);
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [editingNews, setEditingNews] = useState<{ item: NewsItem | null; isNew: boolean } | null>(
    null,
  );
  const [editingFaq, setEditingFaq] = useState<{
    item: FaqItem | null;
    idx: number;
    isNew: boolean;
  } | null>(null);

  const inProgress = games.filter((g) => g.status === 'inprogress');
  const latestStream = streams.length > 0 ? [...streams].sort((a, b) => b.start - a.start)[0] : null;

  const upcomingEntries = Object.entries(calendar)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 3);

  const sortedNews = useMemo(
    () => [...news].sort((a, b) => b.date.localeCompare(a.date)),
    [news],
  );
  const newsTotalPages = Math.max(1, Math.ceil(sortedNews.length / NEWS_PAGE_SIZE));
  const safeNewsPage = Math.min(newsPage, newsTotalPages);
  const pagedNews = useMemo(() => {
    const start = (safeNewsPage - 1) * NEWS_PAGE_SIZE;
    return sortedNews.slice(start, start + NEWS_PAGE_SIZE);
  }, [sortedNews, safeNewsPage]);

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

  const findGameForPlan = (entry: PlannedStream): GameItem | undefined => {
    if (entry.id) {
      const byId = games.find((g) => String(g.id) === String(entry.id));
      if (byId) return byId;
    }
    const targetName = (entry.game || entry.name || entry.title || '').toLowerCase();
    if (!targetName) return undefined;
    return games.find((g) => g.name.toLowerCase() === targetName);
  };

  const previewUrl =
    liveState.status === 'live'
      ? 'https://static-cdn.jtvnw.net/previews-ttv/live_user_mastgor-640x360.jpg'
      : null;

  return (
    <div className="page-stack">
      <section className="hero-card">
        <div className="hero-body">
          <div className="hero-top">
            <span className={`live-pill ${liveState.status === 'live' ? 'is-live' : ''}`}>
              <span className="live-dot" />
              {liveState.status === 'live'
                ? `В эфире${liveState.uptimeText ? ` (${liveState.uptimeText})` : ''}`
                : liveState.status === 'loading'
                  ? 'Проверка эфира...'
                  : 'Сейчас офлайн'}
            </span>
          </div>

          <p className="hero-desc">
            Маст. Стримлю пиксели, рисую эмодзи. Люблю игры нулевых и пудинг
          </p>

          <div className="hero-actions">
            <a
              className="btn btn-twitch"
              href="https://www.twitch.tv/mastgor"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twitch
            </a>
            <a
              className="btn btn-telegram"
              href="https://t.me/mastgor"
              target="_blank"
              rel="noopener noreferrer"
            >
              Telegram
            </a>
            <a
              className="btn btn-boosty"
              href="https://boosty.to/mastgor"
              target="_blank"
              rel="noopener noreferrer"
            >
              Boosty
            </a>
            <a
              className="btn btn-primary"
              href="https://www.donationalerts.com/r/mastgor"
              target="_blank"
              rel="noopener noreferrer"
            >
              DonationAlerts
            </a>
          </div>
        </div>

        {previewUrl && !previewError ? (
          <a
            className="hero-preview-wrap"
            href="https://www.twitch.tv/mastgor"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={previewUrl}
              alt="Превью стрима MASTgor"
              className="hero-preview-img"
              onError={() => setPreviewError(true)}
            />
            <span className="hero-preview-badge">LIVE</span>
          </a>
        ) : (
          <SnakeWidget />
        )}
      </section>

      <div className="home-grid">
        <div className="home-col">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Прошлый стрим</h2>
            </div>
            {latestStream ? (() => {
              const parsed = parseStreamTitle(latestStream.title);
              const streamDateKey = toDateKey(latestStream.start);
              const matchedShow = matchGameInTitle(latestStream.game, latestStream.title);
              const matchedGame =
                matchedShow ||
                games.find((g) => g.name.toLowerCase() === latestStream.game.toLowerCase());
              const cover = matchedShow?.image || latestStream.image || matchedGame?.image;
              const isShow =
                matchedShow?.source === 'kinopoisk' ||
                matchedGame?.source === 'kinopoisk' ||
                latestStream.game.toLowerCase() === 'just chatting';
              const displayCategory = matchedShow
                ? `${latestStream.game} • ${matchedShow.name}`
                : latestStream.game;

              return (
                <article
                  className="mini-card is-clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpenDate?.(streamDateKey)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenDate?.(streamDateKey);
                    }
                  }}
                >
                  {cover && (
                    <img
                      src={cover}
                      alt={displayCategory}
                      className="mini-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="mini-content">
                    <div className="mini-head">
                      <span className="mini-title">{displayCategory}</span>
                      <span className={`badge ${isShow ? 'badge-show' : 'badge-game'}`}>
                        {isShow ? 'Просмотр' : 'Игра'}
                      </span>
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
                    <div className="last-stream-title">{parsed.cleanTitle}</div>
                    <div className="mini-meta">
                      <span>{formatDateTimeRu(latestStream.start)}</span>
                      <span>Длительность: {formatDuration(latestStream.start, latestStream.end)}</span>
                    </div>
                  </div>
                </article>
              );
            })() : (
              <p className="muted">История стримов пока пуста.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Сейчас проходим и смотрим</h2>
            </div>
            {inProgress.length === 0 ? (
              <p className="muted">Пока нет активных игр или позиций для просмотра.</p>
            ) : (
              <div className="mini-list">
                {inProgress.map((item) => {
                  const nextDate = findNextStreamDate(item, calendar);
                  return (
                    <article
                      key={item.id}
                      className="mini-card is-clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedGame(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedGame(item);
                        }
                      }}
                    >
                      <img src={item.image} alt={item.name} className="mini-cover" loading="lazy" />
                      <div className="mini-content">
                        <div className="mini-head">
                          <span className="mini-title">
                            {item.name}
                            {item.year ?? ''}
                          </span>
                          <span className={`badge ${item.source === 'twitch' ? 'badge-game' : 'badge-show'}`}>
                            {item.source === 'twitch' ? 'Игра' : 'Просмотр'}
                          </span>
                        </div>

                        {item.checkpoint && (
                          <div className="checkpoint-box">
                            <span className="checkpoint-label">Остановились:</span> {item.checkpoint}
                          </div>
                        )}

                        <div className="mini-meta">
                          {nextDate ? (
                            <span className="next-stream-note">
                              Скоро новый стрим: <strong>{formatDateRu(nextDate)}</strong>
                            </span>
                          ) : (
                            item.lastStreamDate && (
                              <span>Последний стрим: {formatDateRu(item.lastStreamDate)}</span>
                            )
                          )}
                          <div className="mini-links" onClick={(e) => e.stopPropagation()}>
                            {item.vodUrl && (
                              <a href={item.vodUrl} target="_blank" rel="noopener noreferrer">
                                VOD
                              </a>
                            )}
                            {item.boostyUrl && (
                              <a href={item.boostyUrl} target="_blank" rel="noopener noreferrer">
                                Boosty
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <div className="home-col">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Запланировано</h2>
            </div>
            {upcomingEntries.length === 0 ? (
              <p className="muted">
                Расписание на ближайшие дни пока не заполнено — список есть во вкладке «Игры и просмотр».
              </p>
            ) : (
              <div className="mini-list">
                {upcomingEntries.map(([dateKey, raw]) => {
                  const items = normalizePlannedEntries(raw);
                  return items.map((entry, idx) => {
                    const matchedGame = findGameForPlan(entry);
                    const cover = entry.image || matchedGame?.image;
                    const source = entry.source || matchedGame?.source || 'twitch';
                    const isShow = source === 'kinopoisk';
                    return (
                      <article
                        key={`${dateKey}-${idx}`}
                        className="mini-card is-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenDate?.(dateKey)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenDate?.(dateKey);
                          }
                        }}
                      >
                        {cover && (
                          <img
                            src={cover}
                            alt={entry.title || ''}
                            className="mini-cover"
                            loading="lazy"
                          />
                        )}
                        <div className="mini-content">
                          <div className="mini-head">
                            <span className="mini-title">{entry.title}</span>
                            <span className={`badge ${isShow ? 'badge-show' : 'badge-game'}`}>
                              {isShow ? 'Просмотр' : 'Игра'}
                            </span>
                          </div>
                          {entry.note && <div className="checkpoint-box">{entry.note}</div>}
                          <div className="mini-meta">
                            <span className="next-stream-note">
                              Запланировано: <strong>{formatDateRu(dateKey)}</strong>
                            </span>
                            {entry.time && <span>Время: {entry.time}</span>}
                          </div>
                        </div>
                      </article>
                    );
                  });
                })}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Новости</h2>
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => setEditingNews({ item: null, isNew: true })}
                >
                  + Добавить
                </button>
              )}
            </div>
            {pagedNews.length === 0 ? (
              <p className="muted">Новостей пока нет.</p>
            ) : (
              <>
                <div className="news-list">
                  {pagedNews.map((item) => (
                    <article key={item.id} className="news-item">
                      <div className="news-head">
                        <strong>{item.title}</strong>
                        <div className="admin-inline-actions">
                          <span className="news-date">{formatDateRu(item.date)}</span>
                          {isAdmin && (
                            <button
                              type="button"
                              className="btn btn-sm admin-edit-btn"
                              title="Редактировать"
                              onClick={() => setEditingNews({ item, isNew: false })}
                            >
                              ✎
                            </button>
                          )}
                        </div>
                      </div>
                      <p>{item.text}</p>
                    </article>
                  ))}
                </div>
                {newsTotalPages > 1 && (
                  <div className="pagination-bar news-pagination">
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={safeNewsPage <= 1}
                      onClick={() => setNewsPage((p) => Math.max(1, p - 1))}
                    >
                      ←
                    </button>
                    <span className="news-page-info">
                      {safeNewsPage} / {newsTotalPages}
                    </span>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={safeNewsPage >= newsTotalPages}
                      onClick={() => setNewsPage((p) => Math.min(newsTotalPages, p + 1))}
                    >
                      →
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {(faq.length > 0 || isAdmin) && (
        <>
          <div className="retro-divider" aria-hidden="true">
            {Array.from({ length: 24 }, (_, idx) => {
              const cls =
                idx < 8 ? 'retro-cell on' : idx === 8 ? 'retro-cell on tip' : 'retro-cell';
              return <span key={idx} className={cls} />;
            })}
          </div>
          <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Мини-FAQ</h2>
            {isAdmin && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => setEditingFaq({ item: null, idx: -1, isNew: true })}
              >
                + Добавить
              </button>
            )}
          </div>
          <div className="faq-grid">
            {faq.map((item, idx) => (
              <article key={idx} className="faq-card">
                <div className="admin-faq-head">
                  <h3 className="faq-q">{item.q}</h3>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-sm admin-edit-btn"
                      title="Редактировать"
                      onClick={() => setEditingFaq({ item, idx, isNew: false })}
                    >
                      ✎
                    </button>
                  )}
                </div>
                <p className="faq-a">{item.a}</p>
              </article>
            ))}
          </div>
        </section>
        </>
      )}

      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          streams={streams}
          calendar={calendar}
          onClose={() => setSelectedGame(null)}
        />
      )}

      {isAdmin && editingNews && (
        <NewsEditorModal
          item={editingNews.item}
          isNew={editingNews.isNew}
          onClose={() => setEditingNews(null)}
          onSave={(saved) => {
            if (!onSaveNews) return;
            const next = editingNews.isNew
              ? [saved, ...news]
              : news.map((n) => (n.id === saved.id ? saved : n));
            onSaveNews(next);
            setEditingNews(null);
          }}
          onDelete={
            editingNews.item
              ? () => {
                  if (!onSaveNews || !editingNews.item) return;
                  onSaveNews(news.filter((n) => n.id !== editingNews.item!.id));
                  setEditingNews(null);
                }
              : undefined
          }
        />
      )}

      {isAdmin && editingFaq && (
        <FaqEditorModal
          item={editingFaq.item}
          isNew={editingFaq.isNew}
          onClose={() => setEditingFaq(null)}
          onSave={(saved) => {
            if (!onSaveFaq) return;
            const next = editingFaq.isNew
              ? [...faq, saved]
              : faq.map((f, i) => (i === editingFaq.idx ? saved : f));
            onSaveFaq(next);
            setEditingFaq(null);
          }}
          onDelete={
            !editingFaq.isNew
              ? () => {
                  if (!onSaveFaq) return;
                  onSaveFaq(faq.filter((_, i) => i !== editingFaq.idx));
                  setEditingFaq(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
