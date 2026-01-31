// Shared types for IPC communication and database models

export interface Company {
  id: string;
  name: string;
  createdAt: string;
}

export interface Profile {
  businessName: string;
  address: string;
  phone: string;
  gstNumber: string;
  pan: string;
  email: string;
}

export interface ItemMaster {
  id: string;
  companyId: string;
  model: string;
  type: string;
  cgstPercent: number;
  sgstPercent: number;
  createdAt: string;
}

export interface Purchase {
  id: string;
  companyId: string;
  model: string;
  type: string;
  rate: number;
  quantity: number;
  invoiceNumber: string;
  date: string;
  discountPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  roundOff: number;
  totalAmount: number;
}

export interface Sale {
  id: string;
  companyId: string;
  invoiceNumber: string;
  clientDetails: string;
  model: string;
  type: string;
  serialNumbers: string[];
  quantity: number;
  rate: number;
  cgstPercent: number;
  sgstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOff: number;
  totalAmount: number;
  date: string;
}

export interface Stock {
  companyId: string;
  model: string;
  type: string;
  availableStock: number;
}

// IPC Channel names
export const IPC_CHANNELS = {
  // Company operations
  GET_COMPANIES: 'get-companies',
  ADD_COMPANY: 'add-company',
  UPDATE_COMPANY: 'update-company',
  DELETE_COMPANY: 'delete-company',
  
  // Profile operations
  GET_PROFILE: 'get-profile',
  UPDATE_PROFILE: 'update-profile',
  
  // Item Master operations
  GET_ITEMS: 'get-items',
  ADD_ITEM: 'add-item',
  UPDATE_ITEM: 'update-item',
  DELETE_ITEM: 'delete-item',
  
  // Purchase operations
  ADD_PURCHASE: 'add-purchase',
  GET_PURCHASES: 'get-purchases',
  
  // Sales operations
  ADD_SALE: 'add-sale',
  GET_SALES: 'get-sales',
  
  // Stock operations
  GET_STOCK: 'get-stock',
  UPDATE_STOCK: 'update-stock',
  
  // Printing
  PRINT_INVOICE: 'print-invoice',
} as const;

// Request/Response types for IPC
export interface AddCompanyRequest {
  name: string;
}

export interface UpdateCompanyRequest {
  id: string;
  name: string;
}

export interface DeleteCompanyRequest {
  id: string;
}

export interface UpdateProfileRequest {
  profile: Profile;
}

export interface AddItemRequest {
  companyId: string;
  model: string;
  type: string;
  cgstPercent: number;
  sgstPercent: number;
}

export interface UpdateItemRequest {
  id: string;
  model: string;
  type: string;
  cgstPercent: number;
  sgstPercent: number;
}

export interface DeleteItemRequest {
  id: string;
}

export interface AddPurchaseRequest {
  companyId: string;
  model: string;
  type: string;
  rate: number;
  quantity: number;
  invoiceNumber: string;
  date: string;
  discountPercent: number;
  cgstPercent: number;
  sgstPercent: number;
  roundOff: number;
}

export interface AddSaleRequest {
  companyId: string;
  clientDetails: string;
  model: string;
  type: string;
  serialNumbers: string[];
  quantity: number;
  rate: number;
  cgstPercent: number;
  sgstPercent: number;
  roundOff: number;
}

export interface GetItemsRequest {
  companyId: string;
}

export interface GetPurchasesRequest {
  companyId: string;
}

export interface GetSalesRequest {
  companyId: string;
}

export interface GetStockRequest {
  companyId: string;
}

export interface UpdateStockRequest {
  companyId: string;
  model: string;
  type: string;
  quantity: number;
}

export interface PrintInvoiceRequest {
  html: string;
}
