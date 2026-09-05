/**
 * useProjectStore.ts
 * Global Zustand store for managing active project sessions, batch media bin (1-100 images),
 * auto-save state, and canvas reopening across page refreshes.
 */

import { create } from 'zustand';
import { projectService } from '../services/projectService';
import { dbService } from '../services/dbService';

export interface MediaItem {
  id: string;
  name: string;
  dataUrl: string;
  thumbnail: string;
  width?: number;
  height?: number;
  type?: string;
  selected?: boolean;
}

interface ProjectStoreState {
  currentProjectId: string | number | null;
  projectTitle: string;
  projectType: string;
  isAutoSaving: boolean;
  lastSavedAt: string | null;
  canvasJson: string | null;
  mediaBin: MediaItem[];
  activeMediaId: string | null;

  // Actions
  initializeProject: (title: string, type: string) => Promise<string | number>;
  loadProjectSession: (id: string | number) => Promise<boolean>;
  triggerAutoSave: (canvasJson: string, thumbnailData?: string) => Promise<void>;
  setCurrentProjectId: (id: string | number | null) => void;
  addMediaItems: (files: FileList | File[]) => Promise<void>;
  selectMediaItem: (id: string) => void;
  removeMediaItem: (id: string) => Promise<void>;
  clearMediaBin: () => Promise<void>;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  currentProjectId: projectService.getActiveProjectId(),
  projectTitle: 'Print Shop Project',
  projectType: 'photo',
  isAutoSaving: false,
  lastSavedAt: null,
  canvasJson: null,
  mediaBin: [],
  activeMediaId: null,

  initializeProject: async (title: string, type: string) => {
    const activeId = projectService.getActiveProjectId();
    let projectId = activeId ? activeId : null;

    if (!projectId) {
      const project = await projectService.createProject(title, type);
      projectId = project ? String(project.id) : `proj_${Date.now()}`;
      projectService.setActiveProjectId(projectId);
    }

    // Load persistent media bin from IndexedDB (with auto-migration from legacy localStorage)
    let savedMediaBin: MediaItem[] = await dbService.getProjectMediaItems(projectId);
    if (!savedMediaBin || savedMediaBin.length === 0) {
      savedMediaBin = await dbService.migrateFromLocalStorage(projectId);
    }

    // Load local canvas backup
    const savedCanvas = projectService.getLocalCanvasState(projectId);

    set({
      currentProjectId: projectId,
      projectTitle: title,
      projectType: type,
      mediaBin: savedMediaBin,
      activeMediaId: savedMediaBin.length > 0 ? savedMediaBin[0].id : null,
      canvasJson: savedCanvas ? savedCanvas.canvas_json : null,
      lastSavedAt: new Date().toLocaleTimeString(),
    });

    return projectId;
  },

  loadProjectSession: async (id: string | number) => {
    const payload = await projectService.loadProject(id);
    if (payload) {
      projectService.setActiveProjectId(id);

      let savedMediaBin: MediaItem[] = await dbService.getProjectMediaItems(id);
      if (!savedMediaBin || savedMediaBin.length === 0) {
        savedMediaBin = await dbService.migrateFromLocalStorage(id);
      }

      set({
        currentProjectId: payload.id,
        projectTitle: payload.title,
        projectType: payload.type,
        mediaBin: savedMediaBin,
        activeMediaId: savedMediaBin.length > 0 ? savedMediaBin[0].id : null,
        canvasJson: payload.canvas_json || null,
        lastSavedAt: new Date().toLocaleTimeString(),
      });
      return true;
    }
    return false;
  },

  triggerAutoSave: async (canvasJson: string, thumbnailData?: string) => {
    const { currentProjectId } = get();
    if (!currentProjectId) return;

    set({ isAutoSaving: true });
    
    // Save canvas & thumbnail
    await projectService.autoSaveProject(currentProjectId, canvasJson, thumbnailData);
    
    set({
      isAutoSaving: false,
      lastSavedAt: new Date().toLocaleTimeString(),
      canvasJson,
    });
  },

  setCurrentProjectId: (id: string | number | null) => {
    if (id) {
      projectService.setActiveProjectId(id);
    } else {
      projectService.clearActiveProjectId();
    }
    set({ currentProjectId: id });
  },

  addMediaItems: async (files: FileList | File[]) => {
    const { currentProjectId, mediaBin } = get();
    const fileArray = Array.from(files);
    
    const newItems: MediaItem[] = [];

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;
      
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: file.name,
        dataUrl,
        thumbnail: dataUrl,
        selected: true,
      });
    }

    const updatedBin = [...mediaBin, ...newItems];
    const activeId = newItems.length > 0 ? newItems[0].id : get().activeMediaId;

    if (currentProjectId && newItems.length > 0) {
      await dbService.saveMediaItems(currentProjectId, newItems);
    }

    set({
      mediaBin: updatedBin,
      activeMediaId: activeId,
    });
  },

  selectMediaItem: (id: string) => {
    set({ activeMediaId: id });
  },

  removeMediaItem: async (id: string) => {
    const { mediaBin, activeMediaId } = get();
    const updated = mediaBin.filter((m) => m.id !== id);
    const nextActive = activeMediaId === id ? (updated.length > 0 ? updated[0].id : null) : activeMediaId;

    await dbService.deleteMediaItem(id);

    set({
      mediaBin: updated,
      activeMediaId: nextActive,
    });
  },

  clearMediaBin: async () => {
    const { currentProjectId } = get();
    if (currentProjectId) {
      await dbService.clearProjectMediaBin(currentProjectId);
    }
    set({ mediaBin: [], activeMediaId: null });
  },
}));

