import { StateCreator } from 'zustand';

// Create a test store from a Zustand slice
export function createTestStore<TState>(
  create: StateCreator<TState, [['zustand/devtools', never]], [], TState>,
  initial?: Partial<TState>
): TState {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createStore } = require('zustand/vanilla');
  const store = createStore(create as any);
  if (initial) {
    store.setState({ ...(store.getState() as any), ...initial });
  }
  return store.getState();
}



