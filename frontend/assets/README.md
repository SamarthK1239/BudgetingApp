# Application Icons

Place your application icons here:

- `icon.ico` - Windows icon (256x256 or multi-size ICO)
- `icon.icns` - macOS icon 
- `icon.png` - Linux icon (512x512 recommended)

## Generating Icons

You can generate all icon formats from a single PNG using electron-icon-builder:

```bash
npm install -g electron-icon-builder
electron-icon-builder --input=icon-source.png --output=./
```

Or use online tools like:
- https://www.icoconverter.com/
- https://cloudconvert.com/png-to-icns
