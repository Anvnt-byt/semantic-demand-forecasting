import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface ConfigState {
  backendHost: string;
  backendPort: number;
  useMocks: boolean;
  isOnline: boolean;
  lastPingMs: number | null;
  setBackendConfig: (host: string, port: number) => Promise<void>;
  setUseMocks: (useMocks: boolean) => void;
  getBaseUrl: () => string;
  loadConfig: () => Promise<void>;
  updateOnlineStatus: (isOnline: boolean, latencyMs?: number) => void;
}

const CONFIG_STORAGE_KEY = 'posbuddy_lan_backend_config';

export const useConfigStore = create<ConfigState>((set, get) => ({
  backendHost: 'http://localhost',
  backendPort: 8000,
  useMocks: true, // Default to true for resilient offline testing/dev, connects to live backend when disabled
  isOnline: false,
  lastPingMs: null,

  getBaseUrl: () => {
    const { backendHost, backendPort } = get();
    const cleanHost = backendHost.replace(/\/+$/, '');
    return `${cleanHost}:${backendPort}`;
  },

  setBackendConfig: async (host: string, port: number) => {
    const sanitizedHost = host.trim().replace(/\/+$/, '');
    set({ backendHost: sanitizedHost, backendPort: port });
    try {
      await SecureStore.setItemAsync(
        CONFIG_STORAGE_KEY,
        JSON.stringify({ backendHost: sanitizedHost, backendPort: port })
      );
    } catch {
      // Storage fallback
    }
  },

  setUseMocks: (useMocks: boolean) => {
    set({ useMocks });
  },

  updateOnlineStatus: (isOnline: boolean, latencyMs?: number) => {
    set({ isOnline, lastPingMs: latencyMs ?? null });
  },

  loadConfig: async () => {
    try {
      const raw = await SecureStore.getItemAsync(CONFIG_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.backendHost && parsed.backendPort) {
          set({
            backendHost: parsed.backendHost,
            backendPort: Number(parsed.backendPort),
          });
        }
      }
    } catch {
      // Ignore if not present
    }
  },
}));
