import { spawn } from 'child_process';
import EventEmitter from 'events';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ServerManager extends EventEmitter {
    process = null;
    isRunningFlag = false;
    startTime = null;
    restartTimer = null;
    logStream = null;
    playerCount = 0;
    get isRunning() {
        return this.isRunningFlag;
    }
    async initialize() {
        await config.load();
        await this.ensureDirectories();
        await this.setupLogging();
    }
    async ensureDirectories() {
        const dirs = ['logs', 'server-data', 'backups'];
        for (const dir of dirs) {
            const dirPath = path.join(__dirname, '..', dir);
            try {
                await fs.access(dirPath);
            }
            catch {
                await fs.mkdir(dirPath, { recursive: true });
            }
        }
    }
    async setupLogging() {
        const logDir = path.join(__dirname, '..', 'logs');
        const logFile = path.join(logDir, `server-${Date.now()}.log`);
        this.logStream = await fs.open(logFile, 'a');
    }
    async start() {
        if (this.isRunningFlag) {
            throw new Error('Server is already running');
        }
        const serverPath = config.get('server.serverPath');
        const assetsPath = config.get('server.assetsPath');
        const javaArgs = config.get('server.javaArgs').split(' ');
        const serverJar = path.join(serverPath, 'HytaleServer.jar');
        // Check if server jar exists
        try {
            await fs.access(serverJar);
        }
        catch {
            throw new Error(`HytaleServer.jar not found at ${serverJar}. Please download the Hytale server files first.`);
        }
        // Check if assets file exists
        try {
            await fs.access(assetsPath);
        }
        catch {
            throw new Error(`Assets file not found at ${assetsPath}. Please download the Hytale assets using hytale-downloader.`);
        }
        await this.log('Starting Hytale server...');
        this.emit('starting');
        return new Promise((resolve, reject) => {
            const args = [
                ...javaArgs,
                '-jar',
                serverJar,
                '--assets',
                assetsPath,
            ];
            this.process = spawn('java', args, {
                cwd: serverPath,
                stdio: ['pipe', 'pipe', 'pipe'],
            });
            if (!this.process.stdout || !this.process.stderr || !this.process.stdin) {
                reject(new Error('Failed to create server process streams'));
                return;
            }
            this.process.stdout.on('data', (data) => {
                const message = data.toString();
                this.log(message);
                this.parseServerOutput(message);
            });
            this.process.stderr.on('data', (data) => {
                const message = data.toString();
                this.log(`[ERROR] ${message}`);
                this.emit('error', message);
            });
            this.process.on('error', (error) => {
                this.log(`[CRITICAL] Failed to start server: ${error.message}`);
                this.isRunningFlag = false;
                this.emit('error', error);
                reject(error);
            });
            this.process.on('exit', (code, signal) => {
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
            if (config.get('server.autoRestart')) {
                const interval = config.get('server.restartInterval');
                this.restartTimer = setTimeout(() => {
                    this.restart('Scheduled restart');
                }, interval);
            }
            resolve();
        });
    }
    async stop(reason = 'Manual stop') {
        if (!this.isRunningFlag || !this.process) {
            throw new Error('Server is not running');
        }
        await this.log(`Stopping server: ${reason}`);
        this.emit('stopping', reason);
        return new Promise((resolve) => {
            // Send stop command to server
            this.sendCommand('stop');
            // Wait for graceful shutdown, or force kill after 30 seconds
            const killTimer = setTimeout(() => {
                if (this.process) {
                    this.log('Forcing server shutdown...');
                    this.process.kill('SIGKILL');
                }
            }, 30000);
            this.process.once('exit', () => {
                clearTimeout(killTimer);
                if (this.restartTimer) {
                    clearTimeout(this.restartTimer);
                    this.restartTimer = null;
                }
                resolve();
            });
        });
    }
    async restart(reason = 'Manual restart') {
        await this.log(`Restarting server: ${reason}`);
        this.emit('restarting', reason);
        if (this.isRunningFlag) {
            await this.stop(reason);
            // Wait a bit before restarting
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        await this.start();
    }
    sendCommand(command) {
        if (!this.isRunningFlag || !this.process || !this.process.stdin) {
            throw new Error('Server is not running');
        }
        this.log(`[COMMAND] ${command}`);
        this.process.stdin.write(`${command}\n`);
    }
    parseServerOutput(message) {
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
    async log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] ${message}\n`;
        if (this.logStream) {
            await this.logStream.write(logMessage);
        }
        console.log(message);
    }
    getStatus() {
        return {
            isRunning: this.isRunningFlag,
            uptime: this.startTime ? Date.now() - this.startTime : 0,
            playerCount: this.playerCount,
            config: {
                name: config.get('server.name'),
                port: config.get('server.port'),
                maxPlayers: config.get('server.maxPlayers'),
            },
        };
    }
    async cleanup() {
        if (this.isRunningFlag) {
            await this.stop('Cleanup');
        }
        if (this.logStream) {
            await this.logStream.close();
        }
    }
}
export default new ServerManager();
//# sourceMappingURL=server-manager.js.map