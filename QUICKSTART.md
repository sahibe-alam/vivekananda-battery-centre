# Quick Start Guide

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development

```bash
npm run dev
```

The application will open automatically with DevTools enabled.

### 3. First-Time Configuration

1. **Set Up Profile**
   - Click "My Profile" from the home screen
   - Enter your business details (name, address, GST, etc.)
   - Click "Save Profile"

2. **Add Companies**
   - Click "Add Company" from the home screen
   - Enter company name (e.g., "SF Sonic", "Amaron", "Eastman")
   - Repeat for all battery brands you sell

3. **Select a Company**
   - Click on any company card to enter the dashboard

## Basic Usage

### Item Master Setup

1. Click **"Item Master"** from dashboard
2. Click **"+ Add Item"**
3. Enter:
   - Model (e.g., "SF Sonic")
   - Type (e.g., "12V 65Ah")
   - CGST % (default: 9%)
   - SGST % (default: 9%)
4. Click **"Add Item"**

**Tips:**
- Double-click any row to edit
- You can delete items that haven't been used in purchases/sales

### Recording Purchases

1. Click **"Purchase Item"** from dashboard
2. Select item from dropdown (or enter manually)
3. Fill in:
   - Rate per unit
   - Quantity
   - Invoice number
   - Date
   - Discount % (optional)
   - Round off (optional)
4. Review calculation summary on the right
5. Click **"Save Purchase & Update Stock"**

**Result:** Stock is automatically increased!

### Creating Sales Bills

1. Click **"Make New Bill"** from dashboard
2. Enter client details (name, address, phone)
3. Click **"+ Select Item"**
4. Choose item from the popup
5. Fill in:
   - Quantity (check available stock)
   - Rate per unit
   - Serial numbers (up to 4)
   - Round off (optional)
6. Click **"Save Bill & Update Stock"**
7. Click **"🖨️ Print Invoice"** to print

**Result:** 
- Stock is automatically reduced
- Invoice is ready to print

### Checking Stock

1. Click **"Stock"** from dashboard
2. View three tabs:
   - **Current Stock** - Real-time inventory
   - **Purchase History** - All purchases
   - **Sales History** - All bills

## Keyboard Shortcuts

- **Enter** - Submit/Save in forms
- **Escape** - Close modals
- **Double-click** - Edit items in tables

## Data Location

All data is stored locally at:
- **macOS**: `~/Library/Application Support/vivekananda-battery-centre/`
- **Windows**: `%APPDATA%/vivekananda-battery-centre/`

## Building for Windows

```bash
# Build everything
npm run build

# Create Windows installer
npm run package
```

Find the installer in `release/` folder.

## Common Issues

**Problem:** "Module not found" errors
**Solution:** 
```bash
npm install
npm run build:preload
npm run build:main
```

**Problem:** Database errors
**Solution:** Close app, delete database file, restart

**Problem:** Printing doesn't work
**Solution:** Ensure a printer is configured in your OS

## Tips for Best Results

1. **Always fill profile first** - Appears on invoices
2. **Set up item master before purchases** - Saves time
3. **Use consistent naming** - Makes stock tracking easier
4. **Check stock before selling** - Prevents negative inventory
5. **Keep invoice numbers unique** - Better tracking

## Support

For technical issues, contact your IT administrator or development team.
