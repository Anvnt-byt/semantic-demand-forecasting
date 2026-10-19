export type LicensePlan = 'starter' | 'pro' | 'enterprise';

export type AllowedModule =
  | 'pos_ingestion'
  | 'audit_pipeline'
  | 'predictive_demand'
  | 'pareto_abc'
  | 'sellers_performance'
  | 'temporal_comparison'
  | 'export_excel'
  | 'export_pdf';

export interface LicenseVerifyRequest {
  license_key: string;
  pos_identifier: string;
  pos_name: string;
}

export interface LicenseVerifyResponse {
  valid: boolean;
  license_key: string;
  plan: LicensePlan;
  days_remaining: number;
  allowed_modules: AllowedModule[];
  organization?: string;
  issued_at?: string;
  expires_at?: string;
  message?: string;
}

export interface StoredLicenseState {
  isVerified: boolean;
  licenseKey: string;
  plan: LicensePlan;
  daysRemaining: number;
  allowedModules: AllowedModule[];
  posIdentifier: string;
  posName: string;
  eulaAccepted: boolean;
  eulaAcceptedAt?: string;
  lastVerifiedAt?: string;
}
