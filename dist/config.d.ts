export interface ServerConfig {
    name: string;
    port: number;
    maxPlayers: number;
    difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
    gamemode: 'survival' | 'creative' | 'adventure' | 'spectator';
    pvp: boolean;
    motd: string;
    autoRestart: boolean;
    restartInterval: number;
    javaArgs: string;
    serverPath: string;
    assetsPath: string;
    authToken?: string;
}
export interface DiscordConfig {
    enabled: boolean;
    botToken: string;
    clientId?: string;
    guildId: string;
    channelId: string;
    adminRoleId: string;
    statusUpdates: boolean;
}
export interface NotificationConfig {
    playerJoin: boolean;
    playerLeave: boolean;
    serverStart: boolean;
    serverStop: boolean;
    serverCrash: boolean;
}
export interface BackupConfig {
    enabled: boolean;
    interval: number;
    backupPath: string;
    maxBackups: number;
}
export interface Config {
    server: ServerConfig;
    discord: DiscordConfig;
    notifications: NotificationConfig;
    backup: BackupConfig;
}
export interface EnvVariables {
    [key: string]: string;
}
export declare class ConfigManager {
    private config;
    constructor();
    load(): Promise<Config>;
    private mergeConfig;
    save(): Promise<void>;
    get<T = any>(key: string): T;
    set(key: string, value: any): void;
    getAll(): Config;
    reset(): Promise<void>;
    loadEnv(): Promise<EnvVariables>;
    saveEnv(env: EnvVariables): Promise<void>;
}
declare const _default: ConfigManager;
export default _default;
//# sourceMappingURL=config.d.ts.map