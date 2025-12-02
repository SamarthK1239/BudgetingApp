/**
 * Backend Process Manager
 * Spawns and manages the Python FastAPI backend process
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');
const axios = require('axios');
const isDev = require('electron-is-dev');

class BackendManager {
  constructor() {
    this.process = null;
    this.port = null;
    this.url = null;
    this.maxRetries = 30;
    this.retryDelay = 1000; // ms
  }

  /**
   * Find an available port
   */
  async findAvailablePort(startPort = 8000) {
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(startPort, () => {
        const port = server.address().port;
        server.close(() => resolve(port));
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve(this.findAvailablePort(startPort + 1));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Get the Python executable path
   */
  getPythonPath() {
    if (isDev) {
      // Development: use system Python or venv
      const venvPath = path.join(__dirname, '../../../backend/venv');
      
      if (process.platform === 'win32') {
        const venvPython = path.join(venvPath, 'Scripts', 'python.exe');
        if (fs.existsSync(venvPython)) {
          return venvPython;
        }
        return 'python';
      } else {
        const venvPython = path.join(venvPath, 'bin', 'python');
        if (fs.existsSync(venvPython)) {
          return venvPython;
        }
        return 'python3';
      }
    } else {
      // Production: use bundled Python executable
      const backendDir = path.join(process.resourcesPath, 'backend');
      
      if (process.platform === 'win32') {
        return path.join(backendDir, 'backend.exe');
      } else {
        return path.join(backendDir, 'backend');
      }
    }
  }

  /**
   * Get the backend script path
   */
  getBackendPath() {
    if (isDev) {
      return path.join(__dirname, '../../../backend/app/main.py');
    } else {
      // In production, this would be the bundled executable
      return this.getPythonPath();
    }
  }

  /**
   * Check if backend is healthy
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.url}/health`, {
        timeout: 2000
      });
      return response.data.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for backend to be ready
   */
  async waitForBackend() {
    for (let i = 0; i < this.maxRetries; i++) {
      if (await this.checkHealth()) {
        console.log('Backend is ready');
        return true;
      }
      
      console.log(`Waiting for backend... (${i + 1}/${this.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }
    
    throw new Error('Backend failed to start within timeout period');
  }

  /**
   * Start the backend process
   */
  async start() {
    try {
      // Find available port
      this.port = await this.findAvailablePort();
      this.url = `http://127.0.0.1:${this.port}`;
      
      console.log(`Starting backend on port ${this.port}`);
      
      const pythonPath = this.getPythonPath();
      const backendPath = this.getBackendPath();
      
      const args = isDev
        ? ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', this.port.toString()]
        : []; // Bundled executable doesn't need args
      
      // Set environment variables
      const env = {
        ...process.env,
        PORT: this.port.toString(),
        ENVIRONMENT: isDev ? 'development' : 'production'
      };
      
      // Spawn backend process
      this.process = spawn(pythonPath, args, {
        cwd: isDev ? path.join(__dirname, '../../../backend') : undefined,
        env: env,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      // Handle stdout
      this.process.stdout.on('data', (data) => {
        console.log(`[Backend] ${data.toString()}`);
      });
      
      // Handle stderr
      this.process.stderr.on('data', (data) => {
        console.error(`[Backend Error] ${data.toString()}`);
      });
      
      // Handle process exit
      this.process.on('exit', (code, signal) => {
        console.log(`Backend process exited with code ${code} and signal ${signal}`);
        this.process = null;
      });
      
      // Handle process error
      this.process.on('error', (error) => {
        console.error('Failed to start backend process:', error);
        throw error;
      });
      
      // Wait for backend to be ready
      await this.waitForBackend();
      
      return this.url;
    } catch (error) {
      console.error('Error starting backend:', error);
      throw error;
    }
  }

  /**
   * Stop the backend process
   */
  async stop() {
    if (this.process) {
      return new Promise((resolve) => {
        this.process.on('exit', () => {
          console.log('Backend process stopped');
          resolve();
        });
        
        // Send termination signal
        if (process.platform === 'win32') {
          spawn('taskkill', ['/pid', this.process.pid, '/f', '/t']);
        } else {
          this.process.kill('SIGTERM');
        }
        
        // Force kill after timeout
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
          resolve();
        }, 5000);
      });
    }
  }

  /**
   * Get backend URL
   */
  getUrl() {
    return this.url;
  }
}

module.exports = BackendManager;
