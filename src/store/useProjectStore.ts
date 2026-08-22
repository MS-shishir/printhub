/**
 * useProjectStore.ts
 * Global Zustand store for managing active project sessions, batch media bin (1-100 images),
 * auto-save state, and canvas reopening across page refreshes.
 */

import { create } from 'zustand';
import { projectService } from '../services/projectService';

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
  removeMediaItem: (id: string) => void;
  clearMediaBin: () => void;
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

    // Load local media bin backup
    const savedMediaBinStr = localStorage.getItem(`printhub_mediabin_${projectId}`);
    let savedMediaBin: MediaItem[] = [];
    if (savedMediaBinStr) {
      try {
        savedMediaBin = JSON.parse(savedMediaBinStr);
      } catch (e) {
        console.warn('Failed to load media bin from storage');
      }
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

      const savedMediaBinStr = localStorage.getItem(`printhub_mediabin_${id}`);
      let savedMediaBin: MediaItem[] = [];
      if (savedMediaBinStr) {
        try {
          savedMediaBin = JSON.parse(savedMediaBinStr);
        } catch (e) {
          console.warn('Failed to load media bin from storage');
        }
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
    const { currentProjectId, mediaBin } = get();
    if (!currentProjectId) return;

    set({ isAutoSaving: true });
    
    // Save canvas & thumbnail
    await projectService.autoSaveProject(currentProjectId, canvasJson, thumbnailData);
    
    // Save media bin to local storage
    localStorage.setItem(`printhub_mediabin_${currentProjectId}`, JSON.stringify(mediaBin));
    
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

    if (currentProjectId) {
      localStorage.setItem(`printhub_mediabin_${currentProjectId}`, JSON.stringify(updatedBin));
    }

    set({
      mediaBin: updatedBin,
      activeMediaId: activeId,
    });
  },

  selectMediaItem: (id: string) => {
    set({ activeMediaId: id });
  },

  removeMediaItem: (id: string) => {
    const { currentProjectId, mediaBin, activeMediaId } = get();
    const updated = mediaBin.filter((m) => m.id !== id);
    const nextActive = activeMediaId === id ? (updated.length > 0 ? updated[0].id : null) : activeMediaId;

    if (currentProjectId) {
      localStorage.setItem(`printhub_mediabin_${currentProjectId}`, JSON.stringify(updated));
    }

    set({
      mediaBin: updated,
      activeMediaId: nextActive,
    });
  },

  clearMediaBin: () => {
    const { currentProjectId } = get();
    if (currentProjectId) {
      localStorage.removeItem(`printhub_mediabin_${currentProjectId}`);
    }
    set({ mediaBin: [], activeMediaId: null });
  },
}));
