/**
 * Shared state for Export mode single photo selection
 */

export interface ExportPhotoItem {
  id: string;
  name: string;
  url: string;
  widthMm: number;
  heightMm: number;
  templateName: string;
}

type Listener = () => void;

let activeExportPhoto: ExportPhotoItem | null = null;
const listeners = new Set<Listener>();

export const sharedExportState = {
  getPhoto(): ExportPhotoItem | null {
    return activeExportPhoto;
  },
  setPhoto(photo: ExportPhotoItem) {
    activeExportPhoto = photo;
    listeners.forEach((l) => l());
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
