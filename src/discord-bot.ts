import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  EmbedBuilder,
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  Collection
} from 'discord.js';
import { config as dotenvConfig } from 'dotenv';
import config from './config.js';
import serverManager, { PlayerEvent, StopEvent } from './server-manager.js';
import chalk from 'chalk';

dotenvConfig();

interface EmbedOptions {
  title: string;
  description: string;
  color: number;
  timestamp?: boolean;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

class DiscordBot {
  private client: Client | null = null;
  private channel: TextChannel | null = null;

  async initialize(): Promise<void> {
    await config.load();

    if (!config.get<boolean>('discord.enabled')) {
      console.log(chalk.yellow('Discord integration is disabled in configuration.'));
      process.exit(0);
    }

    const token = process.env.DISCORD_BOT_TOKEN || config.get<string>('discord.botToken');
    if (!token) {
      console.error(chalk.red('Discord bot token not found. Please run setup wizard first.'));
      process.exit(1);
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
      ],
    });

    await this.registerCommands();
    await this.setupEventHandlers();
    await this.login(token);
  }

  private async registerCommands(): Promise<void> {
    const commands = [
      new SlashCommandBuilder()
        .setName('server-on')
        .setDescription('Start the Hytale server'),

      new SlashCommandBuilder()
        .setName('server-off')
        .setDescription('Stop the Hytale server')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for stopping the server')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('server-restart')
        .setDescription('Restart the Hytale server')
        .addStringOption(option =>
          option.setName('reason')
            .setDescription('Reason for restarting the server')
            .setRequired(false)
        ),

      new SlashCommandBuilder()
        .setName('server-status')
        .setDescription('Get the current server status'),

      new SlashCommandBuilder()
        .setName('server-command')
        .setDescription('Send a command to the server console')
        .addStringOption(option =>
          option.setName('command')
            .setDescription('The command to send')
            .setRequired(true)
        ),

      new SlashCommandBuilder()
        .setName('server-players')
        .setDescription('Get the current player count'),

      new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Get detailed server information'),
    ];

    const rest = new REST({ version: '10' }).setToken(
      process.env.DISCORD_BOT_TOKEN || config.get<string>('discord.botToken')
    );

    try {
      console.log(chalk.blue('Registering Discord slash commands...'));

      await rest.put(
        Routes.applicationGuildCommands(
          config.get<string>('discord.clientId') || process.env.DISCORD_CLIENT_ID || 'YOUR_CLIENT_ID',
          config.get<string>('discord.guildId')
        ),
        { body: commands.map(cmd => cmd.toJSON()) }
      );

      console.log(chalk.green('✓ Discord slash commands registered successfully!'));
    } catch (error) {
      console.error(chalk.red('Error registering commands:'), error);
    }
  }

  private async setupEventHandlers(): Promise<void> {
    if (!this.client) return;

    this.client.on('ready', async () => {
      if (!this.client) return;
      console.log(chalk.green(`✓ Discord bot logged in as ${this.client.user?.tag}`));

      // Get notification channel
      const channelId = config.get<string>('discord.channelId');
      if (channelId && this.client) {
        try {
          const channel = await this.client.channels.fetch(channelId);
          if (channel?.isTextBased() && 'name' in channel) {
            this.channel = channel as TextChannel;
            console.log(chalk.green(`✓ Notification channel connected: #${this.channel.name}`));
          }
        } catch (error) {
          console.error(chalk.red('Failed to fetch notification channel:'), error);
        }
      }

      // Initialize server manager
      await serverManager.initialize();
      this.setupServerEventHandlers();

      // Send startup message
      if (this.channel && config.get<boolean>('discord.statusUpdates')) {
        await this.sendEmbed({
          title: '🤖 Discord Bot Online',
          description: 'The Hytale server management bot is now online and ready to accept commands.',
          color: 0x00ff00,
        });
      }
    });

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      await this.handleCommand(interaction);
    });

    this.client.on('error', (error: Error) => {
      console.error(chalk.red('Discord client error:'), error);
    });
  }

  private setupServerEventHandlers(): void {
    serverManager.on('started', async () => {
      if (this.channel && config.get<boolean>('discord.statusUpdates')) {
        await this.sendEmbed({
          title: '✅ Server Started',
          description: 'The Hytale server has started successfully.',
          color: 0x00ff00,
          timestamp: true,
        });
      }
    });

    serverManager.on('stopped', async ({ code, signal: _signal }: StopEvent) => {
      if (this.channel && config.get<boolean>('discord.statusUpdates')) {
        await this.sendEmbed({
          title: '🛑 Server Stopped',
          description: `The Hytale server has stopped. Exit code: ${code || 'N/A'}`,
          color: 0xff9900,
          timestamp: true,
        });
      }
    });

    serverManager.on('crashed', async ({ code, signal: _signal }: StopEvent) => {
      if (this.channel && config.get<boolean>('discord.statusUpdates')) {
        await this.sendEmbed({
          title: '💥 Server Crashed',
          description: `The Hytale server has crashed! Exit code: ${code || 'N/A'}`,
          color: 0xff0000,
          timestamp: true,
        });
      }
    });

    serverManager.on('playerJoin', async ({ playerName, playerCount }: PlayerEvent) => {
      if (this.channel && config.get<boolean>('notifications.playerJoin')) {
        await this.sendEmbed({
          title: '👋 Player Joined',
          description: `**${playerName}** joined the server\nPlayers online: ${playerCount}/${config.get<number>('server.maxPlayers')}`,
          color: 0x00ff00,
          timestamp: true,
        });
      }
    });

    serverManager.on('playerLeave', async ({ playerName, playerCount }: PlayerEvent) => {
      if (this.channel && config.get<boolean>('notifications.playerLeave')) {
        await this.sendEmbed({
          title: '👋 Player Left',
          description: `**${playerName}** left the server\nPlayers online: ${playerCount}/${config.get<number>('server.maxPlayers')}`,
          color: 0xffaa00,
          timestamp: true,
        });
      }
    });

    serverManager.on('error', async (error: string | Error) => {
      if (this.channel) {
        const errorMsg = typeof error === 'string' ? error : error.message;
        await this.sendEmbed({
          title: '⚠️ Server Error',
          description: `An error occurred: ${errorMsg}`,
          color: 0xff0000,
          timestamp: true,
        });
      }
    });
  }

  private async handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    const adminRoleId = config.get<string>('discord.adminRoleId');

    // Check if user has admin role (if configured)
    if (adminRoleId && !interaction.member?.roles) {
      await interaction.reply({
        content: '❌ Unable to verify permissions.',
        ephemeral: true,
      });
      return;
    }

    if (adminRoleId && interaction.member?.roles) {
      const roles = interaction.member.roles;
      const hasRole = roles instanceof Collection ? roles.has(adminRoleId) : false;

      if (!hasRole) {
        await interaction.reply({
          content: '❌ You do not have permission to use this command.',
          ephemeral: true,
        });
        return;
      }
    }

    try {
      switch (interaction.commandName) {
        case 'server-on':
          await this.handleServerOn(interaction);
          break;
        case 'server-off':
          await this.handleServerOff(interaction);
          break;
        case 'server-restart':
          await this.handleServerRestart(interaction);
          break;
        case 'server-status':
          await this.handleServerStatus(interaction);
          break;
        case 'server-command':
          await this.handleServerCommand(interaction);
          break;
        case 'server-players':
          await this.handleServerPlayers(interaction);
          break;
        case 'server-info':
          await this.handleServerInfo(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Unknown command.',
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error(chalk.red('Error handling command:'), error);
      await interaction.reply({
        content: `❌ An error occurred: ${(error as Error).message}`,
        ephemeral: true,
      }).catch(() => {});
    }
  }

  private async handleServerOn(interaction: ChatInputCommandInteraction): Promise<void> {
    if (serverManager.isRunning) {
      await interaction.reply({
        content: '⚠️ Server is already running.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    try {
      await serverManager.start();
      await interaction.editReply('✅ Server started successfully!');
    } catch (error) {
      await interaction.editReply(`❌ Failed to start server: ${(error as Error).message}`);
    }
  }

  private async handleServerOff(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!serverManager.isRunning) {
      await interaction.reply({
        content: '⚠️ Server is not running.',
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const reason = interaction.options.getString('reason') || 'Stopped via Discord';

    try {
      await serverManager.stop(reason);
      await interaction.editReply(`✅ Server stopped. Reason: ${reason}`);
    } catch (error) {
      await interaction.editReply(`❌ Failed to stop server: ${(error as Error).message}`);
    }
  }

  private async handleServerRestart(interaction: ChatInputCommandInteraction): Promise<void> {
    await interaction.deferReply();

    const reason = interaction.options.getString('reason') || 'Restarted via Discord';

    try {
      await serverManager.restart(reason);
      await interaction.editReply(`✅ Server restarted. Reason: ${reason}`);
    } catch (error) {
      await interaction.editReply(`❌ Failed to restart server: ${(error as Error).message}`);
    }
  }

  private async handleServerStatus(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = serverManager.getStatus();

    const embed = new EmbedBuilder()
      .setTitle('🖥️ Server Status')
      .setColor(status.isRunning ? 0x00ff00 : 0xff0000)
      .addFields(
        { name: 'Status', value: status.isRunning ? '🟢 Online' : '🔴 Offline', inline: true },
        { name: 'Players', value: `${status.playerCount}/${config.get<number>('server.maxPlayers')}`, inline: true },
        { name: 'Uptime', value: this.formatUptime(status.uptime), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async handleServerCommand(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!serverManager.isRunning) {
      await interaction.reply({
        content: '⚠️ Server is not running.',
        ephemeral: true,
      });
      return;
    }

    const command = interaction.options.getString('command');
    if (!command) {
      await interaction.reply({
        content: '❌ Command is required.',
        ephemeral: true,
      });
      return;
    }

    try {
      serverManager.sendCommand(command);
      await interaction.reply({
        content: `✅ Command sent to server: \`${command}\``,
        ephemeral: true,
      });
    } catch (error) {
      await interaction.reply({
        content: `❌ Failed to send command: ${(error as Error).message}`,
        ephemeral: true,
      });
    }
  }

  private async handleServerPlayers(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = serverManager.getStatus();

    await interaction.reply({
      content: `👥 Players online: **${status.playerCount}/${config.get<number>('server.maxPlayers')}**`,
    });
  }

  private async handleServerInfo(interaction: ChatInputCommandInteraction): Promise<void> {
    const status = serverManager.getStatus();

    const embed = new EmbedBuilder()
      .setTitle('📊 Server Information')
      .setColor(0x0099ff)
      .addFields(
        { name: 'Server Name', value: config.get<string>('server.name'), inline: false },
        { name: 'Status', value: status.isRunning ? '🟢 Online' : '🔴 Offline', inline: true },
        { name: 'Max Players', value: config.get<number>('server.maxPlayers').toString(), inline: true },
        { name: 'Game Mode', value: config.get<string>('server.gameMode') || 'Adventure', inline: true },
        { name: 'Default World', value: config.get<string>('server.defaultWorld') || 'default', inline: true },
        { name: 'PvP', value: config.get<boolean>('world.pvpEnabled') ? 'Enabled' : 'Disabled', inline: true },
        { name: 'Uptime', value: this.formatUptime(status.uptime), inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  private async sendEmbed(options: EmbedOptions): Promise<void> {
    if (!this.channel) return;

    const embed = new EmbedBuilder()
      .setTitle(options.title)
      .setDescription(options.description)
      .setColor(options.color);

    if (options.timestamp) {
      embed.setTimestamp();
    }

    if (options.fields) {
      embed.addFields(options.fields);
    }

    try {
      await this.channel.send({ embeds: [embed] });
    } catch (error) {
      console.error(chalk.red('Failed to send embed:'), error);
    }
  }

  private formatUptime(ms: number): string {
    if (ms === 0) return 'Not running';

    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private async login(token: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.login(token);
    } catch (error) {
      console.error(chalk.red('Failed to login to Discord:'), error);
      process.exit(1);
    }
  }

  async shutdown(): Promise<void> {
    console.log(chalk.yellow('Shutting down Discord bot...'));

    if (serverManager.isRunning) {
      await serverManager.cleanup();
    }

    if (this.client) {
      await this.client.destroy();
    }

    process.exit(0);
  }
}

// Create and run the bot
const bot = new DiscordBot();

// Handle shutdown signals
process.on('SIGINT', () => bot.shutdown());
process.on('SIGTERM', () => bot.shutdown());

bot.initialize().catch((error: Error) => {
  console.error(chalk.red('Error initializing Discord bot:'), error);
  process.exit(1);
});
