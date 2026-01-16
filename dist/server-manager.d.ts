import EventEmitter from 'events';
import readline from 'readline';
export interface ServerStatus {
    isRunning: boolean;
    uptime: number;
    playerCount: number;
    config: {
        name: string;
        maxPlayers: number;
        gameMode: string;
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
    on<K extends keyof ServerManagerEvents>(event: K, listener: ServerManagerEvents[K]): this;
    emit<K extends keyof ServerManagerEvents>(event: K, ...args: Parameters<ServerManagerEvents[K]>): boolean;
}
export declare class ServerManager extends EventEmitter {
    private process;
    private isRunningFlag;
    private startTime;
    private restartTimer;
    private logStream;
    private playerCount;
    private rl;
    private static readonly SCREEN_NAME;
    get isRunning(): boolean;
    /**
     * Set the readline interface for proper output handling.
     * When set, all server output will clear/redraw the prompt.
     */
    setReadline(rl: readline.Interface | null): void;
    /**
     * Check if we're already inside a screen session
     */
    private isInsideScreen;
    /**
     * Check if the hytale screen session already exists
     */
    private screenExists;
    /**
     * Start or attach to a screen session and run the server inside it
     * Returns true if we launched inside screen (caller should exit)
     */
    launchInScreen(): Promise<boolean>;
    initialize(): Promise<void>;
    private ensureDirectories;
    private setupLogging;
    start(): Promise<void>;
    stop(reason?: string): Promise<void>;
    restart(reason?: string): Promise<void>;
    sendCommand(command: string): void;
    private parseServerOutput;
    private log;
    getStatus(): ServerStatus;
    cleanup(): Promise<void>;
}
declare const _default: ServerManager;
export default _default;
//# sourceMappingURL=server-manager.d.ts.map