import { create } from 'zustand';

interface UserProfile {
  niche?: string;
  audience?: string;
  nickname?: string;
  style?: string;
  contentFormat?: string;
}

interface HotItem {
  rank: number;
  title: string;
  platform: string;
  heatScore: number;
  url?: string;
}

interface GeneratedCopy {
  angle: string;
  content: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const SAVED_TOPICS_KEY = 'savedTopics';
const ANALYSIS_HISTORY_KEY = 'analysisHistory';

function loadSavedTopics(): HotItem[] {
  try {
    const raw = localStorage.getItem(SAVED_TOPICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSavedTopics(items: HotItem[]) {
  localStorage.setItem(SAVED_TOPICS_KEY, JSON.stringify(items));
}

export function loadAnalysisHistory(): Array<{topic: string; analysis: string; timestamp: number}> {
  try {
    return JSON.parse(localStorage.getItem(ANALYSIS_HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function persistAnalysisHistory(items: Array<{topic: string; analysis: string; timestamp: number}>) {
  localStorage.setItem(ANALYSIS_HISTORY_KEY, JSON.stringify(items));
}

function loadCreationStats() {
  try {
    const raw = localStorage.getItem('creationStats');
    if (raw) {
      const data = JSON.parse(raw);
      // Reset if not today
      const today = new Date().toDateString();
      if (data.date === today) {
        return data;
      }
    }
  } catch {}
  return { date: new Date().toDateString(), todayCopies: 0, todayAnalysis: 0 };
}

function persistCreationStats(stats: { date: string; todayCopies: number; todayAnalysis: number }) {
  localStorage.setItem('creationStats', JSON.stringify(stats));
}

interface AppState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  // Auth
  isLoggedIn: boolean;
  isLoadingAuth: boolean;
  cozeUid: string;
  accessToken: string;
  setAuth: (uid: string, token: string) => void;
  clearAuth: () => void;
  setLoadingAuth: (loading: boolean) => void;
  setAccessToken: (token: string) => void;

  // Quota
  quota: { allowed: boolean; used: number; limit: number; tier: string; remaining: number } | null;
  showQuotaModal: boolean;
  setQuota: (quota: AppState['quota']) => void;
  setShowQuotaModal: (show: boolean) => void;
  checkAndIncrementQuota: () => Promise<boolean>;

  hotList: HotItem[];
  selectedPlatform: string;
  isLoadingHotList: boolean;
  setHotList: (list: HotItem[]) => void;
  setSelectedPlatform: (platform: string) => void;
  setLoadingHotList: (loading: boolean) => void;

  // 收藏话题
  savedTopics: HotItem[];
  toggleSaveTopic: (item: HotItem) => void;
  isTopicSaved: (title: string) => boolean;
  clearSavedTopics: () => void;

  selectedTopic: string;
  selectedAngles: string[];
  lastAnalysis: string;
  setLastAnalysis: (analysis: string) => void;
  analysisHistory: Array<{topic: string; analysis: string; timestamp: number}>;
  addAnalysisHistory: (topic: string, analysis: string) => void;
  generatedCopies: GeneratedCopy[];
  isGenerating: boolean;
  setSelectedTopic: (topic: string) => void;
  setSelectedAngles: (angles: string[]) => void;
  setGeneratedCopies: (copies: GeneratedCopy[]) => void;
  setGenerating: (generating: boolean) => void;

  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;

  creationStats: {
    date: string;
    todayCopies: number;
    todayAnalysis: number;
  };
  incrementCopies: () => void;
  incrementAnalysis: () => void;

  activePage: string;
  setActivePage: (page: string) => void;

  // HotRadar 引导卡（可折叠，用户可从 Settings 重新显示）
  showHotRadarGuide: boolean;
  setShowHotRadarGuide: (show: boolean) => void;

  toast: Toast | null;
  showToast: (message: string, type?: Toast['type']) => void;

  mobileSearchQuery: string;
  setMobileSearchQuery: (q: string) => void;
}

const initialStats = loadCreationStats();
const initialAnalysisHistory = loadAnalysisHistory();

export const useAppStore = create<AppState>()((set) => ({
  isConnected: true,
  setConnected: (connected) => set({ isConnected: connected }),

  // Auth
  isLoggedIn: false,
  isLoadingAuth: true,
  cozeUid: '',
  accessToken: '',
  setAuth: (uid, token) => set({ isLoggedIn: true, cozeUid: uid, accessToken: token, isLoadingAuth: false }),
  clearAuth: () => set({ isLoggedIn: false, cozeUid: '', accessToken: '', isLoadingAuth: false }),
  setLoadingAuth: (loading) => set({ isLoadingAuth: loading }),
  setAccessToken: (token) => set({ accessToken: token }),

  // Quota
  quota: null,
  showQuotaModal: false,
  setQuota: (quota) => set({ quota }),
  setShowQuotaModal: (show) => set({ showQuotaModal: show }),
  checkAndIncrementQuota: async () => {
    try {
      const { incrementUserQuota } = await import('../services/cozeApi');
      const q = await incrementUserQuota();
      set({ quota: q });
      if (!q.allowed) {
        set({ showQuotaModal: true });
        return false;
      }
      if (q.remaining <= 3 && q.remaining > 0) {
        set({ showQuotaModal: true });
      }
      return true;
    } catch {
      return true;
    }
  },

  hotList: [],
  selectedPlatform: 'douyin',
  isLoadingHotList: false,
  setHotList: (list) => set({ hotList: list }),
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  setLoadingHotList: (loading) => set({ isLoadingHotList: loading }),

  // 收藏话题 - 持久化到 localStorage
  savedTopics: loadSavedTopics(),
  toggleSaveTopic: (item) =>
    set((state) => {
      const exists = state.savedTopics.some((t) => t.title === item.title);
      let newTopics: HotItem[];
      if (exists) {
        newTopics = state.savedTopics.filter((t) => t.title !== item.title);
      } else {
        newTopics = [...state.savedTopics, item];
      }
      persistSavedTopics(newTopics);
      return { savedTopics: newTopics };
    }),
  isTopicSaved: (title) => {
    // 直接从 store 读取当前状态
    const state = useAppStore.getState();
    return state.savedTopics.some((t) => t.title === title);
  },
  clearSavedTopics: () => {
    persistSavedTopics([]);
    set({ savedTopics: [] });
  },

  selectedTopic: '',
  selectedAngles: [],
  lastAnalysis: '',
  setLastAnalysis: (analysis) => set({ lastAnalysis: analysis }),
  analysisHistory: initialAnalysisHistory,
  addAnalysisHistory: (topic, analysis) =>
    set((state) => {
      const updated = [{ topic, analysis, timestamp: Date.now() }, ...state.analysisHistory].slice(0, 20);
      persistAnalysisHistory(updated);
      return { analysisHistory: updated, lastAnalysis: analysis };
    }),
  generatedCopies: [],
  isGenerating: false,
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  setSelectedAngles: (angles) => set({ selectedAngles: angles }),
  setGeneratedCopies: (copies) => set({ generatedCopies: copies }),
  setGenerating: (generating) => set({ isGenerating: generating }),

  userProfile: {},
  setUserProfile: (profile) =>
    set((state) => ({ userProfile: { ...state.userProfile, ...profile } })),

  creationStats: initialStats,
  incrementCopies: () =>
    set((state) => {
      const newStats = {
        ...state.creationStats,
        todayCopies: state.creationStats.todayCopies + 1,
      };
      persistCreationStats(newStats);
      return { creationStats: newStats };
    }),
  incrementAnalysis: () =>
    set((state) => {
      const newStats = {
        ...state.creationStats,
        todayAnalysis: state.creationStats.todayAnalysis + 1,
      };
      persistCreationStats(newStats);
      return { creationStats: newStats };
    }),

  activePage: (() => {
    const pageParam = new URLSearchParams(window.location.search).get('page');
    if (pageParam) return pageParam;
    const pathMap: Record<string, string> = { '/workshop': 'forge', '/search': 'search', '/explore': 'explore', '/publish': 'publish', '/analyze': 'analyze', '/profile': 'profile' };
    return pathMap[window.location.pathname] || 'radar';
  })(),
  setActivePage: (page) => {
    set({ activePage: page });
    const url = new URL(window.location.href);
    url.searchParams.set('page', page);
    window.history.pushState({ page }, '', url.toString());
  },

  // HotRadar 引导卡：未折叠过才显示
  showHotRadarGuide: !localStorage.getItem('hotRadar_guideCollapsed'),
  setShowHotRadarGuide: (show) => {
    if (show) {
      localStorage.removeItem('hotRadar_guideCollapsed');
    } else {
      localStorage.setItem('hotRadar_guideCollapsed', '1');
    }
    set({ showHotRadarGuide: show });
  },

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  mobileSearchQuery: '',
  setMobileSearchQuery: (q) => set({ mobileSearchQuery: q }),
}));
