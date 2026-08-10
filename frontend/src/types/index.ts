export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: 'Retail' | 'Wholesale' | 'Distributor';
  address: string;
  status: 'Lead' | 'Active' | 'Inactive';
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    followUps: number;
    challans: number;
  };
}

export interface FollowUp {
  id: string;
  customerId: string;
  note: string;
  createdBy: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
  customer?: {
    id: string;
    name: string;
    businessName: string;
  };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number;
  currentStock: number;
  minStockAlert: number;
  location: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StockLog {
  id: string;
  productId: string;
  changeQty: number;
  movementType: 'IN' | 'OUT';
  reason: string;
  createdBy: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    category: string;
  };
  user?: {
    id: string;
    name: string;
    role: UserRole;
  };
}

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  product?: Product;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  totalQty: number;
  totalAmount: number;
  status: 'Draft' | 'Confirmed' | 'Cancelled';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  customer?: Customer;
  user?: User;
  items?: ChallanItem[];
}

export interface DashboardStats {
  totalCustomers: number;
  leadCustomers: number;
  activeCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  totalChallans: number;
  draftChallansCount: number;
  confirmedChallansCount: number;
  totalRevenue: number;
}
