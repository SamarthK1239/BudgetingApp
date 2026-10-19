/**
 * Electron Main Process
 * Handles window management, application lifecycle, and IPC communication
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const BackendManager = require('./backend');
const appConfig = require('./config');

let mainWindow;
let backendManager;
// Set when the user has configured a remote server, in which case no local
// backend process is started.
let remoteBackendUrl = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    backgroundColor: '#0a0a0a',
    autoHideMenuBar: true,  // Hide menu bar by default, show with Alt key
  });

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Start backend server
async function startBackend() {
  try {
    backendManager = new BackendManager();
    const backendUrl = await backendManager.start();
    
    console.log(`Backend started at ${backendUrl}`);
    
    // Send backend URL to renderer
    if (mainWindow) {
      mainWindow.webContents.send('backend-ready', { url: backendUrl });
    }
    
    return backendUrl;
  } catch (error) {
    console.error('Failed to start backend:', error);
    
    // In development, allow running without auto-starting backend
    if (isDev) {
      console.log('Continuing without backend auto-start. Make sure backend is running separately.');
      return 'http://localhost:8000'; // Default backend URL
    }
    
    dialog.showErrorBox(
      'Backend Error',
      'Failed to start the application backend. Please try restarting the application.'
    );
    app.quit();
  }
}

// App lifecycle events
app.on('ready', async () => {
  remoteBackendUrl = appConfig.getRemoteBackendUrl();

  if (remoteBackendUrl) {
    // Remote mode: the server is hosted elsewhere, so never spawn a local backend.
    console.log(`Using remote BudgetingApp server at ${remoteBackendUrl}`);
  } else if (!isDev || process.env.AUTO_START_BACKEND === 'true') {
    // In production without a configured server, run the bundled backend locally.
    await startBackend();
  } else {
    console.log('Skipping backend auto-start in development mode. Backend URL: http://localhost:8000');
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('before-quit', async (event) => {
  if (backendManager) {
    event.preventDefault();
    
    try {
      await backendManager.stop();
      console.log('Backend stopped successfully');
    } catch (error) {
      console.error('Error stopping backend:', error);
    }
    
    // Force quit after cleanup
    app.exit(0);
  }
});

// IPC Handlers
ipcMain.handle('get-backend-url', async () => {
  if (remoteBackendUrl) {
    return remoteBackendUrl;
  }
  if (backendManager) {
    return backendManager.getUrl();
  }
  // Return default backend URL for development
  return 'http://localhost:8000';
});

ipcMain.handle('set-backend-url', async (event, url) => {
  const normalized = appConfig.setRemoteBackendUrl(url);
  remoteBackendUrl = normalized;

  // A locally spawned backend is redundant once a remote server is configured.
  if (backendManager) {
    try {
      await backendManager.stop();
    } catch (error) {
      console.error('Error stopping local backend after switching to remote:', error);
    }
    backendManager = null;
  }

  return normalized;
});

ipcMain.handle('is-remote-mode', async () => Boolean(remoteBackendUrl));

ipcMain.handle('open-file-dialog', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('save-file-dialog', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message-box', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});
