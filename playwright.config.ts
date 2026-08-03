import { defineConfig, devices } from "@playwright/test";

const configuredBasePath = process.env.BASE_PATH ?? "/";
const normalizedBasePath = `/${configuredBasePath.replace(/^\/+|\/+$/g, "")}`;
const browserBasePath =
  normalizedBasePath === "/" ? "/" : `${normalizedBasePath}/`;
const previewUrl = `http://127.0.0.1:4173${browserBasePath}`;

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: previewUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] }
    }
  ],
  webServer: {
    command:
      "npm run build && npm run preview -- --host 127.0.0.1 --port 4173",
    url: previewUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
