import { useState } from 'react';
import type { GameItem, GameStatus, PlannedStream } from '../types';
import { findNextStreamDate, formatDateRu } from '../utils/format';

interface GamesTabProps {
  games: GameItem[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
}

const STATUS_TABS: Array<{ id: GameStatus; label: string }> = [
  { id: 'planned', label: 'Запланировано' },
  { id: 'inprogress', label: 'В процессе' },
  { id: 'completed', label: 'Пройдено' },
];

const STATUS_LABELS: Record<GameStatus, string> = {
  planned: 'Запланировано',
  inprogress: 'В процессе',
  completed: 'Пройдено',
};

export function GamesTab({ games, calendar }: GamesTabProps) {
  const [activeStatus, setActiveStatus] = useState<GameStatus>('inprogress');

  const filtered = games.filter((g) => g.status === activeStatus);

  return (
    <div className="page-stack">
      <div className="sub-tabs-bar">
        <div className="nav-tabs sub-tabs" role="tablist" aria-label="Статус">
          {STATUS_TABS.map((tab) => {
            const count = games.filter((g) => g.status === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeStatus === tab.id}
                className={`nav-tab ${activeStatus === tab.id ? 'is-active' : ''}`}
                onClick={() => setActiveStatus(tab.id)}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-box">В разделе «{STATUS_LABELS[activeStatus]}» пока пусто.</div>
      ) : (
        <div className="games-grid">
          {filtered.map((item) => {
            const nextDate = findNextStreamDate(item, calendar);
            return (
              <article key={item.id} className="game-card">
                <div className="game-cover-wrap">
                  <img src={item.image} alt={item.name} className="game-cover" loading="lazy" />
                  <span className={`status-tag status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>

                <div className="game-body">
                  <div className="game-title-row">
                    <h3>
                      {item.name}
                      {item.year ?? ''}
                    </h3>
                    <span className={`badge ${item.source === 'twitch' ? 'badge-game' : 'badge-show'}`}>
                      {item.source === 'twitch' ? 'Игра' : 'Просмотр'}
                    </span>
                  </div>

                  {item.checkpoint && (
                    <div className="checkpoint-box">
                      <span className="checkpoint-label">Остановились:</span> {item.checkpoint}
                    </div>
                  )}

                  {nextDate ? (
                    <div className="game-date next-stream-note">
                      Скоро новый стрим: <strong>{formatDateRu(nextDate)}</strong>
                    </div>
                  ) : (
                    item.lastStreamDate && (
                      <div className="game-date">
                        Последний стрим: <strong>{formatDateRu(item.lastStreamDate)}</strong>
                      </div>
                    )
                  )}

                  {(item.vodUrl || item.boostyUrl) && (
                    <div className="game-links">
                      {item.vodUrl && (
                        <a
                          className="btn btn-sm"
                          href={item.vodUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Запись (VOD)
                        </a>
                      )}
                      {item.boostyUrl && (
                        <a
                          className="btn btn-sm btn-boosty"
                          href={item.boostyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Boosty
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
