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
  type: 'success' | 'error' | 'info';
}

interface AppState {
  isConnected: boolean;
  setConnected: (connected: boolean) => void;

  hotList: HotItem[];
  selectedPlatform: string;
  isLoadingHotList: boolean;
  setHotList: (list: HotItem[]) => void;
  setSelectedPlatform: (platform: string) => void;
  setLoadingHotList: (loading: boolean) => void;

  selectedTopic: string;
  selectedAngles: string[];
  generatedCopies: GeneratedCopy[];
  isGenerating: boolean;
  setSelectedTopic: (topic: string) => void;
  setSelectedAngles: (angles: string[]) => void;
  setGeneratedCopies: (copies: GeneratedCopy[]) => void;
  setGenerating: (generating: boolean) => void;

  userProfile: UserProfile;
  setUserProfile: (profile: Partial<UserProfile>) => void;

  creationStats: {
    todayCopies: number;
    todayAnalysis: number;
  };
  incrementCopies: () => void;
  incrementAnalysis: () => void;

  activePage: string;
  setActivePage: (page: string) => void;

  toast: Toast | null;
  showToast: (message: string, type?: Toast['type']) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  isConnected: true,
  setConnected: (connected) => set({ isConnected: connected }),

  hotList: [],
  selectedPlatform: 'all',
  isLoadingHotList: false,
  setHotList: (list) => set({ hotList: list }),
  setSelectedPlatform: (platform) => set({ selectedPlatform: platform }),
  setLoadingHotList: (loading) => set({ isLoadingHotList: loading }),

  selectedTopic: '',
  selectedAngles: [],
  generatedCopies: [],
  isGenerating: false,
  setSelectedTopic: (topic) => set({ selectedTopic: topic }),
  setSelectedAngles: (angles) => set({ selectedAngles: angles }),
  setGeneratedCopies: (copies) => set({ generatedCopies: copies }),
  setGenerating: (generating) => set({ isGenerating: generating }),

  userProfile: {},
  setUserProfile: (profile) =>
    set((state) => ({ userProfile: { ...state.userProfile, ...profile } })),

  creationStats: {
    todayCopies: 0,
    todayAnalysis: 0,
  },
  incrementCopies: () =>
    set((state) => ({
      creationStats: {
        ...state.creationStats,
        todayCopies: state.creationStats.todayCopies + 1,
      },
    })),
  incrementAnalysis: () =>
    set((state) => ({
      creationStats: {
        ...state.creationStats,
        todayAnalysis: state.creationStats.todayAnalysis + 1,
      },
    })),

  activePage: 'radar',
  setActivePage: (page) => set({ activePage: page }),

  toast: null,
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },
}));
