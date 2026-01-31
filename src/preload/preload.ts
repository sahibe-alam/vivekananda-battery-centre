import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  Company,
  Profile,
  ItemMaster,
  Purchase,
  Sale,
  Stock,
  AddCompanyRequest,
  UpdateCompanyRequest,
  DeleteCompanyRequest,
  UpdateProfileRequest,
  AddItemRequest,
  UpdateItemRequest,
  DeleteItemRequest,
  AddPurchaseRequest,
  AddSaleRequest,
  GetItemsRequest,
  GetPurchasesRequest,
  GetSalesRequest,
  GetStockRequest,
  UpdateStockRequest,
  PrintInvoiceRequest,
} from '../shared/types';

// Define the API interface that will be exposed to the renderer
export interface ElectronAPI {
  // Company operations
  getCompanies: () => Promise<Company[]>;
  addCompany: (request: AddCompanyRequest) => Promise<Company>;
  updateCompany: (request: UpdateCompanyRequest) => Promise<{ success: boolean }>;
  deleteCompany: (request: DeleteCompanyRequest) => Promise<{ success: boolean }>;

  // Profile operations
  getProfile: () => Promise<Profile | null>;
  updateProfile: (request: UpdateProfileRequest) => Promise<{ success: boolean }>;

  // Item Master operations
  getItems: (request: GetItemsRequest) => Promise<ItemMaster[]>;
  addItem: (request: AddItemRequest) => Promise<ItemMaster>;
  updateItem: (request: UpdateItemRequest) => Promise<{ success: boolean }>;
  deleteItem: (request: DeleteItemRequest) => Promise<{ success: boolean }>;

  // Purchase operations
  addPurchase: (request: AddPurchaseRequest) => Promise<Purchase>;
  getPurchases: (request: GetPurchasesRequest) => Promise<Purchase[]>;

  // Sales operations
  addSale: (request: AddSaleRequest) => Promise<Sale>;
  getSales: (request: GetSalesRequest) => Promise<Sale[]>;

  // Stock operations
  getStock: (request: GetStockRequest) => Promise<Stock[]>;
  updateStock: (request: UpdateStockRequest) => Promise<{ success: boolean }>;

  // Printing
  printInvoice: (request: PrintInvoiceRequest) => Promise<{ success: boolean }>;
}

// Expose the API to the renderer process
const electronAPI: ElectronAPI = {
  // Company operations
  getCompanies: () => ipcRenderer.invoke(IPC_CHANNELS.GET_COMPANIES),
  addCompany: (request) => ipcRenderer.invoke(IPC_CHANNELS.ADD_COMPANY, request),
  updateCompany: (request) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_COMPANY, request),
  deleteCompany: (request) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_COMPANY, request),

  // Profile operations
  getProfile: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PROFILE),
  updateProfile: (request) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PROFILE, request),

  // Item Master operations
  getItems: (request) => ipcRenderer.invoke(IPC_CHANNELS.GET_ITEMS, request),
  addItem: (request) => ipcRenderer.invoke(IPC_CHANNELS.ADD_ITEM, request),
  updateItem: (request) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ITEM, request),
  deleteItem: (request) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_ITEM, request),

  // Purchase operations
  addPurchase: (request) => ipcRenderer.invoke(IPC_CHANNELS.ADD_PURCHASE, request),
  getPurchases: (request) => ipcRenderer.invoke(IPC_CHANNELS.GET_PURCHASES, request),

  // Sales operations
  addSale: (request) => ipcRenderer.invoke(IPC_CHANNELS.ADD_SALE, request),
  getSales: (request) => ipcRenderer.invoke(IPC_CHANNELS.GET_SALES, request),

  // Stock operations
  getStock: (request) => ipcRenderer.invoke(IPC_CHANNELS.GET_STOCK, request),
  updateStock: (request) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STOCK, request),

  // Printing
  printInvoice: (request) => ipcRenderer.invoke(IPC_CHANNELS.PRINT_INVOICE, request),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
