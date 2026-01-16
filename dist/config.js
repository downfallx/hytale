import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const ENV_PATH = path.join(__dirname, '..', '.env');
// Default configuration
const DEFAULT_CONFIG = {
    server: {
        name: 'Hytale Server',
        motd: 'Welcome to Hytale!',
        password: '',
        maxPlayers: 100,
        maxViewRadius: 32,
        defaultWorld: 'default',
        gameMode: 'Adventure',
        autoRestart: false,
        restartInterval: 21600000, // 6 hours in milliseconds
        javaArgs: '-Xmx2G -Xms1G',
        serverPath: './hytale-server',
        assetsPath: './hytale-server/Assets.zip',
    },
    world: {
        pvpEnabled: false,
        fallDamageEnabled: true,
        npcSpawning: true,
        gameplayConfig: 'Default',
    },
    discord: {
        enabled: false,
        botToken: '',
        guildId: '',
        channelId: '',
        adminRoleId: '',
        statusUpdates: true,
    },
    notifications: {
        playerJoin: true,
        playerLeave: true,
        serverStart: true,
        serverStop: true,
        serverCrash: true,
    },
    backup: {
        enabled: false,
        interval: 86400000, // 24 hours in milliseconds
        backupPath: './backups',
        maxBackups: 5,
    },
};
export class ConfigManager {
    config;
    constructor() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    }
    async load() {
        try {
            const data = await fs.readFile(CONFIG_PATH, 'utf-8');
            const loadedConfig = JSON.parse(data);
            this.config = this.mergeConfig(DEFAULT_CONFIG, loadedConfig);
            return this.config;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Config file doesn't exist, create it with defaults
                await this.save();
                return this.config;
            }
            throw error;
        }
    }
    mergeConfig(defaults, loaded) {
        return {
            server: { ...defaults.server, ...loaded.server },
            world: { ...defaults.world, ...loaded.world },
            discord: { ...defaults.discord, ...loaded.discord },
            notifications: { ...defaults.notifications, ...loaded.notifications },
            backup: { ...defaults.backup, ...loaded.backup },
        };
    }
    async save() {
        try {
            await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
        }
        catch (error) {
            throw new Error(`Failed to save configuration: ${error.message}`);
        }
    }
    get(key) {
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k];
            }
            else {
                return undefined;
            }
        }
        return value;
    }
    set(key, value) {
        const keys = key.split('.');
        let obj = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
            const k = keys[i];
            if (!(k in obj) || typeof obj[k] !== 'object') {
                obj[k] = {};
            }
            obj = obj[k];
        }
        obj[keys[keys.length - 1]] = value;
    }
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }
    async reset() {
        this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
        await this.save();
    }
    async loadEnv() {
        try {
            const data = await fs.readFile(ENV_PATH, 'utf-8');
            const lines = data.split('\n');
            const env = {};
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    const [key, ...valueParts] = trimmed.split('=');
                    const value = valueParts.join('=').trim();
                    env[key.trim()] = value.replace(/^["']|["']$/g, '');
                }
            }
            return env;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return {};
            }
            throw error;
        }
    }
    async saveEnv(env) {
        const lines = Object.entries(env).map(([key, value]) => {
            const needsQuotes = value.includes(' ') || value.includes('#');
            return `${key}=${needsQuotes ? `"${value}"` : value}`;
        });
        await fs.writeFile(ENV_PATH, lines.join('\n'), 'utf-8');
    }
    /**
     * Write the Hytale server config.json file
     * This is the main server configuration at hytale-server/config.json
     */
    async writeHytaleServerConfig() {
        const serverPath = this.get('server.serverPath');
        const configPath = path.join(serverPath, 'config.json');
        // Read existing config to preserve unknown fields
        let existingConfig = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            existingConfig = JSON.parse(data);
        }
        catch {
            // File doesn't exist, start fresh
        }
        const hytaleConfig = {
            Version: existingConfig.Version || 3,
            ServerName: this.get('server.name'),
            MOTD: this.get('server.motd') || '',
            Password: this.get('server.password') || '',
            MaxPlayers: this.get('server.maxPlayers'),
            MaxViewRadius: this.get('server.maxViewRadius') || 32,
            LocalCompressionEnabled: existingConfig.LocalCompressionEnabled ?? false,
            Defaults: {
                World: this.get('server.defaultWorld') || 'default',
                GameMode: this.get('server.gameMode') || 'Adventure',
            },
            ConnectionTimeouts: existingConfig.ConnectionTimeouts || { JoinTimeouts: {} },
            RateLimit: existingConfig.RateLimit || {},
            Modules: existingConfig.Modules || {},
            LogLevels: existingConfig.LogLevels || {},
            Mods: existingConfig.Mods || {},
            DisplayTmpTagsInStrings: existingConfig.DisplayTmpTagsInStrings ?? false,
            PlayerStorage: existingConfig.PlayerStorage || { Type: 'Hytale' },
            AuthCredentialStore: existingConfig.AuthCredentialStore || { Type: 'Encrypted', Path: 'auth.enc' },
        };
        await fs.writeFile(configPath, JSON.stringify(hytaleConfig, null, 2), 'utf-8');
    }
    /**
     * Write the Hytale world config.json file
     * This is the per-world configuration at hytale-server/universe/worlds/{worldName}/config.json
     */
    async writeHytaleWorldConfig(worldName) {
        const serverPath = this.get('server.serverPath');
        const targetWorld = worldName || this.get('server.defaultWorld') || 'default';
        const worldDir = path.join(serverPath, 'universe', 'worlds', targetWorld);
        const configPath = path.join(worldDir, 'config.json');
        // Ensure world directory exists
        await fs.mkdir(worldDir, { recursive: true });
        // Read existing config to preserve UUID and other generated fields
        let existingConfig = {};
        try {
            const data = await fs.readFile(configPath, 'utf-8');
            existingConfig = JSON.parse(data);
        }
        catch {
            // File doesn't exist, start fresh
        }
        // Generate seed if not specified
        const seed = this.get('world.seed') || existingConfig.Seed || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        const worldConfig = {
            Version: existingConfig.Version || 4,
            UUID: existingConfig.UUID, // Preserve existing UUID if any
            Seed: seed,
            WorldGen: existingConfig.WorldGen || { Type: 'Hytale', Name: 'Default' },
            WorldMap: existingConfig.WorldMap || { Type: 'WorldGen' },
            ChunkStorage: existingConfig.ChunkStorage || { Type: 'Hytale' },
            ChunkConfig: existingConfig.ChunkConfig || {},
            IsTicking: existingConfig.IsTicking ?? true,
            IsBlockTicking: existingConfig.IsBlockTicking ?? true,
            IsPvpEnabled: this.get('world.pvpEnabled') ?? false,
            IsFallDamageEnabled: this.get('world.fallDamageEnabled') ?? true,
            IsGameTimePaused: existingConfig.IsGameTimePaused ?? false,
            GameTime: existingConfig.GameTime,
            ClientEffects: existingConfig.ClientEffects || {
                SunHeightPercent: 100.0,
                SunAngleDegrees: 0.0,
                BloomIntensity: 0.3,
                BloomPower: 8.0,
                SunIntensity: 0.25,
                SunshaftIntensity: 0.3,
                SunshaftScaleFactor: 4.0,
            },
            RequiredPlugins: existingConfig.RequiredPlugins || {},
            IsSpawningNPC: this.get('world.npcSpawning') ?? true,
            IsSpawnMarkersEnabled: existingConfig.IsSpawnMarkersEnabled ?? true,
            IsAllNPCFrozen: existingConfig.IsAllNPCFrozen ?? false,
            GameplayConfig: this.get('world.gameplayConfig') || 'Default',
            IsCompassUpdating: existingConfig.IsCompassUpdating ?? true,
            IsSavingPlayers: existingConfig.IsSavingPlayers ?? true,
            IsSavingChunks: existingConfig.IsSavingChunks ?? true,
            SaveNewChunks: existingConfig.SaveNewChunks ?? true,
            IsUnloadingChunks: existingConfig.IsUnloadingChunks ?? true,
            IsObjectiveMarkersEnabled: existingConfig.IsObjectiveMarkersEnabled ?? true,
            DeleteOnUniverseStart: existingConfig.DeleteOnUniverseStart ?? false,
            DeleteOnRemove: existingConfig.DeleteOnRemove ?? false,
            ResourceStorage: existingConfig.ResourceStorage || { Type: 'Hytale' },
            Plugin: existingConfig.Plugin || {},
        };
        await fs.writeFile(configPath, JSON.stringify(worldConfig, null, 2), 'utf-8');
    }
    /**
     * Write both Hytale server and world configs
     */
    async writeHytaleConfigs(worldName) {
        await this.writeHytaleServerConfig();
        await this.writeHytaleWorldConfig(worldName);
    }
}
export default new ConfigManager();
//# sourceMappingURL=config.js.map