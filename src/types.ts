export interface RecentFile {
  id: string;
  name: string;
  type: 'PDF' | 'Photo' | 'Passport' | 'CV' | 'Doc' | 'Design' | 'Scan';
  date: string;
  size?: string;
  thumbnail?: string;
}

export interface CustomerJob {
  id: string;
  type: string;
  date: string;
  price: number;
  status: 'Completed' | 'Pending' | 'Delivered';
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  balance: number;
  previousJobs: CustomerJob[];
  notes?: string;
}

export interface InvoiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string;
  phone: string;
  date: string;
  items: InvoiceItem[];
  total: number;
  paid: number;
  status: 'Paid' | 'Partial' | 'Unpaid';
}

export interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface PriceListItem {
  id: string;
  serviceName: string;
  pricePerUnit: number;
  unitType: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  status: 'Active' | 'Inactive';
}

export interface PassportTemplate {
  id: string;
  country: string;
  name: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export type ThemeMode = 'light' | 'dark' | 'glass';
export type AppLanguage = 'bn' | 'en';

export interface PrinterConfig {
  id: string;
  name: string;
  status: 'Online' | 'Offline' | 'Ready';
  isDefault: boolean;
}
