# Vivekananda Battery Centre - Desktop Application

A **100% offline** Battery Billing & Inventory Management desktop application built with Electron, React, and TypeScript.

## 🎯 Features

- **Complete Offline Operation** - No internet required, all data stored locally
- **Company Management** - Manage multiple battery companies
- **Item Master** - Configure battery models with GST rates
- **Purchase Management** - Record purchases with automatic stock updates
- **Sales/Billing** - Generate GST-compliant invoices with printing
- **Stock Management** - Real-time inventory tracking
- **GST Calculations** - Automatic CGST/SGST calculations
- **Print Invoices** - Direct printing of GST invoices (A4 format)
- **Profile Management** - Store business details for invoices

## 🛠️ Tech Stack

- **Electron** - Cross-platform desktop app framework
- **React 18** - Modern UI library
- **TypeScript** - Strict type safety
- **better-sqlite3** - Fast, local SQLite database
- **Vite** - Lightning-fast build tool
- **React Router** - Client-side routing

## 📋 Prerequisites

- **Node.js** 18+ and npm
- **Python** (for building native modules like better-sqlite3)
- On macOS: Xcode Command Line Tools

## 🚀 Installation

```bash
# Install dependencies
npm install

# Build the preload and main process
npm run build:preload
npm run build:main
```

## 💻 Development

```bash
# Start development mode (hot reload enabled)
npm run dev
```

This will:
1. Start Vite dev server for React (port 5173)
2. Build main process and preload script
3. Launch Electron with DevTools

## 🏗️ Build for Production

```bash
# Build all components
npm run build

# Package for Windows (creates installer)
npm run package

# Package for Windows (creates unpacked directory)
npm run package:dir
```

The Windows installer will be created in the `release/` directory.

## 📁 Project Structure

```
vivekananda-battery-centre/
├── src/
│   ├── main/              # Electron main process
│   │   ├── main.ts        # App entry point
│   │   ├── database.ts    # SQLite database service
│   │   └── ipc-handlers.ts # IPC communication handlers
│   ├── preload/           # Preload scripts
│   │   └── preload.ts     # Context bridge API
│   ├── renderer/          # React UI
│   │   ├── pages/         # Application pages
│   │   ├── styles/        # CSS styles
│   │   ├── App.tsx        # Main React component
│   │   └── main.tsx       # React entry point
│   └── shared/            # Shared types
│       └── types.ts       # TypeScript interfaces
├── dist/                  # Compiled output
├── release/               # Built installers
├── package.json
├── tsconfig.json          # TypeScript config (renderer)
├── tsconfig.main.json     # TypeScript config (main)
├── tsconfig.preload.json  # TypeScript config (preload)
└── vite.config.ts         # Vite configuration
```

## 🗄️ Database

The application uses **better-sqlite3** for local data storage. The database file is automatically created in:

- **macOS**: `~/Library/Application Support/vivekananda-battery-centre/battery-inventory.db`
- **Windows**: `%APPDATA%/vivekananda-battery-centre/battery-inventory.db`

### Database Schema

1. **companies** - Battery company records
2. **profile** - Business profile information
3. **itemMaster** - Battery models with GST rates
4. **purchases** - Purchase records
5. **sales** - Sales/billing records
6. **stock** - Real-time inventory

## 🔒 Security

- **Context Isolation** enabled
- **Node Integration** disabled in renderer
- **Sandbox** mode for renderer processes
- **IPC communication** via secure contextBridge API
- No direct filesystem access from UI

## 📖 User Guide

### First Time Setup

1. Launch the application
2. Click **"My Profile"** to set up your business details
3. Click **"Add Company"** to add battery companies (SF Sonic, Amaron, etc.)

### Workflow

1. **Setup Item Master**: Add battery models with GST rates
2. **Record Purchases**: Add stock with purchase details
3. **Make Bills**: Create sales invoices and print them
4. **Check Stock**: Monitor inventory levels

### Keyboard Shortcuts

- **Enter** - Submit forms
- **Escape** - Close modals
- **Double-click** - Edit items in Item Master

## 🖨️ Printing

The application uses Electron's native printing API:
- Invoices are formatted for A4 paper
- GST-compliant invoice layout
- Includes all business and tax details
- Works offline (no PDF generation needed)

## 🐛 Troubleshooting

### Database Issues

If the database becomes corrupted:
1. Close the application
2. Delete the database file (location above)
3. Restart - a fresh database will be created

### Build Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Rebuild native modules
npm rebuild better-sqlite3
```

### Windows Build on macOS

The project is configured to build for Windows from macOS. Ensure you have:
- Wine installed (optional, for icon conversion)
- All build dependencies: `npm install`

## 📝 Development Notes

### Adding New IPC Channels

1. Add channel name to `src/shared/types.ts` in `IPC_CHANNELS`
2. Define request/response types in `src/shared/types.ts`
3. Add handler in `src/main/ipc-handlers.ts`
4. Expose method in `src/preload/preload.ts`
5. Use in React components via `window.electronAPI`

### Database Modifications

1. Update schema in `src/main/database.ts` in `initializeTables()`
2. Add new methods to `DatabaseService` class
3. Create corresponding IPC handlers
4. Update TypeScript types

## 🔐 License

Private - All Rights Reserved

## 👨‍💻 Author

Vivekananda Battery Centre

## 📞 Support

For issues or questions, contact the development team.

---

**Built with ❤️ for offline reliability and data ownership**
