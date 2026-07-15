/**
 * Typed API client for the warehouse Expo app.
 *
 * Talks to the Medusa backend's warehouse-staff auth module. Handles base
 * URL resolution (so the app works against a LAN dev server without manual
 * config), bearer token storage in expo-secure-store, and typed errors so
 * screens can distinguish "bad credentials" (401) from "account disabled"
 * (403) from a plain network failure.
 */
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "wms_token";
const DEFAULT_PORT = 9000;

/**
 * Resolve the backend base URL.
 *
 * - If an explicit env URL is provided (EXPO_PUBLIC_API_URL), use it as-is.
 * - Otherwise derive it from Expo's dev-server host (Constants.expoConfig.hostUri),
 *   which looks like "192.168.1.7:8081" (host:port) or just a bare host.
 *   We keep the host and swap the port for the backend's port (9000).
 * - If neither is available, fall back to localhost.
 */
export function resolveBaseUrl(
  hostUri: string | undefined,
  envUrl: string | undefined,
): string {
  if (envUrl) {
    return envUrl;
  }

  if (!hostUri) {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  const host = hostUri.split(":")[0]?.trim();
  if (!host) {
    return `http://localhost:${DEFAULT_PORT}`;
  }

  return `http://${host}:${DEFAULT_PORT}`;
}

export function getBaseUrl(): string {
  return resolveBaseUrl(
    Constants.expoConfig?.hostUri,
    process.env.EXPO_PUBLIC_API_URL,
  );
}

// --- Token storage -----------------------------------------------------

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// --- Errors --------------------------------------------------------------

/** Status 0 marks a network-level failure (no response reached the server). */
export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// --- Unauthorized signal ---------------------------------------------------

type UnauthorizedListener = () => void;
let onUnauthorizedListener: UnauthorizedListener | null = null;

/** Registered by AuthContext so a 401 anywhere flips the app to signed-out. */
export function setOnUnauthorized(listener: UnauthorizedListener | null): void {
  onUnauthorizedListener = listener;
}

// --- Fetch helpers -----------------------------------------------------

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json();
    if (body && typeof body.message === "string") {
      return body.message;
    }
  } catch {
    // response wasn't JSON (or was empty) — use fallback
  }
  return fallback;
}

/**
 * Low-level request: JSON in/out, throws ApiError on non-2xx. Does not
 * clear the stored token or fire onUnauthorized — callers decide what a
 * failure means (e.g. login treats 401 as "bad credentials", not
 * "session expired").
 */
async function request<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getBaseUrl()}${path}`, { ...init, headers });
  } catch {
    throw new ApiError(0, "Network request failed. Check your connection and try again.");
  }

  if (!response.ok) {
    const message = await parseErrorMessage(response, `Request failed with status ${response.status}`);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

/**
 * Authenticated request. Attaches the stored bearer token; on 401 clears
 * the token and notifies the auth context (session expired / revoked).
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  try {
    return await request<T>(path, init, token);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await clearToken();
      onUnauthorizedListener?.();
    }
    throw err;
  }
}

// --- Domain calls --------------------------------------------------------

export interface Staff {
  id: string;
  name: string;
  email: string;
  active: boolean;
  created_at: string;
}

export async function login(email: string, password: string): Promise<Staff> {
  const { token } = await request<{ token: string }>("/auth/warehouse_staff/emailpass", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await setToken(token);

  try {
    const { staff } = await apiFetch<{ staff: Staff }>("/wms/me");
    return staff;
  } catch (err) {
    // Login didn't actually succeed (e.g. account disabled) — don't leave
    // a token behind.
    await clearToken();
    throw err;
  }
}

export async function logout(): Promise<void> {
  await clearToken();
}
