#!/usr/bin/env node

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora, { Ora } from 'ora';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { createWriteStream } from 'fs';
import https from 'https';
import config from './config.js';
import serverManager from './server-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BasicServerAnswers {
  serverName: string;
  port: number;
  maxPlayers: number;
  motd: string;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  pvp: boolean;
}

interface AdvancedServerAnswers {
  javaArgs: string;
  autoRestart: boolean;
}

interface RestartConfigAnswers {
  restartHours: number;
}

interface DiscordAnswers {
  enableDiscord: boolean;
}

interface DiscordDetailsAnswers {
  botToken: string;
  guildId: string;
  channelId: string;
  adminRoleId: string;
  statusUpdates: boolean;
}

interface BackupAnswers {
  enableBackups: boolean;
}

interface BackupDetailsAnswers {
  backupHours: number;
  maxBackups: number;
}

interface ServerPathAnswers {
  serverPath: string;
  assetsPath: string;
}

interface FinalAnswers {
  saveConfig: boolean;
}

interface StartServerAnswers {
  startServer: boolean;
}

class SetupWizard {
  private answers: Record<string, any> = {};

  async run(): Promise<void> {
    console.log();
    console.log(chalk.blue.bold('╔═══════════════════════════════════════════════════════╗'));
    console.log(chalk.blue.bold('║                                                       ║'));
    console.log(chalk.blue.bold('║        Hytale Server Setup Wizard                     ║'));
    console.log(chalk.blue.bold('║                                                       ║'));
    console.log(chalk.blue.bold('╚═══════════════════════════════════════════════════════╝'));
    console.log();
    console.log(chalk.gray('This wizard will guide you through setting up your Hytale server.'));
    console.log();

    await this.checkPrerequisites();
    await this.basicServerSetup();
    await this.advancedServerSetup();
    await this.discordSetup();
    await this.backupSetup();
    await this.downloadServerFiles();
    await this.reviewConfiguration();
    await this.finalizeSetup();
  }

