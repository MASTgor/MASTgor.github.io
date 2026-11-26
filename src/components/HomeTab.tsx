import { useState } from 'react';
import type { GameItem, PlannedStream, StreamRecord, TwitchLiveState } from '../types';
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
  liveState: TwitchLiveState;
}

const CHANNEL_NEWS = [
  {
    date: '26.11.2026',
    title: 'Запустили сайт канала',
    text: 'Теперь здесь можно следить за текущими прохождениями, смотреть момент остановки и проверять календарь с историей стримов.',
  },
  {
    date: 'Скоро',
    title: 'Записи прохождений на Boosty',
    text: 'Готовим архив полных прохождений для Boosty — ссылки будут появляться прямо на карточках игр.',
  },
];

export function HomeTab({ games, streams, calendar, liveState }: HomeTabProps) {
  const [previewError, setPreviewError] = useState(false);

  const inProgress = games.filter((g) => g.status === 'inprogress');
  const latestStream = streams.length > 0 ? [...streams].sort((a, b) => b.start - a.start)[0] : null;

  const upcomingEntries = Object.entries(calendar)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 3);

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
            <div className="news-list">
              {CHANNEL_NEWS.map((news) => (
                <article key={news.title} className="news-item">
                  <div className="news-head">
                    <strong>{news.title}</strong>
                    <span className="news-date">{news.date}</span>
                  </div>
                  <p>{news.text}</p>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
