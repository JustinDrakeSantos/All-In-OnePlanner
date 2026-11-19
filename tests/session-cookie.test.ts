import { describe, expect, it } from "vitest";
import { secureSessionCookie } from "@/server/auth/session";

describe("secureSessionCookie", () => {
  it("is off in development", () => {
    expect(secureSessionCookie({ NODE_ENV: "development" })).toBe(false);
    expect(secureSessionCookie({ NODE_ENV: "test", APP_URL: "https://planner.example.com" })).toBe(false);
  });

  it("is on in production by default and for https hosts", () => {
    expect(secureSessionCookie({ NODE_ENV: "production" })).toBe(true);
    expect(secureSessionCookie({ NODE_ENV: "production", APP_URL: "https://planner.example.com" })).toBe(true);
    expect(secureSessionCookie({ NODE_ENV: "production", RENDER_EXTERNAL_URL: "https://all-in-planner.onrender.com" })).toBe(true);
  });

  it("is off when the configured public URL is plain http, so a local-network build can log in", () => {
    expect(secureSessionCookie({ NODE_ENV: "production", APP_URL: "http://192.168.1.20:3000" })).toBe(false);
    expect(secureSessionCookie({ NODE_ENV: "production", APP_URL: "HTTP://192.168.1.20:3000" })).toBe(false);
  });

  it("follows APP_URL over Render's URL, as password-reset links do", () => {
    expect(secureSessionCookie({ NODE_ENV: "production", APP_URL: "https://planner.example.com", RENDER_EXTERNAL_URL: "http://x" })).toBe(true);
  });
});
