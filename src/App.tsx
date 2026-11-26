import { useEffect, useState } from 'react';
import { CalendarTab } from './components/CalendarTab';
import { GamesTab } from './components/GamesTab';
import { HomeTab } from './components/HomeTab';
import type {
  CalendarData,
  FaqItem,
  NewsItem,
  StreamsHistoryData,
  TabId,
  TwitchLiveState,
} from './types';
import { fetchTwitchLiveStatus } from './utils/format';

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
  const [calendarData, setCalendarData] = useState<CalendarData>({ games: [], calendar: {} });
  const [streamsData, setStreamsData] = useState<StreamsHistoryData>({ streams: [] });
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [faqList, setFaqList] = useState<FaqItem[]>([]);
  const [liveState, setLiveState] = useState<TwitchLiveState>({ status: 'loading' });

  useEffect(() => {
    fetch('/data/calendar-data.json')
      .then((r) => (r.ok ? r.json() : { games: [], calendar: {} }))
      .then((data: CalendarData) => setCalendarData(data))
      .catch(() => {});

    fetch('/data/streams-history.json')
      .then((r) => (r.ok ? r.json() : { streams: [] }))
      .then((data: StreamsHistoryData) => setStreamsData(data))
      .catch(() => {});

    fetch('/data/news.json')
      .then((r) => (r.ok ? r.json() : { news: [] }))
      .then((data: { news?: NewsItem[] }) => setNewsList(data.news || []))
      .catch(() => {});

    fetch('/data/faq.json')
      .then((r) => (r.ok ? r.json() : { faq: [] }))
      .then((data: { faq?: FaqItem[] }) => setFaqList(data.faq || []))
      .catch(() => {});

    fetchTwitchLiveStatus('mastgor').then(setLiveState);
  }, []);

  useEffect(() => {
    const onHashChange = () => setActiveTab(getTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (tab: TabId) => {
    setActiveTab(tab);
    if (window.location.hash !== `#${tab}`) {
      window.location.hash = tab;
    }
    window.scrollTo({ top: 0 });
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
          />
        )}
        {activeTab === 'games' && (
          <GamesTab
            games={calendarData.games}
            streams={streamsData.streams}
            calendar={calendarData.calendar}
          />
        )}
        {activeTab === 'calendar' && (
          <CalendarTab
            games={calendarData.games}
            streams={streamsData.streams}
            calendar={calendarData.calendar}
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
    </div>
  );
}

export default App;
