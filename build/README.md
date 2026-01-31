# Icon Files

Place your application icons here:

- `icon.ico` - Windows icon (256x256 recommended)
- `icon.png` - macOS icon (512x512 or 1024x1024 recommended)

## Icon Requirements

### Windows (.ico)
- Format: ICO file with multiple sizes embedded
- Recommended sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Tools: 
  - Online: https://convertico.com/
  - Desktop: GIMP, Paint.NET

### macOS (.png)
- Format: PNG with transparency
- Size: 512x512 or 1024x1024
- Will be automatically converted to .icns during build

## Generating Icons

You can use online tools or create them using graphic design software:
1. Create a square image (1024x1024px)
2. Design your app icon
3. Export as PNG
4. Convert to ICO for Windows

For now, the build process will use default Electron icons if these files are missing.
