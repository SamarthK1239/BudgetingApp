/**
 * Preload Script
 * Exposes secure IPC bridge to renderer process
 */

const { contextBridge, ipcRenderer } = require('electron');
const { app } = require('@electron/remote') || {};

// Get app version safely
let appVersion = '0.1.0';
try {
  appVersion = require('../../package.json').version;
} catch (e) {
  // In production, package.json might not be accessible
  appVersion = '0.1.0';
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Backend communication
  getBackendUrl: () => ipcRenderer.invoke('get-backend-url'),
  
  onBackendReady: (callback) => {
    ipcRenderer.on('backend-ready', (event, data) => callback(data));
  },
  
  // File dialogs
  openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),
  
  saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),
  
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  
  // Platform info
  platform: process.platform,
  
  // App version
  appVersion: appVersion
});
