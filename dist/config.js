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
        name: 'My Hytale Server',
        port: 25565,
        maxPlayers: 20,
        difficulty: 'normal',
        gamemode: 'survival',
        pvp: true,
        motd: 'Welcome to my Hytale Server!',
        autoRestart: false,
        restartInterval: 21600000, // 6 hours in milliseconds
        javaArgs: '-Xmx2G -Xms1G',
        serverPath: './hytale-server',
        assetsPath: './hytale-server/assets.zip',
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
}
export default new ConfigManager();
//# sourceMappingURL=config.js.map