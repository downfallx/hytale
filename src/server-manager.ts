import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { FileHandle } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ServerStatus {
  isRunning: boolean;
  uptime: number;
  playerCount: number;
  config: {
    name: string;
    port: number;
    maxPlayers: number;
  };
}

export interface PlayerEvent {
  playerName: string;
  playerCount: number;
}

export interface StopEvent {
  code: number | null;
  signal: NodeJS.Signals | null;
}

export interface ServerManagerEvents {
  starting: () => void;
  started: () => void;
  ready: () => void;
  stopping: (reason: string) => void;
  stopped: (event: StopEvent) => void;
  restarting: (reason: string) => void;
  crashed: (event: StopEvent) => void;
  error: (error: string | Error) => void;
  playerJoin: (event: PlayerEvent) => void;
  playerLeave: (event: PlayerEvent) => void;
}

export declare interface ServerManager {
  on<K extends keyof ServerManagerEvents>(
    event: K,
    listener: ServerManagerEvents[K]
  ): this;
  emit<K extends keyof ServerManagerEvents>(
    event: K,
    ...args: Parameters<ServerManagerEvents[K]>
  ): boolean;
}

export class ServerManager extends EventEmitter {
  private process: ChildProcess | null = null;
  private isRunningFlag: boolean = false;
  private startTime: number | null = null;
  private restartTimer: NodeJS.Timeout | null = null;
  private logStream: FileHandle | null = null;
  private playerCount: number = 0;

  get isRunning(): boolean {
    return this.isRunningFlag;
  }

  async initialize(): Promise<void> {
    await config.load();
    await this.ensureDirectories();
    await this.setupLogging();
  }

  private async ensureDirectories(): Promise<void> {
    const dirs = ['logs', 'server-data', 'backups'];
    for (const dir of dirs) {
      const dirPath = path.join(__dirname, '..', dir);
      try {
        await fs.access(dirPath);
      } catch {
        await fs.mkdir(dirPath, { recursive: true });
      }
    }
  }

  private async setupLogging(): Promise<void> {
    const logDir = path.join(__dirname, '..', 'logs');
    const logFile = path.join(logDir, `server-${Date.now()}.log`);
    this.logStream = await fs.open(logFile, 'a');
  }

