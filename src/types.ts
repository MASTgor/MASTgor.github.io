export type GameStatus = 'inprogress' | 'planned' | 'completed';
export type GameSource = 'twitch' | 'kinopoisk';

export interface GameItem {
  id: string;
  name: string;
  year?: string;
  image: string;
  source: GameSource;
  status: GameStatus;
  checkpoint?: string;
  lastStreamDate?: string;
  vodUrl?: string;
  boostyUrl?: string;
}

export interface PlannedStream {
  id?: string;
  name?: string;
  year?: string;
  image?: string;
  source?: GameSource;
  title?: string;
  game?: string;
  time?: string;
  note?: string;
}

export interface CalendarData {
  games: GameItem[];
  calendar: Record<string, PlannedStream[] | PlannedStream | string>;
}

export interface StreamRecord {
  id: string;
  start: number;
  end: number;
  title: string;
  game: string;
  image?: string;
  vodUrl?: string;
  boostyUrl?: string;
}

export interface StreamsHistoryData {
  streams: StreamRecord[];
}

export type TabId = 'home' | 'games' | 'calendar';

export interface TwitchLiveState {
  status: 'loading' | 'live' | 'offline';
  uptimeText?: string;
}
