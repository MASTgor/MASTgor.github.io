import { useEffect, useState } from 'react';
import type { FaqItem, GameItem, GameSource, GameStatus, NewsItem, StreamRecord } from '../types';

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface GameEditorModalProps {
  game: GameItem | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: GameItem) => void;
  onDelete?: () => void;
}

export function GameEditorModal({
  game,
  isNew,
  onClose,
  onSave,
  onDelete,
}: GameEditorModalProps) {
  const [draft, setDraft] = useState<GameItem>(
    () =>
      game || {
        id: String(Date.now()),
        name: '',
        year: '',
        image: '',
        source: 'twitch',
        status: 'planned',
      },
  );

  const [apiSource, setApiSource] = useState<GameSource>('twitch');
  const [apiQuery, setApiQuery] = useState('');
  const [apiResults, setApiResults] = useState<
    Array<{ id: string; name: string; year: string; image: string; source: GameSource }>
  >([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const runSearch = async () => {
    if (apiQuery.trim().length < 2) return;
    setSearching(true);
    try {
      const res = await fetch(
        `/api/search?source=${encodeURIComponent(apiSource)}&q=${encodeURIComponent(apiQuery.trim())}`,
      );
      const data = await res.json();
      setApiResults(data.items || []);
    } catch {
      setApiResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    const cleaned: GameItem = {
      id: draft.id.trim() || String(Date.now()),
      name: draft.name.trim(),
      image: draft.image.trim(),
      source: draft.source,
      status: draft.status,
      ...(draft.year?.trim() ? { year: draft.year.trim() } : { year: '' }),
      ...(draft.checkpoint?.trim() ? { checkpoint: draft.checkpoint.trim() } : {}),
      ...(draft.dateFrom?.trim() ? { dateFrom: draft.dateFrom.trim() } : {}),
      ...(draft.dateTo?.trim() ? { dateTo: draft.dateTo.trim() } : {}),
      ...(draft.lastStreamDate?.trim() ? { lastStreamDate: draft.lastStreamDate.trim() } : {}),
      ...(draft.vodUrl?.trim() ? { vodUrl: draft.vodUrl.trim() } : {}),
      ...(draft.boostyUrl?.trim() ? { boostyUrl: draft.boostyUrl.trim() } : {}),
    };
    onSave(cleaned);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="panel modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="panel-header">
          <h2 className="panel-title">{isNew ? 'Добавить категорию' : 'Редактировать'}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        {isNew && (
          <div className="admin-search-box">
            <div className="admin-search-row">
              <select
                className="admin-input"
                value={apiSource}
                onChange={(e) => setApiSource(e.target.value as GameSource)}
              >
                <option value="twitch">Игра (Twitch)</option>
                <option value="kinopoisk">Просмотр (Кинопоиск)</option>
              </select>
              <input
                className="admin-input"
                placeholder="Быстрый поиск (от 2 букв)..."
                value={apiQuery}
                onChange={(e) => setApiQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    runSearch();
                  }
                }}
              />
              <button type="button" className="btn btn-sm btn-primary" onClick={runSearch}>
                {searching ? '...' : 'Найти'}
              </button>
            </div>
            {apiResults.length > 0 && (
              <div className="admin-search-results">
                {apiResults.map((it) => (
                  <button
                    key={`${it.source}-${it.id}`}
                    type="button"
                    className="admin-search-pick"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        id: it.id,
                        name: it.name,
                        year: it.year,
                        image: it.image,
                        source: it.source,
                      }));
                      setApiResults([]);
                    }}
                  >
                    {it.image && <img src={it.image} alt="" className="admin-pick-img" />}
                    <span>
                      {it.name}
                      {it.year}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Название *</span>
            <input
              className="admin-input"
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Год</span>
            <input
              className="admin-input"
              value={draft.year || ''}
              onChange={(e) => setDraft({ ...draft, year: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Тип</span>
            <select
              className="admin-input"
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value as GameSource })}
            >
              <option value="twitch">Игра</option>
              <option value="kinopoisk">Просмотр</option>
            </select>
          </label>
          <label className="admin-field">
            <span>Статус</span>
            <select
              className="admin-input"
              value={draft.status}
              onChange={(e) => setDraft({ ...draft, status: e.target.value as GameStatus })}
            >
              <option value="planned">Запланировано</option>
              <option value="inprogress">В процессе</option>
              <option value="completed">Пройдено</option>
            </select>
          </label>
          <label className="admin-field admin-col-2">
            <span>Остановились (чекпоинт)</span>
            <input
              className="admin-input"
              value={draft.checkpoint || ''}
              onChange={(e) => setDraft({ ...draft, checkpoint: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Стримы с (YYYY-MM-DD)</span>
            <input
              className="admin-input"
              value={draft.dateFrom || ''}
              onChange={(e) => setDraft({ ...draft, dateFrom: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Стримы по (YYYY-MM-DD)</span>
            <input
              className="admin-input"
              value={draft.dateTo || ''}
              onChange={(e) => setDraft({ ...draft, dateTo: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Ссылка на Boosty</span>
            <input
              className="admin-input"
              value={draft.boostyUrl || ''}
              onChange={(e) => setDraft({ ...draft, boostyUrl: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Ссылка на VOD</span>
            <input
              className="admin-input"
              value={draft.vodUrl || ''}
              onChange={(e) => setDraft({ ...draft, vodUrl: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Обложка (URL)</span>
            <input
              className="admin-input"
              value={draft.image}
              onChange={(e) => setDraft({ ...draft, image: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-modal-footer">
          {!isNew && onDelete ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              Удалить
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-sm btn-primary">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

interface StreamEditorModalProps {
  stream: StreamRecord | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: StreamRecord) => void;
  onDelete?: () => void;
}

export function StreamEditorModal({
  stream,
  isNew,
  onClose,
  onSave,
  onDelete,
}: StreamEditorModalProps) {
  const [draft, setDraft] = useState<StreamRecord>(() => {
    if (stream) return { ...stream };
    const now = Date.now();
    return {
      id: `manual_${now}`,
      start: now - 3600000,
      end: now,
      title: '',
      game: 'Just Chatting',
      image: '',
    };
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.game.trim() || !draft.title.trim()) return;
    onSave({
      id: draft.id,
      start: draft.start,
      end: draft.end,
      game: draft.game.trim(),
      title: draft.title.trim(),
      ...(draft.image?.trim() ? { image: draft.image.trim() } : {}),
      ...(draft.vodUrl?.trim() ? { vodUrl: draft.vodUrl.trim() } : {}),
      ...(draft.boostyUrl?.trim() ? { boostyUrl: draft.boostyUrl.trim() } : {}),
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="panel modal-panel" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="panel-header">
          <h2 className="panel-title">{isNew ? 'Добавить стрим' : 'Редактировать стрим'}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field admin-col-2">
            <span>Категория *</span>
            <input
              className="admin-input"
              required
              value={draft.game}
              onChange={(e) => setDraft({ ...draft, game: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Название стрима *</span>
            <input
              className="admin-input"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Начало</span>
            <input
              type="datetime-local"
              className="admin-input"
              value={toDatetimeLocal(draft.start)}
              onChange={(e) =>
                setDraft({ ...draft, start: new Date(e.target.value).getTime() || draft.start })
              }
            />
          </label>
          <label className="admin-field">
            <span>Конец</span>
            <input
              type="datetime-local"
              className="admin-input"
              value={toDatetimeLocal(draft.end)}
              onChange={(e) =>
                setDraft({ ...draft, end: new Date(e.target.value).getTime() || draft.end })
              }
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Ссылка на Boosty</span>
            <input
              className="admin-input"
              value={draft.boostyUrl || ''}
              onChange={(e) => setDraft({ ...draft, boostyUrl: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Ссылка на VOD</span>
            <input
              className="admin-input"
              value={draft.vodUrl || ''}
              onChange={(e) => setDraft({ ...draft, vodUrl: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Обложка (URL)</span>
            <input
              className="admin-input"
              value={draft.image || ''}
              onChange={(e) => setDraft({ ...draft, image: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-modal-footer">
          {!isNew && onDelete ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              Удалить
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-sm btn-primary">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

interface NewsEditorModalProps {
  item: NewsItem | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: NewsItem) => void;
  onDelete?: () => void;
}

export function NewsEditorModal({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: NewsEditorModalProps) {
  const [draft, setDraft] = useState<NewsItem>(
    () =>
      item || {
        id: `news_${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        title: '',
        text: '',
      },
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="panel modal-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim()) return;
          onSave(draft);
        }}
      >
        <div className="panel-header">
          <h2 className="panel-title">{isNew ? 'Добавить новость' : 'Редактировать новость'}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field">
            <span>Заголовок *</span>
            <input
              className="admin-input"
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label className="admin-field">
            <span>Дата</span>
            <input
              type="date"
              className="admin-input"
              value={draft.date}
              onChange={(e) => setDraft({ ...draft, date: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Текст</span>
            <textarea
              rows={3}
              className="admin-input"
              value={draft.text}
              onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-modal-footer">
          {!isNew && onDelete ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              Удалить
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-sm btn-primary">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}

interface FaqEditorModalProps {
  item: FaqItem | null;
  isNew: boolean;
  onClose: () => void;
  onSave: (item: FaqItem) => void;
  onDelete?: () => void;
}

export function FaqEditorModal({
  item,
  isNew,
  onClose,
  onSave,
  onDelete,
}: FaqEditorModalProps) {
  const [draft, setDraft] = useState<FaqItem>(() => item || { q: '', a: '' });

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="panel modal-panel"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.q.trim()) return;
          onSave(draft);
        }}
      >
        <div className="panel-header">
          <h2 className="panel-title">{isNew ? 'Добавить вопрос' : 'Редактировать вопрос'}</h2>
          <button type="button" className="btn btn-sm" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="admin-form-grid">
          <label className="admin-field admin-col-2">
            <span>Вопрос *</span>
            <input
              className="admin-input"
              required
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
            />
          </label>
          <label className="admin-field admin-col-2">
            <span>Ответ</span>
            <textarea
              rows={3}
              className="admin-input"
              value={draft.a}
              onChange={(e) => setDraft({ ...draft, a: e.target.value })}
            />
          </label>
        </div>

        <div className="admin-modal-footer">
          {!isNew && onDelete ? (
            <button type="button" className="btn btn-sm btn-danger" onClick={onDelete}>
              Удалить
            </button>
          ) : (
            <span />
          )}
          <button type="submit" className="btn btn-sm btn-primary">
            Сохранить
          </button>
        </div>
      </form>
    </div>
  );
}
