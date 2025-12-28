import { createContext, useContext, ReactNode } from 'react';
import { ProjectStore } from './ProjectStore';
import { UIStore } from './UIStore';
import { GenerationStore } from './GenerationStore';

export class RootStore {
  projectStore: ProjectStore;
  uiStore: UIStore;
  generationStore: GenerationStore;

  constructor() {
    this.projectStore = new ProjectStore(this);
    this.uiStore = new UIStore(this);
    this.generationStore = new GenerationStore(this);
  }
}

const RootStoreContext = createContext<RootStore | null>(null);

export function RootStoreProvider({ children }: { children: ReactNode }) {
  const store = new RootStore();
  return (
    <RootStoreContext.Provider value={store}>
      {children}
    </RootStoreContext.Provider>
  );
}

export function useRootStore(): RootStore {
  const store = useContext(RootStoreContext);
  if (!store) {
    throw new Error('useRootStore must be used within RootStoreProvider');
  }
  return store;
}

export function useProjectStore(): ProjectStore {
  return useRootStore().projectStore;
}

export function useUIStore(): UIStore {
  return useRootStore().uiStore;
}

export function useGenerationStore(): GenerationStore {
  return useRootStore().generationStore;
}
