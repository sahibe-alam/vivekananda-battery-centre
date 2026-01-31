# Architecture Documentation

## System Overview

The Vivekananda Battery Centre application follows a **3-tier Electron architecture** with strict separation of concerns and type-safe IPC communication.

```
┌─────────────────────────────────────────────────────────────┐
│                     React Renderer Process                  │
│  (UI Layer - runs in isolated browser context)             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Company  │  │Dashboard │  │  Item    │  │ Purchase │  │
│  │Selection │  │          │  │  Master  │  │          │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │  Stock   │  │Make Bill │  │ Profile  │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                                             │
│                  window.electronAPI (typed)                │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC (contextBridge)
┌─────────────────────────────────────────────────────────────┐
│                     Preload Script                          │
│  (Security Bridge - runs in privileged context)            │
│                                                             │
│  contextBridge.exposeInMainWorld('electronAPI', {...})     │
│  - Type-safe API exposure                                  │
│  - No direct Node.js access to renderer                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ IPC (invoke/handle)
┌─────────────────────────────────────────────────────────────┐
│                     Main Process (Node.js)                  │
│  (Business Logic & System Access)                          │
│                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────┐ │
│  │   main.ts       │  │ ipc-handlers.ts │  │database.ts │ │
│  │                 │  │                 │  │            │ │
│  │ - Window mgmt   │  │ - IPC routing   │  │ - SQLite   │ │
│  │ - App lifecycle │  │ - Validation    │  │ - CRUD ops │ │
│  │ - Print handler │  │ - Error handling│  │ - Queries  │ │
│  └─────────────────┘  └─────────────────┘  └────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│              SQLite Database (Local File)                   │
│  Location: app.getPath('userData')/battery-inventory.db    │
│                                                             │
│  Tables: companies, profile, itemMaster, purchases,        │
│          sales, stock                                      │
└─────────────────────────────────────────────────────────────┘
```

## Process Isolation & Security

### Renderer Process (React/TypeScript)
- **Runs in**: Chromium browser context
- **Access**: NO direct Node.js/Electron APIs
- **Security**: Full context isolation enabled
- **Communication**: Only via `window.electronAPI`

### Preload Script
- **Runs in**: Privileged context with Node.js access
- **Purpose**: Expose safe, typed APIs to renderer
- **Method**: `contextBridge.exposeInMainWorld()`
- **Security**: Whitelist-only API exposure

### Main Process
- **Runs in**: Node.js environment
- **Access**: Full system access, database, file system
- **Purpose**: Handle all privileged operations
- **Security**: All requests validated

## Data Flow: Example - Adding a Purchase

```
1. User fills purchase form in React
   ↓
2. Component calls: window.electronAPI.addPurchase(data)
   ↓
3. Preload forwards via IPC: ipcRenderer.invoke('add-purchase', data)
   ↓
4. Main process receives: ipcMain.handle('add-purchase', handler)
   ↓
5. Handler validates and calls: db.addPurchase(data)
   ↓
6. Database service:
   - Calculates total amount
   - Inserts purchase record
   - Updates stock table (atomic transaction)
   ↓
7. Result returned up the chain
   ↓
8. React UI updates with new data
```

## Type Safety

All IPC communication is fully typed:

```typescript
// Shared types (src/shared/types.ts)
interface AddPurchaseRequest {
  companyId: string;
  model: string;
  // ... other fields
}

// Preload exposes typed method
interface ElectronAPI {
  addPurchase(req: AddPurchaseRequest): Promise<Purchase>;
}

// React uses typed API
const purchase = await window.electronAPI.addPurchase(formData);
//    ^^ TypeScript knows the return type!
```

## Database Architecture

### Schema Design

**Normalized relational design:**
- Companies → Items (1:N)
- Companies → Purchases (1:N)
- Companies → Sales (1:N)
- Companies → Stock (1:N)

### Stock Management

**Automatic stock updates:**
- Purchase saved → Stock increased
- Sale saved → Stock decreased
- Manual adjustment → Stock updated directly