  async start(): Promise<void> {
    if (this.isRunningFlag) {
      throw new Error('Server is already running');
    }

    const serverPath = config.get<string>('server.serverPath');
    const assetsPath = path.join(serverPath, 'Assets.zip');
    const javaArgs = config.get<string>('server.javaArgs').split(' ');
    const serverJar = path.join(serverPath, 'HytaleServer.jar');

    // Check if server jar exists
    try {
      await fs.access(serverJar);
    } catch {
      throw new Error(`HytaleServer.jar not found at ${serverJar}. Please download the Hytale server files first.`);
    }

    // Check if assets file exists
    try {
      await fs.access(assetsPath);
    } catch {
      throw new Error(`Assets file not found at ${assetsPath}. Please download the Hytale assets using hytale-downloader.`);
    }

    await this.log('Starting Hytale server...');
    this.emit('starting');

    return new Promise<void>((resolve, reject) => {
      const args = [
        ...javaArgs,
        '-jar',
        serverJar,
        '--assets',
        assetsPath,
      ];

      // Prepare environment variables
      const env = { ...process.env };

      // Add auth token if configured
      const authToken = config.get<string>('server.authToken');
      if (authToken) {
        env.HYTALE_SERVER_TOKEN = authToken;
      }

      this.process = spawn('java', args, {
        cwd: serverPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env,
      });

      if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
        reject(new Error('Failed to create server process streams'));
        return;
      }

      this.process.stdout.on('data', (data: Buffer) => {
        const message = data.toString();
        this.log(message);
        this.parseServerOutput(message);
      });

      this.process.stderr.on('data', (data: Buffer) => {
        const message = data.toString();

        // Don't emit warnings as errors - just log them
        if (message.toLowerCase().includes('warning')) {
          this.log(`[WARNING] ${message}`);
        } else {
          this.log(`[ERROR] ${message}`);
          this.emit('error', message);
        }
      });

      this.process.on('error', (error: Error) => {
        this.log(`[CRITICAL] Failed to start server: ${error.message}`);
        this.isRunningFlag = false;
        this.emit('error', error);
        reject(error);
      });

      this.process.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
        this.log(`Server process exited with code ${code}, signal ${signal}`);
        this.isRunningFlag = false;
        this.startTime = null;
        this.emit('stopped', { code, signal });

        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = null;
        }

        if (code !== 0 && code !== null) {
          this.emit('crashed', { code, signal });
        }
      });

      // Consider server started after process spawns successfully
      this.isRunningFlag = true;
      this.startTime = Date.now();
      this.emit('started');

      // Setup auto-restart if enabled
      if (config.get<boolean>('server.autoRestart')) {
        const interval = config.get<number>('server.restartInterval');
        this.restartTimer = setTimeout(() => {
          this.restart('Scheduled restart');
        }, interval);
      }

      resolve();
    });
  }

  async stop(reason: string = 'Manual stop'): Promise<void> {
    if (!this.isRunningFlag || !this.process) {
      throw new Error('Server is not running');
    }

    await this.log(`Stopping server: ${reason}`);
    this.emit('stopping', reason);

    return new Promise<void>((resolve) => {
      // Send stop command to server
      this.sendCommand('stop');

      // Wait for graceful shutdown, or force kill after 30 seconds
      const killTimer = setTimeout(() => {
        if (this.process) {
          this.log('Forcing server shutdown...');
          this.process.kill('SIGKILL');
        }
      }, 30000);

      this.process!.once('exit', () => {
        clearTimeout(killTimer);
        if (this.restartTimer) {
          clearTimeout(this.restartTimer);
          this.restartTimer = null;
        }
        resolve();
      });
    });
  }

  async restart(reason: string = 'Manual restart'): Promise<void> {
    await this.log(`Restarting server: ${reason}`);
    this.emit('restarting', reason);

    if (this.isRunningFlag) {
      await this.stop(reason);
      // Wait a bit before restarting
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    await this.start();
  }

  sendCommand(command: string): void {
    if (!this.isRunningFlag || !this.process || !this.process.stdin) {
      throw new Error('Server is not running');
    }

    this.log(`[COMMAND] ${command}`);
    this.process.stdin.write(`${command}\n`);
  }

  private parseServerOutput(message: string): void {
    // Parse server output for events
    const msg = message.toLowerCase();

    // Player joined
    if (msg.includes('joined the game') || msg.includes('player connected')) {
      const playerMatch = message.match(/(\w+)\s+(?:joined the game|connected)/i);
      if (playerMatch) {
        const playerName = playerMatch[1];
        this.playerCount++;
        this.emit('playerJoin', { playerName, playerCount: this.playerCount });
      }
    }

    // Player left
    if (msg.includes('left the game') || msg.includes('player disconnected')) {
      const playerMatch = message.match(/(\w+)\s+(?:left the game|disconnected)/i);
      if (playerMatch) {
        const playerName = playerMatch[1];
        this.playerCount = Math.max(0, this.playerCount - 1);
        this.emit('playerLeave', { playerName, playerCount: this.playerCount });
      }
    }

    // Server ready
    if (msg.includes('done') || msg.includes('server started')) {
      this.emit('ready');
    }
  }

  private async log(message: string): Promise<void> {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;

    if (this.logStream) {
      await this.logStream.write(logMessage);
    }

    console.log(message);
  }

  getStatus(): ServerStatus {
    return {
      isRunning: this.isRunningFlag,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      playerCount: this.playerCount,
      config: {
        name: config.get<string>('server.name'),
        port: config.get<number>('server.port'),
        maxPlayers: config.get<number>('server.maxPlayers'),
      },
    };
  }

  async cleanup(): Promise<void> {
    if (this.isRunningFlag) {
      await this.stop('Cleanup');
    }
    if (this.logStream) {
      await this.logStream.close();
    }
  }
}

export default new ServerManager();
