import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PHANTOM_CONNECT_QUERY,
  buildPhantomConnectReturnUrl,
  consumePhantomConnectIntent,
  hasPhantomConnectIntent,
  isPhantomInAppBrowser,
} from "./device";

describe("phantom mobile device helpers", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      location: {
        href: "https://wmos.buildingcultureid.space/oracle",
        origin: "https://wmos.buildingcultureid.space",
        pathname: "/oracle",
        search: "",
        hash: "",
        assign: vi.fn(),
      },
      history: { replaceState: vi.fn() },
    });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 iPhone Safari" });
    vi.stubGlobal("sessionStorage", {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("buildPhantomConnectReturnUrl adds query flag", () => {
    expect(buildPhantomConnectReturnUrl()).toContain(`${PHANTOM_CONNECT_QUERY}=1`);
  });

  it("detects phantom in-app browser user agent", () => {
    vi.stubGlobal("navigator", { userAgent: "Phantom/25.0 Mobile" });
    expect(isPhantomInAppBrowser()).toBe(true);
  });

  it("consumes URL connect intent and strips query param", () => {
    window.location.href = `https://wmos.buildingcultureid.space/?${PHANTOM_CONNECT_QUERY}=1`;
    window.location.search = `?${PHANTOM_CONNECT_QUERY}=1`;
    expect(hasPhantomConnectIntent()).toBe(true);
    expect(consumePhantomConnectIntent()).toBe(true);
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});
