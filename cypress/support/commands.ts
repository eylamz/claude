// Add custom Cypress commands here
// @ts-ignore - optional command, only if installed
import { addMatchImageSnapshotCommand } from 'cypress-image-snapshot/command';

try {
  // @ts-ignore
  addMatchImageSnapshotCommand({ failureThreshold: 0.02, failureThresholdType: 'percent' });
} catch {}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      matchImageSnapshot(name?: string, options?: any): Chainable<Element>;
    }
  }
}


