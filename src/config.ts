import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');
const ENV_PATH = path.join(__dirname, '..', '.env');

// Type definitions

// Matches the real Hytale server config.json format
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
  AuthCredentialStore: {
    Type: string;
    Path: string;
  };
}

// Matches the real Hytale world config.json format (universe/worlds/{world}/config.json)
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

// Internal manager config (what we store in our config.json)
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

// World settings stored in our config
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

// Default configuration
const DEFAULT_CONFIG: Config = {
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
      world: { ...defaults.world, ...loaded.world },
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

  /**
   * Write the Hytale server config.json file
   * This is the main server configuration at hytale-server/config.json
   */
  async writeHytaleServerConfig(): Promise<void> {
    const serverPath = this.get<string>('server.serverPath');
    const configPath = path.join(serverPath, 'config.json');

    // Read existing config to preserve unknown fields
    let existingConfig: Partial<HytaleServerConfig> = {};
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      existingConfig = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }

    const hytaleConfig: HytaleServerConfig = {
      Version: existingConfig.Version || 3,
      ServerName: this.get<string>('server.name'),
      MOTD: this.get<string>('server.motd') || '',
      Password: this.get<string>('server.password') || '',
      MaxPlayers: this.get<number>('server.maxPlayers'),
      MaxViewRadius: this.get<number>('server.maxViewRadius') || 32,
      LocalCompressionEnabled: existingConfig.LocalCompressionEnabled ?? false,
      Defaults: {
        World: this.get<string>('server.defaultWorld') || 'default',
        GameMode: this.get<'Adventure' | 'Creative' | 'Survival'>('server.gameMode') || 'Adventure',
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
  async writeHytaleWorldConfig(worldName?: string): Promise<void> {
    const serverPath = this.get<string>('server.serverPath');
    const targetWorld = worldName || this.get<string>('server.defaultWorld') || 'default';
    const worldDir = path.join(serverPath, 'universe', 'worlds', targetWorld);
    const configPath = path.join(worldDir, 'config.json');

    // Ensure world directory exists
    await fs.mkdir(worldDir, { recursive: true });

    // Read existing config to preserve UUID and other generated fields
    let existingConfig: Partial<HytaleWorldConfig> = {};
    try {
      const data = await fs.readFile(configPath, 'utf-8');
      existingConfig = JSON.parse(data);
    } catch {
      // File doesn't exist, start fresh
    }

    // Generate seed if not specified
    const seed = this.get<number>('world.seed') || existingConfig.Seed || Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

    const worldConfig: HytaleWorldConfig = {
      Version: existingConfig.Version || 4,
      UUID: existingConfig.UUID, // Preserve existing UUID if any
      Seed: seed,
      WorldGen: existingConfig.WorldGen || { Type: 'Hytale', Name: 'Default' },
      WorldMap: existingConfig.WorldMap || { Type: 'WorldGen' },
      ChunkStorage: existingConfig.ChunkStorage || { Type: 'Hytale' },
      ChunkConfig: existingConfig.ChunkConfig || {},
      IsTicking: existingConfig.IsTicking ?? true,
      IsBlockTicking: existingConfig.IsBlockTicking ?? true,
      IsPvpEnabled: this.get<boolean>('world.pvpEnabled') ?? false,
      IsFallDamageEnabled: this.get<boolean>('world.fallDamageEnabled') ?? true,
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
      IsSpawningNPC: this.get<boolean>('world.npcSpawning') ?? true,
      IsSpawnMarkersEnabled: existingConfig.IsSpawnMarkersEnabled ?? true,
      IsAllNPCFrozen: existingConfig.IsAllNPCFrozen ?? false,
      GameplayConfig: this.get<string>('world.gameplayConfig') || 'Default',
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
  async writeHytaleConfigs(worldName?: string): Promise<void> {
    await this.writeHytaleServerConfig();
    await this.writeHytaleWorldConfig(worldName);
  }
}

export default new ConfigManager();
