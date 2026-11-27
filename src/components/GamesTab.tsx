import { useMemo, useState } from 'react';
import type { GameItem, GameStatus, PlannedStream, StreamRecord } from '../types';
import { findNextStreamDate, formatDateRu } from '../utils/format';
import { GameEditorModal } from './AdminModals';
import { GameDetailsModal } from './GameDetailsModal';

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

      {selectedGame && (
        <GameDetailsModal
          game={selectedGame}
          streams={streams}
          calendar={calendar}
          onClose={() => setSelectedGame(null)}
        />
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