  private async checkPrerequisites(): Promise<void> {
    const spinner: Ora = ora('Checking prerequisites...').start();

    try {
      // Check Java
      try {
        const javaVersionOutput = execSync('java -version 2>&1').toString();
        const versionMatch = javaVersionOutput.match(/version "(\d+)\.?(\d+)?\.?(\d+)?/);

        if (versionMatch) {
          const majorVersion = parseInt(versionMatch[1]);
          if (majorVersion >= 25) {
            spinner.succeed(chalk.green(`Java ${majorVersion} is installed`));
          } else {
            spinner.warn(chalk.yellow(`Java ${majorVersion} found. Hytale server requires Java 25 or higher.`));
          }
        } else {
          spinner.succeed(chalk.green('Java is installed (version unknown)'));
        }
      } catch {
        spinner.warn(chalk.yellow('Java not found. You will need Java 25 or higher to run the Hytale server.'));
      }

      // Load existing config if any
      await config.load();
      spinner.succeed(chalk.green('Configuration loaded'));
    } catch (error) {
      spinner.fail(chalk.red(`Error checking prerequisites: ${(error as Error).message}`));
    }
  }

  private async basicServerSetup(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Basic Server Configuration ==='));
    console.log();

    const answers = await inquirer.prompt<BasicServerAnswers>([
      {
        type: 'input',
        name: 'serverName',
        message: 'Server name:',
        default: config.get<string>('server.name') || 'My Hytale Server',
        validate: (input: string) => input.trim().length > 0 || 'Server name cannot be empty',
      },
      {
        type: 'number',
        name: 'port',
        message: 'Server port:',
        default: config.get<number>('server.port') || 25565,
        validate: (input: number) => {
          const num = parseInt(input.toString());
          return (num >= 1024 && num <= 65535) || 'Port must be between 1024 and 65535';
        },
      },
      {
        type: 'number',
        name: 'maxPlayers',
        message: 'Maximum players:',
        default: config.get<number>('server.maxPlayers') || 20,
        validate: (input: number) => {
          const num = parseInt(input.toString());
          return (num > 0 && num <= 100) || 'Max players must be between 1 and 100';
        },
      },
      {
        type: 'input',
        name: 'motd',
        message: 'Message of the day (MOTD):',
        default: config.get<string>('server.motd') || 'Welcome to my Hytale Server!',
      },
      {
        type: 'list',
        name: 'difficulty',
        message: 'Server difficulty:',
        choices: ['peaceful', 'easy', 'normal', 'hard'] as const,
        default: config.get<string>('server.difficulty') || 'normal',
      },
      {
        type: 'confirm',
        name: 'pvp',
        message: 'Enable PvP?',
        default: config.get<boolean>('server.pvp') !== undefined ? config.get<boolean>('server.pvp') : true,
      },
    ]);

    config.set('server.name', answers.serverName);
    config.set('server.port', answers.port);
    config.set('server.maxPlayers', answers.maxPlayers);
    config.set('server.motd', answers.motd);
    config.set('server.difficulty', answers.difficulty);
    config.set('server.pvp', answers.pvp);

    this.answers = { ...this.answers, ...answers };
  }

  private async advancedServerSetup(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Advanced Configuration ==='));
    console.log();

    const answers = await inquirer.prompt<AdvancedServerAnswers>([
      {
        type: 'input',
        name: 'javaArgs',
        message: 'Java arguments (for memory allocation):',
        default: config.get<string>('server.javaArgs') || '-Xmx2G -Xms1G',
        validate: (input: string) => input.trim().length > 0 || 'Java arguments cannot be empty',
      },
      {
        type: 'confirm',
        name: 'autoRestart',
        message: 'Enable automatic server restarts?',
        default: config.get<boolean>('server.autoRestart') || false,
      },
    ]);

    if (answers.autoRestart) {
      const restartConfig = await inquirer.prompt<RestartConfigAnswers>([
        {
          type: 'number',
          name: 'restartHours',
          message: 'Restart interval (in hours):',
          default: 6,
          validate: (input: number) => {
            const num = parseInt(input.toString());
            return (num > 0 && num <= 24) || 'Restart interval must be between 1 and 24 hours';
          },
        },
      ]);

      config.set('server.restartInterval', restartConfig.restartHours * 3600000);
    }

    config.set('server.javaArgs', answers.javaArgs);
    config.set('server.autoRestart', answers.autoRestart);

    this.answers = { ...this.answers, ...answers };
  }

  private async discordSetup(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Discord Bot Integration ==='));
    console.log();
    console.log(chalk.gray('Connect your server to Discord for remote management and notifications.'));
    console.log();

    const answers = await inquirer.prompt<DiscordAnswers>([
      {
        type: 'confirm',
        name: 'enableDiscord',
        message: 'Enable Discord bot integration?',
        default: config.get<boolean>('discord.enabled') || false,
      },
    ]);

    if (answers.enableDiscord) {
      const discordAnswers = await inquirer.prompt<DiscordDetailsAnswers>([
        {
          type: 'input',
          name: 'botToken',
          message: 'Discord bot token:',
          default: config.get<string>('discord.botToken') || '',
          validate: (input: string) => input.trim().length > 0 || 'Bot token is required',
        },
        {
          type: 'input',
          name: 'guildId',
          message: 'Discord server (guild) ID:',
          default: config.get<string>('discord.guildId') || '',
          validate: (input: string) => input.trim().length > 0 || 'Guild ID is required',
        },
        {
          type: 'input',
          name: 'channelId',
          message: 'Discord channel ID for notifications:',
          default: config.get<string>('discord.channelId') || '',
          validate: (input: string) => input.trim().length > 0 || 'Channel ID is required',
        },
        {
          type: 'input',
          name: 'adminRoleId',
          message: 'Discord admin role ID (for server control):',
          default: config.get<string>('discord.adminRoleId') || '',
        },
        {
          type: 'confirm',
          name: 'statusUpdates',
          message: 'Send status updates to Discord?',
          default: config.get<boolean>('discord.statusUpdates') !== undefined ? config.get<boolean>('discord.statusUpdates') : true,
        },
      ]);

      config.set('discord.enabled', true);
      config.set('discord.botToken', discordAnswers.botToken);
      config.set('discord.guildId', discordAnswers.guildId);
      config.set('discord.channelId', discordAnswers.channelId);
      config.set('discord.adminRoleId', discordAnswers.adminRoleId);
      config.set('discord.statusUpdates', discordAnswers.statusUpdates);

      // Save bot token to .env file
      await config.saveEnv({
        DISCORD_BOT_TOKEN: discordAnswers.botToken,
      });
    } else {
      config.set('discord.enabled', false);
    }

    this.answers = { ...this.answers, ...answers };
  }

  private async backupSetup(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Backup Configuration ==='));
    console.log();

    const answers = await inquirer.prompt<BackupAnswers>([
      {
        type: 'confirm',
        name: 'enableBackups',
        message: 'Enable automatic backups?',
        default: config.get<boolean>('backup.enabled') || false,
      },
    ]);

    if (answers.enableBackups) {
      const backupAnswers = await inquirer.prompt<BackupDetailsAnswers>([
        {
          type: 'number',
          name: 'backupHours',
          message: 'Backup interval (in hours):',
          default: 24,
          validate: (input: number) => {
            const num = parseInt(input.toString());
            return num > 0 || 'Backup interval must be greater than 0';
          },
        },
        {
          type: 'number',
          name: 'maxBackups',
          message: 'Maximum number of backups to keep:',
          default: config.get<number>('backup.maxBackups') || 5,
          validate: (input: number) => {
            const num = parseInt(input.toString());
            return num > 0 || 'Must keep at least 1 backup';
          },
        },
      ]);

      config.set('backup.enabled', true);
      config.set('backup.interval', backupAnswers.backupHours * 3600000);
      config.set('backup.maxBackups', backupAnswers.maxBackups);
    } else {
      config.set('backup.enabled', false);
    }
  }

  private async downloadFile(url: string, dest: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const file = createWriteStream(dest);
      https.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Handle redirect
          file.close();
          if (response.headers.location) {
            this.downloadFile(response.headers.location, dest).then(resolve).catch(reject);
          } else {
            reject(new Error('Redirect location not found'));
          }
          return;
        }

        if (response.statusCode !== 200) {
          file.close();
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        file.close();
        reject(err);
      });
    });
  }

  private async setupHytaleDownloader(): Promise<string> {
    const downloaderDir = path.join(__dirname, '..', 'hytale-downloader');
    const downloaderBinary = path.join(downloaderDir, 'hytale-downloader-linux-amd64');
    const downloaderZip = path.join(downloaderDir, 'hytale-downloader.zip');

    // Check if downloader already exists
    try {
      await fs.access(downloaderBinary);
      console.log(chalk.green('✓ Hytale downloader found'));
      return downloaderBinary;
    } catch {
      // Downloader doesn't exist, need to download it
    }

    console.log();
    console.log(chalk.yellow('Hytale downloader not found.'));

    const downloadAnswer = await inquirer.prompt<{ download: boolean }>([
      {
        type: 'confirm',
        name: 'download',
        message: 'Download hytale-downloader from https://downloader.hytale.com/hytale-downloader.zip?',
        default: true,
      },
    ]);

    if (!downloadAnswer.download) {
      throw new Error('Cannot proceed without hytale-downloader');
    }

    // Create downloader directory
    await fs.mkdir(downloaderDir, { recursive: true });

    // Download the zip
    const spinner = ora('Downloading hytale-downloader.zip...').start();
    try {
      await this.downloadFile('https://downloader.hytale.com/hytale-downloader.zip', downloaderZip);
      spinner.succeed(chalk.green('Downloaded hytale-downloader.zip'));
    } catch (error) {
      spinner.fail(chalk.red(`Failed to download: ${(error as Error).message}`));
      throw error;
    }

    // Extract the zip
    spinner.start('Extracting hytale-downloader.zip...');
    try {
      execSync(`unzip -o "${downloaderZip}" -d "${downloaderDir}"`, { stdio: 'pipe' });
      spinner.succeed(chalk.green('Extracted hytale-downloader'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to extract zip. Make sure unzip is installed.'));
      throw error;
    }

    // Make it executable
    try {
      await fs.chmod(downloaderBinary, 0o755);
      console.log(chalk.green('✓ Made downloader executable'));
    } catch (error) {
      console.log(chalk.red(`Failed to set permissions: ${(error as Error).message}`));
      throw error;
    }

    // Clean up zip file
    try {
      await fs.unlink(downloaderZip);
    } catch {
      // Ignore cleanup errors
    }

    return downloaderBinary;
  }

  private async runHytaleDownloader(downloaderBinary: string, serverPath: string): Promise<void> {
    console.log();
    console.log(chalk.cyan('Running hytale-downloader...'));
    console.log(chalk.gray('You will need to authenticate with your Hytale account.'));
    console.log();

    const downloadPath = path.join(serverPath, 'hytale-server.zip');

    return new Promise((resolve, reject) => {
      const downloaderProcess = spawn(downloaderBinary, ['-download-path', downloadPath], {
        stdio: 'inherit',
        cwd: path.dirname(downloaderBinary),
      });

      downloaderProcess.on('close', (code) => {
        if (code === 0) {
          console.log();
          console.log(chalk.green('✓ Server files downloaded successfully'));
          resolve();
        } else {
          reject(new Error(`Downloader exited with code ${code}`));
        }
      });

      downloaderProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  private async extractServerFiles(serverPath: string): Promise<void> {
    const downloadedZip = path.join(serverPath, 'hytale-server.zip');

    // Check if the downloaded zip exists
    try {
      await fs.access(downloadedZip);
    } catch {
      throw new Error('Downloaded server files not found');
    }

    const spinner = ora('Extracting server files...').start();
    try {
      // Extract to server path
      execSync(`unzip -o "${downloadedZip}" -d "${serverPath}"`, { stdio: 'pipe' });

      // Check if files were extracted to Server/ subdirectory
      const serverSubdir = path.join(serverPath, 'Server');
      try {
        await fs.access(serverSubdir);

        // Move files from Server/ subdirectory to parent directory
        spinner.text = 'Moving server files...';
        const files = await fs.readdir(serverSubdir);

        for (const file of files) {
          const sourcePath = path.join(serverSubdir, file);
          const destPath = path.join(serverPath, file);

          // Move file (overwrite if exists)
          try {
            await fs.unlink(destPath);
          } catch {
            // File doesn't exist, that's fine
          }

          await fs.rename(sourcePath, destPath);
        }

        // Remove empty Server/ directory
        await fs.rmdir(serverSubdir);
      } catch {
        // No Server/ subdirectory, files are already in the right place
      }

      spinner.succeed(chalk.green('Extracted server files'));

      // Clean up zip file
      await fs.unlink(downloadedZip);
    } catch (error) {
      spinner.fail(chalk.red('Failed to extract server files'));
      throw error;
    }
  }

  private async downloadServerFiles(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Server Files ==='));
    console.log();

    const serverPath = path.join(__dirname, '..', 'hytale-server');
    const defaultAssetsPath = path.join(serverPath, 'assets.zip');

    const answers = await inquirer.prompt<ServerPathAnswers>([
      {
        type: 'input',
        name: 'serverPath',
        message: 'Path to Hytale server files:',
        default: serverPath,
        validate: async (input: string) => {
          try {
            await fs.access(input);
            return true;
          } catch {
            // Directory doesn't exist, we'll create it
            return true;
          }
        },
      },
      {
        type: 'input',
        name: 'assetsPath',
        message: 'Path to Hytale assets.zip:',
        default: defaultAssetsPath,
        validate: async (input: string) => {
          if (!input.endsWith('.zip')) {
            return 'Assets path must point to a .zip file';
          }
          return true;
        },
      },
    ]);

    config.set('server.serverPath', answers.serverPath);
    config.set('server.assetsPath', answers.assetsPath);

    // Create server directory if it doesn't exist
    await fs.mkdir(answers.serverPath, { recursive: true });

    // Check if HytaleServer.jar and assets exist
    const serverJar = path.join(answers.serverPath, 'HytaleServer.jar');
    const assetsFile = answers.assetsPath;

    let serverJarFound = false;
    let assetsFound = false;

    try {
      await fs.access(serverJar);
      serverJarFound = true;
      console.log(chalk.green('✓ HytaleServer.jar found'));
    } catch {
      console.log(chalk.yellow('⚠ HytaleServer.jar not found'));
    }

    try {
      await fs.access(assetsFile);
      assetsFound = true;
      console.log(chalk.green('✓ Assets file found'));
    } catch {
      console.log(chalk.yellow('⚠ Assets file not found'));
    }

    // If files are missing, offer to download them
    if (!serverJarFound || !assetsFound) {
      console.log();
      const downloadAnswer = await inquirer.prompt<{ downloadNow: boolean }>([
        {
          type: 'confirm',
          name: 'downloadNow',
          message: 'Download Hytale server files now?',
          default: true,
        },
      ]);

      if (downloadAnswer.downloadNow) {
        try {
          // Setup hytale-downloader (download if needed)
          const downloaderBinary = await this.setupHytaleDownloader();

          // Run the downloader to get server files
          await this.runHytaleDownloader(downloaderBinary, answers.serverPath);

          // Extract the downloaded files
          await this.extractServerFiles(answers.serverPath);

          console.log(chalk.green('✓ Server files are ready!'));
        } catch (error) {
          console.log();
          console.log(chalk.red(`Failed to download server files: ${(error as Error).message}`));
          console.log(chalk.yellow('You can manually download them later using:'));
          console.log(chalk.cyan('  ./hytale-downloader/hytale-downloader-linux-amd64'));
        }
      } else {
        console.log();
        console.log(chalk.yellow('Skipping download. You will need to manually download the server files.'));
        console.log(chalk.gray('Required files:'));
        console.log(chalk.gray(`  - HytaleServer.jar in: ${answers.serverPath}`));
        console.log(chalk.gray(`  - assets.zip at: ${answers.assetsPath}`));
      }
    }
  }

  private async reviewConfiguration(): Promise<void> {
    console.log();
    console.log(chalk.cyan.bold('=== Configuration Review ==='));
    console.log();

    const cfg = config.getAll();

    console.log(chalk.bold('Server Configuration:'));
    console.log(`  Name: ${chalk.green(cfg.server.name)}`);
    console.log(`  Port: ${chalk.green(cfg.server.port)}`);
    console.log(`  Max Players: ${chalk.green(cfg.server.maxPlayers)}`);
    console.log(`  Difficulty: ${chalk.green(cfg.server.difficulty)}`);
    console.log(`  PvP: ${chalk.green(cfg.server.pvp ? 'Enabled' : 'Disabled')}`);
    console.log(`  Auto Restart: ${chalk.green(cfg.server.autoRestart ? 'Enabled' : 'Disabled')}`);

    if (cfg.discord.enabled) {
      console.log();
      console.log(chalk.bold('Discord Integration:'));
      console.log(`  Status: ${chalk.green('Enabled')}`);
      console.log(`  Guild ID: ${chalk.green(cfg.discord.guildId)}`);
      console.log(`  Channel ID: ${chalk.green(cfg.discord.channelId)}`);
    }

    if (cfg.backup.enabled) {
      console.log();
      console.log(chalk.bold('Backup Configuration:'));
      console.log(`  Status: ${chalk.green('Enabled')}`);
      console.log(`  Interval: ${chalk.green(cfg.backup.interval / 3600000)} hours`);
      console.log(`  Max Backups: ${chalk.green(cfg.backup.maxBackups)}`);
    }

    console.log();
  }

  private async finalizeSetup(): Promise<void> {
    const answers = await inquirer.prompt<FinalAnswers>([
      {
        type: 'confirm',
        name: 'saveConfig',
        message: 'Save this configuration?',
        default: true,
      },
    ]);

    if (answers.saveConfig) {
      const spinner = ora('Saving configuration...').start();
      try {
        await config.save();
        spinner.succeed(chalk.green('Configuration saved successfully!'));
      } catch (error) {
        spinner.fail(chalk.red(`Failed to save configuration: ${(error as Error).message}`));
        return;
      }

      console.log();
      const startAnswer = await inquirer.prompt<StartServerAnswers>([
        {
          type: 'confirm',
          name: 'startServer',
          message: 'Start the server now?',
          default: false,
        },
      ]);

      if (startAnswer.startServer) {
        console.log();
        console.log(chalk.green('Starting Hytale server...'));
        console.log(chalk.gray('Note: Make sure the server files are in place before starting.'));
        console.log();

        try {
          await serverManager.initialize();
          await serverManager.start();
          console.log(chalk.green('✓ Server started successfully!'));
          console.log();
          console.log(chalk.gray('To stop the server, press Ctrl+C'));
        } catch (error) {
          console.log(chalk.red(`Failed to start server: ${(error as Error).message}`));
        }
      } else {
        console.log();
        console.log(chalk.green('Setup complete!'));
        console.log();
        console.log(chalk.bold('Next steps:'));
        console.log(`  1. Download server files using hytale-downloader:`);
        console.log(`     ${chalk.cyan('./hytale-downloader/hytale-downloader-linux-amd64')}`);
        console.log(`  2. Ensure these files exist:`);
        console.log(`     - ${chalk.cyan(path.join(config.get<string>('server.serverPath'), 'HytaleServer.jar'))}`);
        console.log(`     - ${chalk.cyan(config.get<string>('server.assetsPath'))}`);
        console.log(`  3. Start the server with: ${chalk.cyan('npm start')}`);
        if (config.get<boolean>('discord.enabled')) {
          console.log(`  4. Start the Discord bot with: ${chalk.cyan('npm run discord')}`);
        }
        console.log();
      }
    } else {
      console.log(chalk.yellow('Configuration not saved. Run the wizard again to configure your server.'));
    }
  }
}

// Run the wizard
const wizard = new SetupWizard();
wizard.run().catch((error: Error) => {
  console.error(chalk.red('Error running setup wizard:'), error);
  process.exit(1);
});
