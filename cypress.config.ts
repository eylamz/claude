import { defineConfig } from 'cypress';
// @ts-ignore - optional plugin, only if installed
import { addMatchImageSnapshotPlugin } from 'cypress-image-snapshot/plugin';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotsFolder: 'cypress/screenshots',
    setupNodeEvents(on, config) {
      try {
        // @ts-ignore - plugin is optional
        addMatchImageSnapshotPlugin(on, config);
      } catch {}
      return config;
    },
  },
});


