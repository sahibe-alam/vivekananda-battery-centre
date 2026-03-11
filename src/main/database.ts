import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import {
  Company,
  Profile,
  BankDetail,
  ItemMaster,
  Purchase,
  Sale,
  Stock,
} from '../shared/types';

export class DatabaseService {
  private db: Database.Database;

  constructor() {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'battery-inventory.db');
    
    console.log('Database path:', dbPath);
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initializeTables();
  }

  private initializeTables(): void {
    // Companies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        createdAt TEXT NOT NULL
      )
    `);

    // Profile table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        businessName TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        gstNumber TEXT NOT NULL,
        pan TEXT NOT NULL,
        email TEXT NOT NULL,
        bankDetails TEXT NOT NULL DEFAULT '[]'
      )
    `);

    const profileColumns = this.db
      .prepare(`PRAGMA table_info(profile)`)
      .all() as Array<{ name: string }>;

    if (!profileColumns.some((column) => column.name === 'bankDetails')) {
      this.db.exec(
        `ALTER TABLE profile ADD COLUMN bankDetails TEXT NOT NULL DEFAULT '[]'`
      );
    }

    // Item Master table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS itemMaster (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        model TEXT NOT NULL,
        type TEXT NOT NULL,
        cgstPercent REAL NOT NULL,
        sgstPercent REAL NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id)
      )
    `);

    // Purchases table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS purchases (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        model TEXT NOT NULL,
        type TEXT NOT NULL,
        rate REAL NOT NULL,
        quantity INTEGER NOT NULL,
        invoiceNumber TEXT NOT NULL,
        date TEXT NOT NULL,
        discountPercent REAL NOT NULL,
        cgstPercent REAL NOT NULL,
        sgstPercent REAL NOT NULL,
        roundOff REAL NOT NULL,
        totalAmount REAL NOT NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id)
      )
    `);

    // Sales table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        invoiceNumber TEXT NOT NULL,
        clientDetails TEXT NOT NULL,
        model TEXT NOT NULL,
        type TEXT NOT NULL,
        serialNumbers TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        rate REAL NOT NULL,
        cgstPercent REAL NOT NULL,
        sgstPercent REAL NOT NULL,
        cgstAmount REAL NOT NULL,
        sgstAmount REAL NOT NULL,
        roundOff REAL NOT NULL,
        totalAmount REAL NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (companyId) REFERENCES companies(id)
      )
    `);

    // Stock table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS stock (
        companyId TEXT NOT NULL,
        model TEXT NOT NULL,
        type TEXT NOT NULL,
        availableStock INTEGER NOT NULL,
        PRIMARY KEY (companyId, model, type),
        FOREIGN KEY (companyId) REFERENCES companies(id)
      )
    `);

    console.log('Database tables initialized');
  }

  // Company operations
  getCompanies(): Company[] {
    const stmt = this.db.prepare('SELECT * FROM companies ORDER BY name');
    return stmt.all() as Company[];
  }

  addCompany(name: string): Company {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    const stmt = this.db.prepare(
      'INSERT INTO companies (id, name, createdAt) VALUES (?, ?, ?)'
    );
    stmt.run(id, name, createdAt);
    
    return { id, name, createdAt };
  }

  updateCompany(id: string, name: string): void {
    const stmt = this.db.prepare('UPDATE companies SET name = ? WHERE id = ?');
    stmt.run(name, id);
  }

  deleteCompany(id: string): void {
    // Delete company and all related data
    const deleteCompanyStmt = this.db.prepare('DELETE FROM companies WHERE id = ?');
    const deleteItemsStmt = this.db.prepare('DELETE FROM itemMaster WHERE companyId = ?');
    const deletePurchasesStmt = this.db.prepare('DELETE FROM purchases WHERE companyId = ?');
    const deleteSalesStmt = this.db.prepare('DELETE FROM sales WHERE companyId = ?');
    const deleteStockStmt = this.db.prepare('DELETE FROM stock WHERE companyId = ?');
    
    // Execute in transaction
    const transaction = this.db.transaction(() => {
      deleteStockStmt.run(id);
      deleteSalesStmt.run(id);
      deletePurchasesStmt.run(id);
      deleteItemsStmt.run(id);
      deleteCompanyStmt.run(id);
    });
    
    transaction();
  }

  // Profile operations
  getProfile(): Profile | null {
    const stmt = this.db.prepare('SELECT * FROM profile WHERE id = 1');
    const result = stmt.get() as
      | (Omit<Profile, 'bankDetail'> & { bankDetails?: string })
      | undefined;

    if (!result) {
      return null;
    }

    let bankDetail: BankDetail = {
      bankName: '',
      accountNumber: '',
      branch: '',
      ifscCode: '',
    };

    if (result.bankDetails) {
      try {
        const parsed = JSON.parse(result.bankDetails) as BankDetail[] | BankDetail;
        if (Array.isArray(parsed)) {
          bankDetail = parsed[0] || bankDetail;
        } else if (parsed && typeof parsed === 'object') {
          bankDetail = parsed;
        }
      } catch {
        bankDetail = {
          bankName: '',
          accountNumber: '',
          branch: '',
          ifscCode: '',
        };
      }
    }

    return {
      businessName: result.businessName,
      address: result.address,
      phone: result.phone,
      gstNumber: result.gstNumber,
      pan: result.pan,
      email: result.email,
      bankDetail,
    };
  }

  updateProfile(profile: Profile): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profile 
      (id, businessName, address, phone, gstNumber, pan, email, bankDetails) 
      VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      profile.businessName,
      profile.address,
      profile.phone,
      profile.gstNumber,
      profile.pan,
      profile.email,
      JSON.stringify(profile.bankDetail)
    );
  }

  // Item Master operations
  getItems(companyId: string): ItemMaster[] {
    const stmt = this.db.prepare(
      'SELECT * FROM itemMaster WHERE companyId = ? ORDER BY model, type'
    );
    return stmt.all(companyId) as ItemMaster[];
  }

  addItem(
    companyId: string,
    model: string,
    type: string,
    cgstPercent: number,
    sgstPercent: number
  ): ItemMaster {
    const id = Date.now().toString();
    const createdAt = new Date().toISOString();
    
    const stmt = this.db.prepare(`
      INSERT INTO itemMaster 
      (id, companyId, model, type, cgstPercent, sgstPercent, createdAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, companyId, model, type, cgstPercent, sgstPercent, createdAt);
    
    return { id, companyId, model, type, cgstPercent, sgstPercent, createdAt };
  }

  updateItem(
    id: string,
    model: string,
    type: string,
    cgstPercent: number,
    sgstPercent: number
  ): void {
    const stmt = this.db.prepare(`
      UPDATE itemMaster 
      SET model = ?, type = ?, cgstPercent = ?, sgstPercent = ? 
      WHERE id = ?
    `);
    stmt.run(model, type, cgstPercent, sgstPercent, id);
  }

  deleteItem(id: string): void {
    const stmt = this.db.prepare('DELETE FROM itemMaster WHERE id = ?');
    stmt.run(id);
  }

  // Purchase operations
  addPurchase(purchase: Omit<Purchase, 'id' | 'totalAmount'>): Purchase {
    const id = Date.now().toString();
    
    // Calculate total amount
    const subtotal = purchase.rate * purchase.quantity;
    const discountAmount = (subtotal * purchase.discountPercent) / 100;
    const afterDiscount = subtotal - discountAmount;
    const cgstAmount = (afterDiscount * purchase.cgstPercent) / 100;
    const sgstAmount = (afterDiscount * purchase.sgstPercent) / 100;
    const totalAmount = afterDiscount + cgstAmount + sgstAmount + purchase.roundOff;
    
    const stmt = this.db.prepare(`
      INSERT INTO purchases 
      (id, companyId, model, type, rate, quantity, invoiceNumber, date, 
       discountPercent, cgstPercent, sgstPercent, roundOff, totalAmount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      purchase.companyId,
      purchase.model,
      purchase.type,
      purchase.rate,
      purchase.quantity,
      purchase.invoiceNumber,
      purchase.date,
      purchase.discountPercent,
      purchase.cgstPercent,
      purchase.sgstPercent,
      purchase.roundOff,
      totalAmount
    );
    
    // Update stock
    this.updateStockAfterPurchase(
      purchase.companyId,
      purchase.model,
      purchase.type,
      purchase.quantity
    );
    
    return { id, ...purchase, totalAmount };
  }

  getPurchases(companyId: string): Purchase[] {
    const stmt = this.db.prepare(
      'SELECT * FROM purchases WHERE companyId = ? ORDER BY date DESC'
    );
    return stmt.all(companyId) as Purchase[];
  }

  // Sales operations
  addSale(sale: Omit<Sale, 'id' | 'invoiceNumber' | 'date' | 'totalAmount' | 'cgstAmount' | 'sgstAmount'>): Sale {
    const id = Date.now().toString();
    const invoiceNumber = this.generateInvoiceNumber();
    const date = new Date().toISOString();
    
    // Calculate amounts
    const subtotal = sale.rate * sale.quantity;
    const cgstAmount = (subtotal * sale.cgstPercent) / 100;
    const sgstAmount = (subtotal * sale.sgstPercent) / 100;
    const totalAmount = subtotal + cgstAmount + sgstAmount + sale.roundOff;
    
    const stmt = this.db.prepare(`
      INSERT INTO sales 
      (id, companyId, invoiceNumber, clientDetails, model, type, serialNumbers, 
       quantity, rate, cgstPercent, sgstPercent, cgstAmount, sgstAmount, roundOff, totalAmount, date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      sale.companyId,
      invoiceNumber,
      sale.clientDetails,
      sale.model,
      sale.type,
      JSON.stringify(sale.serialNumbers),
      sale.quantity,
      sale.rate,
      sale.cgstPercent,
      sale.sgstPercent,
      cgstAmount,
      sgstAmount,
      sale.roundOff,
      totalAmount,
      date
    );
    
    // Reduce stock
    this.updateStockAfterSale(
      sale.companyId,
      sale.model,
      sale.type,
      sale.quantity
    );
    
    return {
      id,
      invoiceNumber,
      date,
      ...sale,
      cgstAmount,
      sgstAmount,
      totalAmount,
    };
  }

  getSales(companyId: string): Sale[] {
    const stmt = this.db.prepare(
      'SELECT * FROM sales WHERE companyId = ? ORDER BY date DESC'
    );
    const results = stmt.all(companyId) as any[];
    return results.map((row) => ({
      ...row,
      serialNumbers: JSON.parse(row.serialNumbers),
    }));
  }

  // Stock operations
  getStock(companyId: string): Stock[] {
    const stmt = this.db.prepare(
      'SELECT * FROM stock WHERE companyId = ? ORDER BY model, type'
    );
    return stmt.all(companyId) as Stock[];
  }

  updateStock(
    companyId: string,
    model: string,
    type: string,
    quantity: number
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO stock (companyId, model, type, availableStock) 
      VALUES (?, ?, ?, ?)
      ON CONFLICT(companyId, model, type) 
      DO UPDATE SET availableStock = ?
    `);
    stmt.run(companyId, model, type, quantity, quantity);
  }

  private updateStockAfterPurchase(
    companyId: string,
    model: string,
    type: string,
    quantity: number
  ): void {
    const currentStock = this.db
      .prepare(
        'SELECT availableStock FROM stock WHERE companyId = ? AND model = ? AND type = ?'
      )
      .get(companyId, model, type) as { availableStock: number } | undefined;

    const newStock = (currentStock?.availableStock || 0) + quantity;
    this.updateStock(companyId, model, type, newStock);
  }

  private updateStockAfterSale(
    companyId: string,
    model: string,
    type: string,
    quantity: number
  ): void {
    const currentStock = this.db
      .prepare(
        'SELECT availableStock FROM stock WHERE companyId = ? AND model = ? AND type = ?'
      )
      .get(companyId, model, type) as { availableStock: number } | undefined;

    const newStock = Math.max(0, (currentStock?.availableStock || 0) - quantity);
    this.updateStock(companyId, model, type, newStock);
  }

  private generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const stmt = this.db.prepare(
      `SELECT COUNT(*) as count FROM sales WHERE date LIKE ?`
    );
    const result = stmt.get(`${year}%`) as { count: number };
    const nextNumber = result.count + 1;
    return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
  }

  close(): void {
    this.db.close();
  }
}
