import { useCallback, useEffect, useState } from 'react';
import { CalendarTab } from './components/CalendarTab';
import { GamesTab } from './components/GamesTab';
import { HomeTab } from './components/HomeTab';
import type {
  CalendarData,
  FaqItem,
  NewsItem,
  StreamRecord,
  StreamsHistoryData,
  TabId,
  TwitchLiveState,
} from './types';
import { fetchTwitchLiveStatus } from './utils/format';

const IS_ADMIN = import.meta.env.VITE_ADMIN === 'true';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'home', label: 'Главная' },
  { id: 'games', label: 'Игры и просмотр' },
  { id: 'calendar', label: 'Календарь и стримы' },
];

function getTabFromHash(): TabId {
  const hash = window.location.hash.replace('#', '').trim();
  if (hash === 'games' || hash === 'calendar' || hash === 'home') {
    return hash;
  }
  return 'home';
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>(getTabFromHash);
  const [focusDateKey, setFocusDateKey] = useState<string | null>(null);
  const [calendarData, setCalendarData] = useState<CalendarData>({ games: [], calendar: {} });
  const [streamsData, setStreamsData] = useState<StreamsHistoryData>({ streams: [] });
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [liveState, setLiveState] = useState<TwitchLiveState>({ status: 'loading' });
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(null);

  const showToast = useCallback((text: string, isError = false) => {
    setToast({ text, isError });
    window.setTimeout(() => setToast(null), 3200);
  }, []);

  const loadAllData = useCallback(() => {
    const bust = IS_ADMIN ? `?t=${Date.now()}` : '';
    fetch(`/data/calendar-data.json${bust}`)
      .then((r) => (r.ok ? r.json() : { games: [], calendar: {} }))
      .then((data: CalendarData) => setCalendarData(data))
      .catch(() => {});

    fetch(`/data/streams-history.json${bust}`)
      .then((r) => (r.ok ? r.json() : { streams: [] }))
      .then((data: StreamsHistoryData) => setStreamsData(data))
      .catch(() => {});

    fetch(`/data/news.json${bust}`)
      .then((r) => (r.ok ? r.json() : { news: [] }))
      .then((data: { news?: NewsItem[] }) => setNewsList(data.news || []))
      .catch(() => {});

    fetch(`/data/faq.json${bust}`)
      .then((r) => (r.ok ? r.json() : { faq: [] }))
      .then((data: { faq?: FaqItem[] }) => setFaqList(data.faq || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadAllData();
    fetchTwitchLiveStatus('mastgor').then(setLiveState);
  }, [loadAllData]);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const saveKind = async (kind: 'calendar' | 'streams' | 'news' | 'faq', payload: unknown, msg: string) => {
    const res = await fetch(`/api/save/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      showToast('Ошибка сохранения', true);
      return false;
    }
    showToast(msg);
    return true;
  };

  const handleSaveCalendar = async (next: CalendarData) => {
    setCalendarData(next);
    await saveKind('calendar', next, 'Игры сохранены');
  };

  const handleSaveStreams = async (nextStreams: StreamRecord[]) => {
    const next = { streams: nextStreams };
    setStreamsData(next);
    await saveKind('streams', next, 'Стримы сохранены');
  };

  const handleSaveNews = async (nextNews: NewsItem[]) => {
    setNewsList(nextNews);
    await saveKind('news', { news: nextNews }, 'Новости сохранены');
  };

  const handleSaveFaq = async (nextFaq: FaqItem[]) => {
    setFaqList(nextFaq);
    await saveKind('faq', { faq: nextFaq }, 'FAQ сохранён');
  };

  const handleSync = async () => {
    showToast('Синхронизация...');
    const res = await fetch('/api/sync', { method: 'POST' });
    if (!res.ok) {
      showToast('Ошибка синхронизации', true);
      return;
    }
    loadAllData();
    showToast('Данные синхронизированы!');
  };

  const handlePublish = async () => {
    showToast('Публикация на GitHub...');
    const res = await fetch('/api/publish', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Ошибка пуша', true);
      return;
    }
    showToast(data.message || 'Опубликовано!');
  };

  const navigate = (tab: TabId) => {
    setActiveTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
    window.scrollTo({ top: 0 });
  };

  const openCalendarDate = (dateKey: string) => {
    setFocusDateKey(dateKey);
    navigate('calendar');
  };

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="site-header-inner">
          <button type="button" className="brand-btn" onClick={() => navigate('home')}>
            <img src="/ava.png" alt="MASTgor" className="brand-avatar" />
            <span className="brand-name">MASTgor</span>
          </button>

          <nav className="nav-tabs" aria-label="Разделы сайта">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`nav-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                onClick={() => navigate(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {IS_ADMIN && (
            <div className="admin-header-actions">
              <button type="button" className="btn btn-sm" onClick={handleSync}>
                Синхронизация
              </button>
              <button type="button" className="btn btn-sm btn-primary" onClick={handlePublish}>
                Пуш
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="site-main">
        {activeTab === 'home' && (
          <HomeTab
            games={calendarData.games}
            streams={streamsData.streams}
            calendar={calendarData.calendar}
            news={newsList}
            faq={faqList}
            liveState={liveState}
            isAdmin={IS_ADMIN}
            onSaveNews={handleSaveNews}
            onSaveFaq={handleSaveFaq}
            onOpenDate={openCalendarDate}
          />
        )}
        {activeTab === 'games' && (
          <GamesTab
            games={calendarData.games}
            streams={streamsData.streams}
            calendar={calendarData.calendar}
            isAdmin={IS_ADMIN}
            onSaveGames={(nextGames) =>
              handleSaveCalendar({ ...calendarData, games: nextGames })
            }
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            games={calendarData.games}
            streams={streamsData.streams}
            calendar={calendarData.calendar}
            focusDateKey={focusDateKey}
            onClearFocusDate={() => setFocusDateKey(null)}
            isAdmin={IS_ADMIN}
            onSaveStreams={handleSaveStreams}
          />
        )}
      </main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <a href="https://www.twitch.tv/mastgor" target="_blank" rel="noopener noreferrer">
            twitch.tv/mastgor
          </a>
        </div>
      </footer>

      {toast && (
        <div className={`admin-toast ${toast.isError ? 'is-error' : ''}`}>{toast.text}</div>
      )}
    </div>
  );
}

export default App;
