import { useEffect, useMemo } from 'react';
import type { GameItem, GameStatus, PlannedStream, StreamRecord } from '../types';
import {
  formatDateRu,
  formatDateTimeRu,
  formatDuration,
  formatTotalDuration,
  matchPlannedForGame,
  matchStreamsForGame,
  parseStreamTitle,
} from '../utils/format';

const STATUS_LABELS: Record<GameStatus, string> = {
  planned: 'Запланировано',
  inprogress: 'В процессе',
  completed: 'Пройдено',
};

interface GameDetailsModalProps {
  game: GameItem;
  streams: StreamRecord[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
  onClose: () => void;
}

export function GameDetailsModal({ game, streams, calendar, onClose }: GameDetailsModalProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const modalStreams = useMemo(() => matchStreamsForGame(game, streams), [game, streams]);
  const modalPlanned = useMemo(() => matchPlannedForGame(game, calendar), [game, calendar]);
  const modalTotalMs = useMemo(
    () => modalStreams.reduce((acc, s) => acc + Math.max(0, s.end - s.start), 0),
    [modalStreams],
  );

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
      onClick={onClose}
    >
      <div className="panel modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <h2 className="panel-title">
            {game.name}
            {game.year ?? ''}
          </h2>
          <button type="button" className="btn btn-sm" onClick={onClose} aria-label="Закрыть">
            ×
          </button>
        </div>

        <div className="modal-top">
          <div className="modal-cover-wrap">
            <img src={game.image} alt={game.name} className="modal-cover" />
          </div>

          <div className="modal-info">
            <div className="modal-badges">
              <span className={`badge ${game.source === 'twitch' ? 'badge-game' : 'badge-show'}`}>
                {game.source === 'twitch' ? 'Игра' : 'Просмотр'}
              </span>
              <span className="badge">{STATUS_LABELS[game.status]}</span>
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

            {game.checkpoint && (
              <div className="checkpoint-box">
                <span className="checkpoint-label">Остановились:</span> {game.checkpoint}
              </div>
            )}

            {(game.vodUrl || game.boostyUrl) && (
              <div className="game-links">
                {game.vodUrl && (
                  <a
                    className="btn btn-sm"
                    href={game.vodUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Запись (VOD)
                  </a>
                )}
                {game.boostyUrl && (
                  <a
                    className="btn btn-sm btn-boosty"
                    href={game.boostyUrl}
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
  );
}
