import { create } from 'zustand';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RightPanelTab = 'properties' | 'variables' | 'settings';

export interface ModalState {
  createProject: boolean;
  createWorkflow: boolean;
  runWorkflow: boolean;
  deleteConfirm: boolean;
  publishConfirm: boolean;
}

export interface UIState {
  // --- Panel visibility ---
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: RightPanelTab;

  // --- Modals ---
  modals: ModalState;

  // --- Search ---
  nodePaletteSearch: string;

  // --- Actions ---
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;
  setLeftPanelOpen: (open: boolean) => void;
  setRightPanelOpen: (open: boolean) => void;
  setRightPanelTab: (tab: RightPanelTab) => void;
  openModal: (modal: keyof ModalState) => void;
  closeModal: (modal: keyof ModalState) => void;
  setNodePaletteSearch: (search: string) => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useUIStore = create<UIState>((set) => ({
  leftPanelOpen: true,
  rightPanelOpen: false,
  rightPanelTab: 'properties',

  modals: {
    createProject: false,
    createWorkflow: false,
    runWorkflow: false,
    deleteConfirm: false,
    publishConfirm: false,
  },

  nodePaletteSearch: '',

  toggleLeftPanel: () =>
    set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),

  toggleRightPanel: () =>
    set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  setLeftPanelOpen: (open: boolean) => set({ leftPanelOpen: open }),

  setRightPanelOpen: (open: boolean) => set({ rightPanelOpen: open }),

  setRightPanelTab: (tab: RightPanelTab) =>
    set({ rightPanelTab: tab, rightPanelOpen: true }),

  openModal: (modal: keyof ModalState) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: true },
    })),

  closeModal: (modal: keyof ModalState) =>
    set((state) => ({
      modals: { ...state.modals, [modal]: false },
    })),

  setNodePaletteSearch: (search: string) =>
    set({ nodePaletteSearch: search }),
}));
