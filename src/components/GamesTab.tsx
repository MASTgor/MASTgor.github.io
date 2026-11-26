import { useEffect, useMemo, useState } from 'react';
import type { GameItem, GameStatus, PlannedStream, StreamRecord } from '../types';
import {
  findNextStreamDate,
  formatDateRu,
  formatDateTimeRu,
  formatDuration,
  formatTotalDuration,
  matchPlannedForGame,
  matchStreamsForGame,
  parseStreamTitle,
} from '../utils/format';
import { GameEditorModal } from './AdminModals';

interface GamesTabProps {
  games: GameItem[];
  streams: StreamRecord[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
  isAdmin?: boolean;
  onSaveGames?: (next: GameItem[]) => void;
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

export function GamesTab({
  games,
  streams,
  calendar,
  isAdmin = false,
  onSaveGames,
}: GamesTabProps) {
  const [activeStatus, setActiveStatus] = useState<GameStatus>('inprogress');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameItem | null>(null);
  const [editingGame, setEditingGame] = useState<{ item: GameItem | null; isNew: boolean } | null>(
    null,
  );

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return games.filter((g) => {
      if (g.status !== activeStatus) return false;
      if (!q) return true;
      return (
        g.name.toLowerCase().includes(q) ||
        (g.checkpoint && g.checkpoint.toLowerCase().includes(q))
      );
    });
  }, [games, activeStatus, searchQuery]);

  useEffect(() => {
    if (!selectedGame) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedGame(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedGame]);

  const modalStreams = useMemo(
    () => (selectedGame ? matchStreamsForGame(selectedGame, streams) : []),
    [selectedGame, streams],
  );

  const modalPlanned = useMemo(
    () => (selectedGame ? matchPlannedForGame(selectedGame, calendar) : []),
    [selectedGame, calendar],
  );

  const modalTotalMs = useMemo(
    () => modalStreams.reduce((acc, s) => acc + Math.max(0, s.end - s.start), 0),
    [modalStreams],
  );

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

        <div className="admin-toolbar-right">
          <input
            type="text"
            className="search-input games-search-input"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isAdmin && (
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setEditingGame({ item: null, isNew: true })}
            >
              + Добавить
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-box">В разделе «{STATUS_LABELS[activeStatus]}» пока пусто.</div>
      ) : (
        <div className="games-grid">
          {filtered.map((item) => {
            const nextDate = findNextStreamDate(item, calendar);
            return (
              <article
                key={item.id}
                className="game-card is-clickable"
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
                <div className="game-cover-wrap">
                  <img src={item.image} alt={item.name} className="game-cover" loading="lazy" />
                  <span className={`status-tag status-${item.status}`}>
                    {STATUS_LABELS[item.status]}
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn btn-sm admin-card-edit"
                      title="Редактировать"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGame({ item, isNew: false });
                      }}
                    >
                      ✎
                    </button>
                  )}
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
                    <div className="game-links" onClick={(e) => e.stopPropagation()}>
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

      {/* Модальная карточка игры/просмотра */}
      {selectedGame && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={selectedGame.name}
          onClick={() => setSelectedGame(null)}
        >
          <div className="panel modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="panel-header">
              <h2 className="panel-title">
                {selectedGame.name}
                {selectedGame.year ?? ''}
              </h2>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setSelectedGame(null)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <div className="modal-top">
              <div className="modal-cover-wrap">
                <img
                  src={selectedGame.image}
                  alt={selectedGame.name}
                  className="modal-cover"
                />
              </div>

              <div className="modal-info">
                <div className="modal-badges">
                  <span
                    className={`badge ${selectedGame.source === 'twitch' ? 'badge-game' : 'badge-show'}`}
                  >
                    {selectedGame.source === 'twitch' ? 'Игра' : 'Просмотр'}
                  </span>
                  <span className="badge">{STATUS_LABELS[selectedGame.status]}</span>
                </div>

                <div className="modal-stats">
                  <div className="modal-stat-box">
                    <span className="modal-stat-label">Стримов</span>
                    <strong className="modal-stat-val">{modalStreams.length}</strong>
                  </div>
                  <div className="modal-stat-box">
                    <span className="modal-stat-label">Всего времени</span>
                    <strong className="modal-stat-val">
                      {modalStreams.length > 0 ? formatTotalDuration(modalTotalMs) : '0 мин'}
                    </strong>
                  </div>
                </div>

                {selectedGame.checkpoint && (
                  <div className="checkpoint-box">
                    <span className="checkpoint-label">Остановились:</span> {selectedGame.checkpoint}
                  </div>
                )}

                {(selectedGame.vodUrl || selectedGame.boostyUrl) && (
                  <div className="game-links">
                    {selectedGame.vodUrl && (
                      <a
                        className="btn btn-sm"
                        href={selectedGame.vodUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Запись (VOD)
                      </a>
                    )}
                    {selectedGame.boostyUrl && (
                      <a
                        className="btn btn-sm btn-boosty"
                        href={selectedGame.boostyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Boosty
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {modalPlanned.length > 0 && (
              <div className="modal-streams">
                <div className="day-subtitle">Запланировано ({modalPlanned.length})</div>
                <div className="modal-streams-list">
                  {modalPlanned.map(({ dateKey, plan }, idx) => (
                    <div key={`${dateKey}-${idx}`} className="stream-box is-plan">
                      <div className="stream-title">{plan.title}</div>
                      <div className="stream-meta">
                        <span>Дата: {formatDateRu(dateKey)}</span>
                        {plan.time && <span>Время: {plan.time}</span>}
                      </div>
                      {plan.note && <div className="stream-meta">{plan.note}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="modal-streams">
              <div className="day-subtitle">Прошедшие стримы ({modalStreams.length})</div>
              {modalStreams.length === 0 ? (
                <p className="muted">Стримов по этой категории пока не было.</p>
              ) : (
                <div className="modal-streams-list">
                  {modalStreams.map((s) => {
                    const parsed = parseStreamTitle(s.title);
                    return (
                      <div key={s.id} className="stream-box">
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
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isAdmin && editingGame && (
        <GameEditorModal
          game={editingGame.item}
          isNew={editingGame.isNew}
          onClose={() => setEditingGame(null)}
          onSave={(saved) => {
            if (!onSaveGames) return;
            const next = editingGame.isNew
              ? [saved, ...games]
              : games.map((g) => (g.id === editingGame.item?.id ? saved : g));
            onSaveGames(next);
            setEditingGame(null);
          }}
          onDelete={
            editingGame.item
              ? () => {
                  if (!onSaveGames || !editingGame.item) return;
                  onSaveGames(games.filter((g) => g.id !== editingGame.item!.id));
                  setEditingGame(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
