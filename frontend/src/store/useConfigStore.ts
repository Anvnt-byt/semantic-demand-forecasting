import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export type OnboardingStep = 'license' | 'ingestion' | 'completed';
export type DemoPipelineStep = 1 | 2 | 3 | 4 | 5;
export type AnalyticsSubTab = 'dashboard' | 'inventory' | 'forecasting';
export type BusinessType = 'retail_grocery' | 'automotive' | 'pharmacy' | 'hardware' | 'fashion' | 'general';
export type ActiveSection =
  | 'dashboard'
  | 'studio'
  | 'inventory'
  | 'forecasting'
  | 'ingestion'
  | 'license'
  | 'export';

interface ConfigState {
  backendHost: string;
  backendPort: number;
  useMocks: boolean;
  isOnline: boolean;
  lastPingMs: number | null;
  pipelineStep: DemoPipelineStep;
  maxStepUnlocked: DemoPipelineStep;
  demoCompleted: boolean;
  analyticsSubTab: AnalyticsSubTab;
  onboardingStep: OnboardingStep;
  activeSection: ActiveSection;
  businessType: BusinessType;
  setBusinessType: (type: BusinessType) => void;
  setPipelineStep: (step: DemoPipelineStep) => void;
  setAnalyticsSubTab: (tab: AnalyticsSubTab) => void;
  completeDemoPipeline: () => void;
  resetDemoPipeline: () => Promise<void>;
  setOnboardingStep: (step: OnboardingStep) => Promise<void>;
  setActiveSection: (section: ActiveSection) => void;
  setBackendConfig: (host: string, port: number) => Promise<void>;
  setUseMocks: (useMocks: boolean) => void;
  getBaseUrl: () => string;
  loadConfig: () => Promise<void>;
  updateOnlineStatus: (isOnline: boolean, latencyMs?: number) => void;
}

const CONFIG_STORAGE_KEY = 'posbuddy_lan_backend_config';

export const useConfigStore = create<ConfigState>((set, get) => ({
  backendHost: 'http://127.0.0.1',
  backendPort: 8000,
  useMocks: true, // Default to true so offline demo pipeline runs immediately without network blocking
  isOnline: false,
  lastPingMs: null,
  pipelineStep: 1,
  maxStepUnlocked: 1,
  demoCompleted: false,
  analyticsSubTab: 'dashboard',
  onboardingStep: 'completed',
  activeSection: 'dashboard',
  businessType: 'retail_grocery',
  setBusinessType: (type: BusinessType) => {
    set({ businessType: type });
    try {
      const { backendHost, backendPort, useMocks, onboardingStep } = get();
      SecureStore.setItemAsync(CONFIG_STORAGE_KEY, JSON.stringify({ backendHost, backendPort, useMocks, onboardingStep, businessType: type }));
    } catch {}
  },

  setPipelineStep: (step: DemoPipelineStep) => {
    const currentMax = get().maxStepUnlocked;
    set({
      pipelineStep: step,
      maxStepUnlocked: Math.max(currentMax, step) as DemoPipelineStep,
    });
  },

  setAnalyticsSubTab: (tab: AnalyticsSubTab) => {
    set({ analyticsSubTab: tab });
  },

  completeDemoPipeline: () => {
    set({
      demoCompleted: true,
      pipelineStep: 4,
      analyticsSubTab: 'dashboard',
      maxStepUnlocked: 5,
    });
  },

  resetDemoPipeline: async () => {
    try {
      const baseUrl = get().getBaseUrl();
      await fetch(`${baseUrl}/api/curation/reset-demo`, { method: 'POST' });
    } catch {
      // Offline fallback
    }
    set({
      demoCompleted: false,
      pipelineStep: 1,
      maxStepUnlocked: 1,
      analyticsSubTab: 'dashboard',
    });
  },

  setActiveSection: (section: ActiveSection) => {
    set({ activeSection: section });
  },

  setOnboardingStep: async (step: OnboardingStep) => {
    set({ onboardingStep: step });
    try {
      const { backendHost, backendPort, useMocks } = get();
      await SecureStore.setItemAsync(
        CONFIG_STORAGE_KEY,
        JSON.stringify({ backendHost, backendPort, useMocks, onboardingStep: step })
      );
    } catch {
      // Storage fallback
    }
  },

  getBaseUrl: () => {
    const { backendHost, backendPort } = get();
    const cleanHost = backendHost.replace(/\/+$/, '');
    return `${cleanHost}:${backendPort}`;
  },

  setBackendConfig: async (host: string, port: number) => {
    const sanitizedHost = host.trim().replace(/\/+$/, '');
    const { onboardingStep, useMocks } = get();
    set({ backendHost: sanitizedHost, backendPort: port });
    try {
      await SecureStore.setItemAsync(
        CONFIG_STORAGE_KEY,
        JSON.stringify({ backendHost: sanitizedHost, backendPort: port, useMocks, onboardingStep })
      );
    } catch {
      // Storage fallback
    }
  },

  setUseMocks: (useMocks: boolean) => {
    set({ useMocks });
    try {
      const { backendHost, backendPort, onboardingStep } = get();
      SecureStore.setItemAsync(
        CONFIG_STORAGE_KEY,
        JSON.stringify({ backendHost, backendPort, useMocks, onboardingStep })
      );
    } catch {
      // Storage fallback
    }
  },

  updateOnlineStatus: (isOnline: boolean, latencyMs?: number) => {
    set({ isOnline, lastPingMs: latencyMs ?? null });
  },

  loadConfig: async () => {
    try {
      const raw = await SecureStore.getItemAsync(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          backendHost: parsed.backendHost || 'http://127.0.0.1',
          backendPort: parsed.backendPort ? Number(parsed.backendPort) : 8000,
          useMocks: typeof parsed.useMocks === 'boolean' ? parsed.useMocks : true,
          businessType: parsed.businessType || 'retail_grocery',
          onboardingStep: parsed.onboardingStep || 'license',
        });
      }
    } catch {
      // Ignore if not present
    }
  },
}));
