import EventEmitter from 'events';
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
    get isRunning(): boolean;
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