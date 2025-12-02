# Building BudgetingApp

This guide explains how to compile the BudgetingApp into a standalone executable that can be distributed to users.

## Prerequisites

### For the Backend (Python)
- Python 3.9 or higher
- All dependencies from `requirements.txt` installed
- PyInstaller (`pip install pyinstaller`)

### For the Frontend (Electron)
- Node.js 18 or higher
- All npm dependencies installed (`npm install`)

## Build Process

### Option 1: Full Build (Recommended)

Run the complete build process from the frontend directory:

```bash
cd frontend

# Build for Windows
npm run dist-win

# Build for macOS  
npm run dist-mac

# Build for Linux
npm run dist-linux

# Build for current platform
npm run dist
```

This will:
1. Build the Python backend into a standalone executable using PyInstaller
2. Build the React frontend
3. Package everything together with Electron

### Option 2: Step-by-Step Build

#### Step 1: Build the Backend

```bash
cd backend

# Install PyInstaller if not already installed
pip install pyinstaller

# Run the build script
python build_backend.py
```

This creates `backend/dist/backend.exe` (Windows) or `backend/dist/backend` (macOS/Linux).

#### Step 2: Build the Frontend

```bash
cd frontend

# Build the React app
npm run build

# Package with Electron
npm run electron-build-win   # For Windows
npm run electron-build-mac   # For macOS
npm run electron-build-linux # For Linux
```

## Output

After a successful build, you'll find the packaged application in:

- **Windows**: `frontend/dist/BudgetingApp Setup x.x.x.exe` (installer)
- **macOS**: `frontend/dist/BudgetingApp-x.x.x.dmg`
- **Linux**: `frontend/dist/BudgetingApp-x.x.x.AppImage`

## Application Data

When running the compiled app, user data is stored in:

- **Windows**: `%APPDATA%\BudgetingApp\budget.db`
- **macOS**: `~/Library/Application Support/BudgetingApp/budget.db`
- **Linux**: `~/.config/BudgetingApp/budget.db`

## Troubleshooting

### PyInstaller Issues

If PyInstaller fails to find certain modules, you may need to add hidden imports to `build_backend.py`:

```python
"--hidden-import", "module_name",
```

### Electron Builder Issues

If the build fails with missing files, ensure:
1. The backend executable exists in `backend/dist/`
2. The React build completed successfully in `frontend/build/`

### Application Won't Start

1. Check if the backend executable runs standalone:
   ```bash
   ./backend/dist/backend.exe  # Windows
   ./backend/dist/backend      # macOS/Linux
   ```

2. Check the Electron console for errors (the packaged app logs to the system console)

## Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Backend | Run manually with `uvicorn` | Bundled executable, auto-started |
| Frontend | React dev server (hot reload) | Static build served by Electron |
| Database | `./budget.db` in backend folder | User's app data directory |
| DevTools | Enabled | Disabled |

## Creating Icons

For a proper application icon, create:

- `frontend/assets/icon.ico` - Windows (256x256 recommended)
- `frontend/assets/icon.icns` - macOS
- `frontend/assets/icon.png` - Linux (512x512 recommended)

You can use tools like [electron-icon-builder](https://www.npmjs.com/package/electron-icon-builder) to generate all formats from a single PNG.

## Code Signing (Optional)

For distribution, consider code signing your application:

### Windows
Use a code signing certificate and add to `package.json`:
```json
"win": {
  "sign": "./sign.js",
  "certificateFile": "path/to/certificate.pfx",
  "certificatePassword": "password"
}
```

### macOS
Requires an Apple Developer account and proper provisioning profiles.

## Updating the Version

Update the version in `frontend/package.json`:
```json
"version": "1.0.0"
```

This version will be used in the installer filename and application info.