**Stock calculation:**
```sql
-- Example: After purchase
INSERT INTO stock (companyId, model, type, availableStock)
VALUES (?, ?, ?, ?)
ON CONFLICT(companyId, model, type)
DO UPDATE SET availableStock = availableStock + ?
```

### Transaction Safety

better-sqlite3 provides:
- ACID compliance
- WAL mode for better concurrency
- Automatic rollback on errors
- Synchronous operations (simpler error handling)

## State Management

### App State
- **Routing**: React Router (client-side)
- **Selected Company**: localStorage + React state
- **Form State**: Local component state (useState)
- **No Redux needed**: Simple, direct data flow

### Data Fetching
- Direct IPC calls from components
- No caching layer (data is already local)
- Manual refetch after mutations

## Build Process

### Development
```
Vite Dev Server (port 5173)
  ↓ HMR
React App
  +
TypeScript Compiler (watch mode)
  ↓ Compile
Main + Preload
  ↓ Execute
Electron (with inspector on port 5858)
```

### Production
```
Vite Build
  ↓ Bundle + Minify
dist/renderer/
  +
TypeScript Compile
  ↓
dist/main/ + dist/preload/
  ↓ Package
electron-builder
  ↓ Create
Windows Installer (NSIS)
```

## Security Checklist

- ✅ Context isolation enabled
- ✅ Node integration disabled in renderer
- ✅ Sandbox enabled
- ✅ No eval() or dangerous HTML rendering
- ✅ IPC whitelist via contextBridge
- ✅ No remote module usage
- ✅ CSP headers (could be added)
- ✅ Input validation in main process
- ✅ No arbitrary code execution

## Performance Considerations

### Database
- Indexes on foreign keys (companyId)
- Prepared statements for queries
- WAL mode for write performance
- Synchronous API (simpler, sufficient for desktop)

### UI
- React component lazy loading (could be added)
- Virtualized tables for large datasets (could be added)
- Debounced search inputs (could be added)

### Memory
- Close database connection on app quit
- Clear large state when navigating
- No memory leaks in IPC handlers

## Printing Architecture

```
React Component
  ↓ Generate HTML
Invoice HTML String
  ↓ IPC
Main Process
  ↓ Create hidden BrowserWindow
Print Window
  ↓ Load HTML
  ↓ webContents.print()
Native Print Dialog
  ↓ User selects printer
Physical Printer
```

**Benefits:**
- No PDF generation needed
- Native OS print dialog
- Works completely offline
- A4 format optimized

## Deployment

### Windows Distribution
1. Build creates NSIS installer
2. Installer includes:
   - Electron runtime
   - Chromium
   - Node.js
   - All app code
   - better-sqlite3 native module
3. Auto-creates shortcuts
4. Stores data in %APPDATA%

### Updates
- Manual updates (download new installer)
- Could add auto-updater (electron-updater)
- Database migrations handled automatically

## Testing Strategy (Future)

Recommended approach:
- **Unit tests**: Database service methods
- **Integration tests**: IPC handlers
- **E2E tests**: Spectron/Playwright for UI flows
- **Manual testing**: Print functionality

## Extensibility Points

### Adding New Features

1. **New database table:**
   - Update `database.ts` schema
   - Add CRUD methods
   - Create IPC handlers
   - Expose via preload
   - Use in React

2. **New page:**
   - Create component in `src/renderer/pages/`
   - Add route in `App.tsx`
   - Add navigation link

3. **New calculation:**
   - Add utility function
   - Use in relevant component
   - Could move to shared/utils if needed

## Known Limitations

1. **Single-user**: No multi-user/permissions
2. **No backup**: User must manually backup database file
3. **No cloud sync**: Fully offline by design
4. **Limited reporting**: Basic tables, no charts/graphs
5. **Windows-only production**: Built for Windows deployment

## Future Enhancements

- Export to Excel/PDF
- Backup/restore functionality
- Advanced search and filters
- Barcode scanning integration
- Multi-currency support
- Advanced reporting/analytics
- Role-based access control
- Database encryption at rest
