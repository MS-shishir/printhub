/**
 * projectService.ts
 * API client and local fallback service for Persistent Project Storage.
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

export interface ProjectPayload {
  id: string | number;
  title: string;
  type: string;
  canvas_json?: string;
  thumbnail_data?: string;
  width?: number;
  height?: number;
  updated_at?: string;
}

export const projectService = {
  /**
   * Save active project ID to localStorage for auto-reopening on refresh
   */
  setActiveProjectId(id: string | number): void {
    localStorage.setItem('printhub_active_project_id', String(id));
  },

  /**
   * Get active project ID from localStorage
   */
  getActiveProjectId(): string | null {
    return localStorage.getItem('printhub_active_project_id');
  },

  /**
   * Clear active project ID
   */
  clearActiveProjectId(): void {
    localStorage.removeItem('printhub_active_project_id');
  },

  /**
   * Save canvas JSON to local storage fallback
   */
  saveLocalCanvasState(projectId: string | number, canvasJson: string, thumbnailData?: string): void {
    const key = `printhub_project_canvas_${projectId}`;
    localStorage.setItem(key, JSON.stringify({
      canvas_json: canvasJson,
      thumbnail_data: thumbnailData,
      saved_at: new Date().toISOString(),
    }));
  },

  /**
   * Get local canvas state fallback
   */
  getLocalCanvasState(projectId: string | number): { canvas_json: string; thumbnail_data?: string } | null {
    const key = `printhub_project_canvas_${projectId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },

  /**
   * Create or save project via API
   */
  async createProject(title: string, type: string): Promise<{ id: number; title: string; type: string } | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type }),
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return data.data;
    } catch (e) {
      console.warn('[projectService] API offline. Created local mock project.');
      const localId = Date.now();
      return { id: localId, title, type };
    }
  },

  /**
   * Auto-save project (every 10 seconds)
   */
  async autoSaveProject(
    projectId: string | number,
    canvasJson: string,
    thumbnailData?: string,
    width = 800,
    height = 1000
  ): Promise<boolean> {
    // Always backup to local storage first
    this.saveLocalCanvasState(projectId, canvasJson, thumbnailData);

    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}/auto-save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canvas_json: canvasJson,
          thumbnail_data: thumbnailData,
          width,
          height,
        }),
      });
      return res.ok;
    } catch (e) {
      console.warn('[projectService] Auto-save backed up to local storage.');
      return true;
    }
  },

  /**
   * Load project by ID
   */
  async loadProject(projectId: string | number): Promise<ProjectPayload | null> {
    try {
      const res = await fetch(`${API_BASE_URL}/projects/${projectId}`);
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return {
        id: data.data.project.id,
        title: data.data.project.title,
        type: data.data.project.type,
        canvas_json: data.data.canvas_json,
        thumbnail_data: data.data.thumbnail_path,
        updated_at: data.data.project.updated_at,
      };
    } catch (e) {
      // Fallback to local storage
      const local = this.getLocalCanvasState(projectId);
      if (local) {
        return {
          id: projectId,
          title: `Project #${projectId}`,
          type: 'photo',
          canvas_json: local.canvas_json,
          thumbnail_data: local.thumbnail_data,
        };
      }
      return null;
    }
  }
};
