import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AllowedModule, LicensePlan, StoredLicenseState } from '../types/license.types';

interface LicenseStoreState extends StoredLicenseState {
  setLicense: (data: {
    licenseKey: string;
    plan: LicensePlan;
    daysRemaining: number;
    allowedModules: AllowedModule[];
    posIdentifier: string;
    posName: string;
  }) => Promise<void>;
  setEulaAccepted: (accepted: boolean) => Promise<void>;
  hasModule: (moduleName: AllowedModule) => boolean;
  loadLicense: () => Promise<void>;
  resetLicense: () => Promise<void>;
}

const LICENSE_STORAGE_KEY = 'posbuddy_license_secure_vault';

const defaultState: StoredLicenseState = {
  isVerified: true,
  licenseKey: 'TC-PRO-DEMO-2027',
  plan: 'pro',
  daysRemaining: 365,
  allowedModules: [
    'pos_ingestion',
    'audit_pipeline',
    'predictive_demand',
    'pareto_abc',
    'sellers_performance',
    'temporal_comparison',
    'export_excel',
    'export_pdf',
  ],
  posIdentifier: 'POS-TERM-01',
  posName: 'Caja Mostrador Demo',
  eulaAccepted: true,
  eulaAcceptedAt: '2026-10-18T00:00:00.000Z',
  lastVerifiedAt: '2026-10-18T00:00:00.000Z',
};

export const useLicenseStore = create<LicenseStoreState>((set, get) => ({
  ...defaultState,

  hasModule: (moduleName: AllowedModule) => {
    const { isVerified, allowedModules } = get();
    if (!isVerified) return false;
    return allowedModules.includes(moduleName);
  },

  setLicense: async (data) => {
    const nextState = {
      ...get(),
      isVerified: true,
      licenseKey: data.licenseKey,
      plan: data.plan,
      daysRemaining: data.daysRemaining,
      allowedModules: data.allowedModules,
      posIdentifier: data.posIdentifier,
      posName: data.posName,
      lastVerifiedAt: new Date().toISOString(),
    };
    set(nextState);
    try {
      await SecureStore.setItemAsync(LICENSE_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // Memory fallback
    }
  },

  setEulaAccepted: async (accepted: boolean) => {
    const nextState = {
      ...get(),
      eulaAccepted: accepted,
      eulaAcceptedAt: accepted ? new Date().toISOString() : undefined,
    };
    set(nextState);
    try {
      await SecureStore.setItemAsync(LICENSE_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // Memory fallback
    }
  },

  loadLicense: async () => {
    try {
      const raw = await SecureStore.getItemAsync(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set(parsed);
      }
    } catch {
      // Ignore
    }
  },

  resetLicense: async () => {
    set(defaultState);
    try {
      await SecureStore.deleteItemAsync(LICENSE_STORAGE_KEY);
    } catch {
      // Ignore
    }
  },
}));
