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
  normalizePlannedEntries,
  parseStreamTitle,
} from '../utils/format';

interface HomeTabProps {
  games: GameItem[];
  streams: StreamRecord[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
  news: NewsItem[];
  faq: FaqItem[];
  liveState: TwitchLiveState;
}

const NEWS_PAGE_SIZE = 3;

export function HomeTab({ games, streams, calendar, news, faq, liveState }: HomeTabProps) {
  const [previewError, setPreviewError] = useState(false);
  const [newsPage, setNewsPage] = useState(1);

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

        {previewUrl && !previewError && (
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
        )}
      </section>

      <div className="home-grid">
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
                  <article key={item.id} className="mini-card">
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
                        <div className="mini-links">
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

        <div className="home-side">
          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Последний стрим</h2>
            </div>
            {latestStream ? (() => {
              const parsed = parseStreamTitle(latestStream.title);
              return (
                <div className="last-stream-box">
                  <div className="last-stream-game">{latestStream.game}</div>
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
                  <div className="last-stream-meta">
                    <span>{formatDateTimeRu(latestStream.start)}</span>
                    <span>Длительность: {formatDuration(latestStream.start, latestStream.end)}</span>
                  </div>
                </div>
              );
            })() : (
              <p className="muted">История стримов пока пуста.</p>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Ближайшие планы</h2>
            </div>
            {upcomingEntries.length === 0 ? (
              <p className="muted">
                Расписание на ближайшие дни пока не заполнено — список есть во вкладке «Игры и просмотр».
              </p>
            ) : (
              <ul className="plan-list">
                {upcomingEntries.map(([dateKey, raw]) => {
                  const items = normalizePlannedEntries(raw);
                  return items.map((entry, idx) => (
                    <li key={`${dateKey}-${idx}`} className="plan-row">
                      <span className="plan-date">{formatDateRu(dateKey)}</span>
                      <span>{entry.title}</span>
                    </li>
                  ));
                })}
              </ul>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2 className="panel-title">Новости канала</h2>
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
                        <span className="news-date">{formatDateRu(item.date)}</span>
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

      {faq.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Мини-FAQ</h2>
          </div>
          <div className="faq-grid">
            {faq.map((item, idx) => (
              <article key={idx} className="faq-card">
                <h3 className="faq-q">{item.q}</h3>
                <p className="faq-a">{item.a}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
