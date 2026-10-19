import { apiClient } from '../client';
import { useConfigStore } from '../../store/useConfigStore';
import { LicenseVerifyRequest, LicenseVerifyResponse } from '../../types/license.types';
import { MOCK_LICENSE_PRO, MOCK_LICENSE_STARTER } from '../mockData';

export const verifyLicenseApi = async (
  request: LicenseVerifyRequest
): Promise<LicenseVerifyResponse> => {
  const { useMocks } = useConfigStore.getState();

  if (useMocks) {
    // Artificial latency for tactile responsiveness feedback
    await new Promise((resolve) => setTimeout(resolve, 600));

    const key = request.license_key.trim().toUpperCase();
    if (key === 'TC-PRO-DEMO-2027') {
      return { ...MOCK_LICENSE_PRO, pos_identifier: request.pos_identifier } as LicenseVerifyResponse;
    }
    if (key === 'TC-STARTER-DEMO-2027') {
      return { ...MOCK_LICENSE_STARTER, pos_identifier: request.pos_identifier } as LicenseVerifyResponse;
    }

    // Default mock response for generic key
    return {
      valid: true,
      license_key: key,
      plan: 'pro',
      days_remaining: 180,
      organization: request.pos_name || 'Terminal POS Independiente',
      allowed_modules: [
        'pos_ingestion',
        'audit_pipeline',
        'predictive_demand',
        'pareto_abc',
        'sellers_performance',
        'temporal_comparison',
        'export_excel',
        'export_pdf',
      ],
      message: 'Licencia validada exitosamente.',
    };
  }

  // Real backend call: POST /api/license/verify
  const response = await apiClient.post<LicenseVerifyResponse>('/api/license/verify', request);
  return response.data;
};
