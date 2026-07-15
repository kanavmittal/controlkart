import * as SecureStore from "expo-secure-store";

import { apiFetch, ApiError, resolveBaseUrl, setOnUnauthorized } from "../client";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: null,
  },
}));

const mockedGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockedDeleteItemAsync = SecureStore.deleteItemAsync as jest.Mock;

describe("resolveBaseUrl", () => {
  it("uses the env URL when set, ignoring hostUri", () => {
    expect(resolveBaseUrl("192.168.1.7:8081", "https://api.controlkart.dev")).toBe(
      "https://api.controlkart.dev",
    );
  });

  it("derives host:9000 from a host:port hostUri", () => {
    expect(resolveBaseUrl("192.168.1.7:8081", undefined)).toBe("http://192.168.1.7:9000");
  });

  it("derives host:9000 from a bare host hostUri", () => {
    expect(resolveBaseUrl("192.168.1.7", undefined)).toBe("http://192.168.1.7:9000");
  });

  it("falls back to localhost when neither is available", () => {
    expect(resolveBaseUrl(undefined, undefined)).toBe("http://localhost:9000");
  });
});

describe("apiFetch 401 handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetItemAsync.mockResolvedValue("stored-token");
  });

  afterEach(() => {
    global.fetch = originalFetch;
    setOnUnauthorized(null);
  });

  it("clears the token and fires onUnauthorized on a 401 response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ message: "Unauthorized" }),
    }) as unknown as typeof fetch;

    const onUnauthorized = jest.fn();
    setOnUnauthorized(onUnauthorized);

    await expect(apiFetch("/wms/me")).rejects.toBeInstanceOf(ApiError);

    expect(mockedDeleteItemAsync).toHaveBeenCalledWith("wms_token");
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not clear the token or fire onUnauthorized on a 403 response", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: "Account disabled" }),
    }) as unknown as typeof fetch;

    const onUnauthorized = jest.fn();
    setOnUnauthorized(onUnauthorized);

    await expect(apiFetch("/wms/me")).rejects.toMatchObject({ status: 403 });

    expect(mockedDeleteItemAsync).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
