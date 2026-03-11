import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { DatabaseService } from './database';
import { setupIpcHandlers } from './ipc-handlers';
import { IPC_CHANNELS, PrintInvoiceRequest } from '../shared/types';

let mainWindow: BrowserWindow | null = null;
let database: DatabaseService | null = null;

function createWindow(): void {
  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

  // Determine preload path based on environment
  const preloadPath = isDev
    ? path.join(app.getAppPath(), 'dist/preload/preload/preload.js')
    : path.join(__dirname, '../../preload/preload/preload.js');

  console.log('Preload path:', preloadPath);
  console.log('App path:', app.getAppPath());
  console.log('__dirname:', __dirname);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
    show: false,
  });

  // Load the app
  if (isDev) {
    // Wait a bit for Vite server to start, then load
    setTimeout(() => {
      mainWindow?.loadURL('http://localhost:5173').catch(() => {
        // If 5173 fails, try 5174
        mainWindow?.loadURL('http://localhost:5174');
      });
    }, 1000);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Debugging hooks to capture renderer lifecycle and errors
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Renderer did-finish-load:', mainWindow?.webContents.getURL());
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('Render process gone:', details);
  });

  mainWindow.on('unresponsive', () => console.error('Main window unresponsive'));

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
    mainWindow?.webContents.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Printing handler
function setupPrintHandler(): void {
  ipcMain.handle(
    IPC_CHANNELS.PRINT_INVOICE,
    async (_event, request: PrintInvoiceRequest) => {
      if (!mainWindow) {
        throw new Error('Main window not available');
      }

      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      await printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(request.html)}`
      );

      return new Promise<{ success: boolean }>((resolve, reject) => {
        printWindow.webContents.print(
          {
            silent: false,
            printBackground: true,
            margins: {
              marginType: 'custom',
              top: 0.5,
              bottom: 0.5,
              left: 0.5,
              right: 0.5,
            },
          },
          (success, errorType) => {
            printWindow.close();
            if (success) {
              resolve({ success: true });
            } else {
              reject(new Error(`Print failed: ${errorType}`));
            }
          }
        );
      });
    }
  );
}

app.whenReady().then(() => {
  // Initialize database
  database = new DatabaseService();
  
  // Setup IPC handlers
  setupIpcHandlers(database);
  setupPrintHandler();
  
  // Create main window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('browser-window-focus', (_event, window) => {
    window.webContents.focus();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Close database connection
  if (database) {
    database.close();
  }
});
