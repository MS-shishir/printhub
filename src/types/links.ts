export type LinkCategory = 
  | 'all'
  | 'nid'
  | 'birth'
  | 'passport'
  | 'land'
  | 'education'
  | 'jobs'
  | 'challan'
  | 'travel'
  | 'photo'
  | 'tools'
  | string;

export interface LinkItem {
  id: string;
  title: string;
  url: string;
  category: LinkCategory;
  badge?: 'FREE' | 'VIP' | 'GOVT' | 'NEW' | 'POPULAR' | 'FAST' | string;
  description?: string;
  tags?: string[];
  icon?: string;
  isFavorite?: boolean;
  clicksCount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface LinkCategoryMeta {
  id: string;
  nameBn: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
}
