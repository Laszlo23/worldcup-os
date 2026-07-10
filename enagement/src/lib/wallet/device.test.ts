import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  PHANTOM_CONNECT_QUERY,
  buildPhantomConnectReturnUrl,
  consumePhantomConnectIntent,
  hasPhantomConnectIntent,
  isPhantomInAppBrowser,
  isSocialInAppBrowser,
  isWalletAppBrowser,
  shouldBlockWalletConnect,
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
    expect(isWalletAppBrowser()).toBe(true);
  });

  it("treats Zerion as a wallet app browser, not a blocked in-app browser", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 Zerion/1.0 Mobile" });
    expect(isWalletAppBrowser()).toBe(true);
    expect(isSocialInAppBrowser()).toBe(false);
    expect(shouldBlockWalletConnect()).toBe(false);
  });

  it("does not block iPhone webviews that are wallet apps", () => {
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15" });
    vi.stubGlobal("window", {
      ...window,
      zerion: {},
      location: window.location,
      history: window.history,
    });
    expect(isWalletAppBrowser()).toBe(true);
    expect(shouldBlockWalletConnect()).toBe(false);
  });

  it("consumes URL connect intent and strips query param", () => {
    window.location.href = `https://wmos.buildingcultureid.space/?${PHANTOM_CONNECT_QUERY}=1`;
    window.location.search = `?${PHANTOM_CONNECT_QUERY}=1`;
    expect(hasPhantomConnectIntent()).toBe(true);
    expect(consumePhantomConnectIntent()).toBe(true);
    expect(window.history.replaceState).toHaveBeenCalled();
  });
});
