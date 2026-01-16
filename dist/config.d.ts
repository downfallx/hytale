export interface HytaleServerConfig {
    Version: number;
    ServerName: string;
    MOTD: string;
    Password: string;
    MaxPlayers: number;
    MaxViewRadius: number;
    LocalCompressionEnabled: boolean;
    Defaults: {
        World: string;
        GameMode: 'Adventure' | 'Creative' | 'Survival';
    };
    ConnectionTimeouts: {
        JoinTimeouts: Record<string, unknown>;
    };
    RateLimit: Record<string, unknown>;
    Modules: Record<string, unknown>;
    LogLevels: Record<string, unknown>;
    Mods: Record<string, unknown>;
    DisplayTmpTagsInStrings: boolean;
    PlayerStorage: {
        Type: string;
    };
}
export interface HytaleWorldConfig {
    Version: number;
    UUID?: {
        $binary: string;
        $type: string;
    };
    Seed: number;
    WorldGen: {
        Type: string;
        Name: string;
    };
    WorldMap: {
        Type: string;
    };
    ChunkStorage: {
        Type: string;
    };
    ChunkConfig: Record<string, unknown>;
    IsTicking: boolean;
    IsBlockTicking: boolean;
    IsPvpEnabled: boolean;
    IsFallDamageEnabled: boolean;
    IsGameTimePaused: boolean;
    GameTime?: string;
    ClientEffects: {
        SunHeightPercent: number;
        SunAngleDegrees: number;
        BloomIntensity: number;
        BloomPower: number;
        SunIntensity: number;
        SunshaftIntensity: number;
        SunshaftScaleFactor: number;
    };
    RequiredPlugins: Record<string, unknown>;
    IsSpawningNPC: boolean;
    IsSpawnMarkersEnabled: boolean;
    IsAllNPCFrozen: boolean;
    GameplayConfig: string;
    IsCompassUpdating: boolean;
    IsSavingPlayers: boolean;
    IsSavingChunks: boolean;
    SaveNewChunks: boolean;
    IsUnloadingChunks: boolean;
    IsObjectiveMarkersEnabled: boolean;
    DeleteOnUniverseStart: boolean;
    DeleteOnRemove: boolean;
    ResourceStorage: {
        Type: string;
    };
    Plugin: Record<string, unknown>;
}
export interface ServerConfig {
    name: string;
    motd: string;
    password: string;
    maxPlayers: number;
    maxViewRadius: number;
    defaultWorld: string;
    gameMode: 'Adventure' | 'Creative' | 'Survival';
    autoRestart: boolean;
    restartInterval: number;
    javaArgs: string;
    serverPath: string;
    assetsPath: string;
    authToken?: string;
}
export interface WorldSettings {
    seed?: number;
    pvpEnabled: boolean;
    fallDamageEnabled: boolean;
    npcSpawning: boolean;
    gameplayConfig: string;
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
    world: WorldSettings;
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
    /**
     * Write the Hytale server config.json file
     * This is the main server configuration at hytale-server/config.json
     */
    writeHytaleServerConfig(): Promise<void>;
    /**
     * Write the Hytale world config.json file
     * This is the per-world configuration at hytale-server/universe/worlds/{worldName}/config.json
     */
    writeHytaleWorldConfig(worldName?: string): Promise<void>;
    /**
     * Write both Hytale server and world configs
     */
    writeHytaleConfigs(worldName?: string): Promise<void>;
}
declare const _default: ConfigManager;
export default _default;
//# sourceMappingURL=config.d.ts.map