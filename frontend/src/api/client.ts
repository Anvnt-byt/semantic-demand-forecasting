import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { useConfigStore } from '../store/useConfigStore';

export interface ApiClientError {
  status?: number;
  message: string;
  isRateLimited?: boolean;
  retryAfterSeconds?: number;
  isForbidden?: boolean;
  isNetworkError?: boolean;
}

export const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    timeout: 15000, // 15 seconds LAN timeout
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  // Dynamically set baseURL before each request based on useConfigStore
  instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const baseUrl = useConfigStore.getState().getBaseUrl();
      config.baseURL = baseUrl;
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor with robust OWASP rate limiting (429), licensing (403), and LAN failure handling
  instance.interceptors.response.use(
    (response) => response,
    (error: AxiosError<{ detail?: string }>) => {
      const clientError: ApiClientError = {
        status: error.response?.status,
        message: 'Error de comunicación desconocido.',
      };

      if (!error.response) {
        clientError.isNetworkError = true;
        const targetUrl = useConfigStore.getState().getBaseUrl();
        clientError.message = `Timeout / Sin conexión LAN. Verifique que el servicio FastAPI local esté activo en: ${targetUrl}`;
        return Promise.reject(clientError);
      }

      const status = error.response.status;

      if (status === 429) {
        clientError.isRateLimited = true;
        const retryHeader = error.response.headers?.['retry-after'];
        const retrySeconds = retryHeader ? parseInt(retryHeader, 10) : 5;
        clientError.retryAfterSeconds = isNaN(retrySeconds) ? 5 : retrySeconds;
        clientError.message = `Límite de solicitudes alcanzado. Reintentando automáticamente en ${clientError.retryAfterSeconds} segundos...`;
        return Promise.reject(clientError);
      }

      if (status === 403) {
        clientError.isForbidden = true;
        clientError.message =
          error.response.data?.detail ||
          'Acceso denegado (HTTP 403): La funcionalidad solicitada no está incluida en su plan de licencia activo.';
        return Promise.reject(clientError);
      }

      clientError.message =
        error.response.data?.detail ||
        `Error del servidor (HTTP ${status}): ${error.message}`;

      return Promise.reject(clientError);
    }
  );

  return instance;
};

export const apiClient = createApiClient();

export const pingBackend = async (): Promise<{ ok: boolean; latencyMs: number; message: string }> => {
  const start = Date.now();
  try {
    const res = await apiClient.get('/health', { timeout: 3500 });
    const latencyMs = Date.now() - start;
    useConfigStore.getState().updateOnlineStatus(true, latencyMs);
    return {
      ok: true,
      latencyMs,
      message: `Conectado a FastAPI (${latencyMs}ms)`,
    };
  } catch {
    const latencyMs = Date.now() - start;
    useConfigStore.getState().updateOnlineStatus(false);
    return {
      ok: false,
      latencyMs,
      message: 'No responde backend local.',
    };
  }
};
