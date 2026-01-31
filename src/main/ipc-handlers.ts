import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { DatabaseService } from './database';
import { IPC_CHANNELS } from '../shared/types';
import type {
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
} from '../shared/types';

export function setupIpcHandlers(db: DatabaseService): void {
  // Company handlers
  ipcMain.handle(IPC_CHANNELS.GET_COMPANIES, () => {
    return db.getCompanies();
  });

  ipcMain.handle(
    IPC_CHANNELS.ADD_COMPANY,
    (_event: IpcMainInvokeEvent, request: AddCompanyRequest) => {
      return db.addCompany(request.name);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_COMPANY,
    (_event: IpcMainInvokeEvent, request: UpdateCompanyRequest) => {
      db.updateCompany(request.id, request.name);
      return { success: true };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_COMPANY,
    (_event: IpcMainInvokeEvent, request: DeleteCompanyRequest) => {
      db.deleteCompany(request.id);
      return { success: true };
    }
  );

  // Profile handlers
  ipcMain.handle(IPC_CHANNELS.GET_PROFILE, () => {
    return db.getProfile();
  });

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_PROFILE,
    (_event: IpcMainInvokeEvent, request: UpdateProfileRequest) => {
      db.updateProfile(request.profile);
      return { success: true };
    }
  );

  // Item Master handlers
  ipcMain.handle(
    IPC_CHANNELS.GET_ITEMS,
    (_event: IpcMainInvokeEvent, request: GetItemsRequest) => {
      return db.getItems(request.companyId);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.ADD_ITEM,
    (_event: IpcMainInvokeEvent, request: AddItemRequest) => {
      return db.addItem(
        request.companyId,
        request.model,
        request.type,
        request.cgstPercent,
        request.sgstPercent
      );
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_ITEM,
    (_event: IpcMainInvokeEvent, request: UpdateItemRequest) => {
      db.updateItem(
        request.id,
        request.model,
        request.type,
        request.cgstPercent,
        request.sgstPercent
      );
      return { success: true };
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.DELETE_ITEM,
    (_event: IpcMainInvokeEvent, request: DeleteItemRequest) => {
      db.deleteItem(request.id);
      return { success: true };
    }
  );

  // Purchase handlers
  ipcMain.handle(
    IPC_CHANNELS.ADD_PURCHASE,
    (_event: IpcMainInvokeEvent, request: AddPurchaseRequest) => {
      return db.addPurchase(request);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_PURCHASES,
    (_event: IpcMainInvokeEvent, request: GetPurchasesRequest) => {
      return db.getPurchases(request.companyId);
    }
  );

  // Sales handlers
  ipcMain.handle(
    IPC_CHANNELS.ADD_SALE,
    (_event: IpcMainInvokeEvent, request: AddSaleRequest) => {
      return db.addSale(request);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.GET_SALES,
    (_event: IpcMainInvokeEvent, request: GetSalesRequest) => {
      return db.getSales(request.companyId);
    }
  );

  // Stock handlers
  ipcMain.handle(
    IPC_CHANNELS.GET_STOCK,
    (_event: IpcMainInvokeEvent, request: GetStockRequest) => {
      return db.getStock(request.companyId);
    }
  );

  ipcMain.handle(
    IPC_CHANNELS.UPDATE_STOCK,
    (_event: IpcMainInvokeEvent, request: UpdateStockRequest) => {
      db.updateStock(
        request.companyId,
        request.model,
        request.type,
        request.quantity
      );
      return { success: true };
    }
  );
}
