/**
 * Electron Configuration Store
 * Persists user preferences (notably the remote backend URL) in the Electron
 * userData directory so the desktop client can talk to a self-hosted server.
 */

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const CONFIG_FILENAME = 'config.json';

function getConfigPath() {
  return path.join(app.getPath('userData'), CONFIG_FILENAME);
}

function readConfig() {
  try {
    const configPath = getConfigPath();
    if (!fs.existsSync(configPath)) {
      return {};
    }
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) || {};
  } catch (error) {
    console.error('Could not read config, falling back to defaults:', error.message);
    return {};
  }
}

function writeConfig(config) {
  try {
    const configPath = getConfigPath();
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('Could not write config:', error.message);
    return false;
  }
}

function normalizeUrl(url) {
  if (typeof url !== 'string') {
    return null;
  }
  const trimmed = url.trim().replace(/\/+$/, '');
  return /^https?:\/\/.+/i.test(trimmed) ? trimmed : null;
}

/**
 * The remote server URL, if the user configured one.
 * The BUDGETAPP_SERVER_URL environment variable takes precedence, which makes
 * it easy to launch the desktop client against a server for testing.
 */
function getRemoteBackendUrl() {
  const fromEnv = normalizeUrl(process.env.BUDGETAPP_SERVER_URL);
  if (fromEnv) {
    return fromEnv;
  }
  return normalizeUrl(readConfig().backendUrl);
}

function setRemoteBackendUrl(url) {
  const normalized = normalizeUrl(url);
  if (!normalized) {
    throw new Error('Server URL must start with http:// or https://');
  }
  const config = readConfig();
  config.backendUrl = normalized;
  writeConfig(config);
  return normalized;
}

function clearRemoteBackendUrl() {
  const config = readConfig();
  delete config.backendUrl;
  writeConfig(config);
}

module.exports = {
  getConfigPath,
  getRemoteBackendUrl,
  setRemoteBackendUrl,
  clearRemoteBackendUrl,
  normalizeUrl,
};
