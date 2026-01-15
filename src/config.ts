import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const ENV_PATH = path.join(__dirname, '..', '.env');

// Type definitions
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

// Default configuration
const DEFAULT_CONFIG: Config = {
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
  private config: Config;

  constructor() {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  }

  async load(): Promise<Config> {
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      const loadedConfig = JSON.parse(data);
      this.config = this.mergeConfig(DEFAULT_CONFIG, loadedConfig);
      return this.config;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, create it with defaults
        await this.save();
        return this.config;
      }
      throw error;
    }
  }

  private mergeConfig(defaults: Config, loaded: Partial<Config>): Config {
    return {
      server: { ...defaults.server, ...loaded.server },
      discord: { ...defaults.discord, ...loaded.discord },
      notifications: { ...defaults.notifications, ...loaded.notifications },
      backup: { ...defaults.backup, ...loaded.backup },
    };
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to save configuration: ${(error as Error).message}`);
    }
  }

  get<T = any>(key: string): T {
    const keys = key.split('.');
    let value: any = this.config;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined as T;
      }
    }
    return value as T;
  }

  set(key: string, value: any): void {
    const keys = key.split('.');
    let obj: any = this.config;
    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in obj) || typeof obj[k] !== 'object') {
        obj[k] = {};
      }
      obj = obj[k];
    }
    obj[keys[keys.length - 1]] = value;
  }

  getAll(): Config {
    return JSON.parse(JSON.stringify(this.config));
  }

  async reset(): Promise<void> {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    await this.save();
  }

  async loadEnv(): Promise<EnvVariables> {
    try {
      const data = await fs.readFile(ENV_PATH, 'utf-8');
      const lines = data.split('\n');
      const env: EnvVariables = {};
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          const value = valueParts.join('=').trim();
          env[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      }
      return env;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {};
      }
      throw error;
    }
  }

  async saveEnv(env: EnvVariables): Promise<void> {
    const lines = Object.entries(env).map(([key, value]) => {
      const needsQuotes = value.includes(' ') || value.includes('#');
      return `${key}=${needsQuotes ? `"${value}"` : value}`;
    });
    await fs.writeFile(ENV_PATH, lines.join('\n'), 'utf-8');
  }
}

export default new ConfigManager();
