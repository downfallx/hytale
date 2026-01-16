#!/usr/bin/env node
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
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
class SetupWizard {
    answers = {};
    async run() {
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
        await this.worldSetup();
        await this.advancedServerSetup();
        await this.discordSetup();
        await this.backupSetup();
        await this.downloadServerFiles();
        await this.reviewConfiguration();
        await this.finalizeSetup();
    }
    async checkPrerequisites() {
        const spinner = ora('Checking prerequisites...').start();
        try {
            // Check Java
            try {
                const javaVersionOutput = execSync('java -version 2>&1').toString();
                const versionMatch = javaVersionOutput.match(/version "(\d+)\.?(\d+)?\.?(\d+)?/);
                if (versionMatch) {
                    const majorVersion = parseInt(versionMatch[1]);
                    if (majorVersion >= 25) {
                        spinner.succeed(chalk.green(`Java ${majorVersion} is installed`));
                    }
                    else {
                        spinner.warn(chalk.yellow(`Java ${majorVersion} found. Hytale server requires Java 25 or higher.`));
                    }
                }
                else {
                    spinner.succeed(chalk.green('Java is installed (version unknown)'));
                }
            }
            catch {
                spinner.warn(chalk.yellow('Java not found. You will need Java 25 or higher to run the Hytale server.'));
            }
            // Load existing config if any
            await config.load();
            spinner.succeed(chalk.green('Configuration loaded'));
        }
        catch (error) {
            spinner.fail(chalk.red(`Error checking prerequisites: ${error.message}`));
        }
    }
    async basicServerSetup() {
        console.log();
        console.log(chalk.cyan.bold('=== Basic Server Configuration ==='));
        console.log();
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'serverName',
                message: 'Server name:',
                default: config.get('server.name') || 'Hytale Server',
                validate: (input) => input.trim().length > 0 || 'Server name cannot be empty',
            },
            {
                type: 'input',
                name: 'motd',
                message: 'Message of the day (MOTD):',
                default: config.get('server.motd') || 'Welcome to Hytale!',
            },
            {
                type: 'password',
                name: 'password',
                message: 'Server password (leave empty for no password):',
                default: config.get('server.password') || '',
            },
            {
                type: 'number',
                name: 'maxPlayers',
                message: 'Maximum players:',
                default: config.get('server.maxPlayers') || 100,
                validate: (input) => {
                    const num = parseInt(input.toString());
                    return (num > 0 && num <= 1000) || 'Max players must be between 1 and 1000';
                },
            },
            {
                type: 'number',
                name: 'maxViewRadius',
                message: 'Maximum view radius (chunks):',
                default: config.get('server.maxViewRadius') || 32,
                validate: (input) => {
                    const num = parseInt(input.toString());
                    return (num >= 8 && num <= 64) || 'View radius must be between 8 and 64';
                },
            },
            {
                type: 'input',
                name: 'defaultWorld',
                message: 'Default world name:',
                default: config.get('server.defaultWorld') || 'default',
                validate: (input) => {
                    if (input.trim().length === 0)
                        return 'World name cannot be empty';
                    if (!/^[a-zA-Z0-9_-]+$/.test(input))
                        return 'World name can only contain letters, numbers, underscores, and hyphens';
                    return true;
                },
            },
        ]);
        config.set('server.name', answers.serverName);
        config.set('server.motd', answers.motd);
        config.set('server.password', answers.password);
        config.set('server.maxPlayers', answers.maxPlayers);
        config.set('server.maxViewRadius', answers.maxViewRadius);
        config.set('server.defaultWorld', answers.defaultWorld);
        this.answers = { ...this.answers, ...answers };
    }
    async worldSetup() {
        console.log();
        console.log(chalk.cyan.bold('=== World Configuration ==='));
        console.log(chalk.gray('These settings apply to the default world.'));
        console.log();
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'pvpEnabled',
                message: 'Enable PvP?',
                default: config.get('world.pvpEnabled') ?? false,
            },
            {
                type: 'confirm',
                name: 'fallDamageEnabled',
                message: 'Enable fall damage?',
                default: config.get('world.fallDamageEnabled') ?? true,
            },
            {
                type: 'confirm',
                name: 'npcSpawning',
                message: 'Enable NPC spawning?',
                default: config.get('world.npcSpawning') ?? true,
            },
            {
                type: 'confirm',
                name: 'customSeed',
                message: 'Use a custom world seed?',
                default: false,
            },
        ]);
        config.set('world.pvpEnabled', answers.pvpEnabled);
        config.set('world.fallDamageEnabled', answers.fallDamageEnabled);
        config.set('world.npcSpawning', answers.npcSpawning);
        if (answers.customSeed) {
            const seedAnswer = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'seed',
                    message: 'World seed:',
                    default: Math.floor(Math.random() * 1000000000000),
                    validate: (input) => {
                        const num = parseInt(input.toString());
                        return !isNaN(num) || 'Seed must be a number';
                    },
                },
            ]);
            config.set('world.seed', seedAnswer.seed);
        }
        this.answers = { ...this.answers, ...answers };
    }
    async advancedServerSetup() {
        console.log();
        console.log(chalk.cyan.bold('=== Advanced Configuration ==='));
        console.log();
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'javaArgs',
                message: 'Java arguments (for memory allocation):',
                default: config.get('server.javaArgs') || '-Xmx2G -Xms1G',
                validate: (input) => input.trim().length > 0 || 'Java arguments cannot be empty',
            },
            {
                type: 'confirm',
                name: 'autoRestart',
                message: 'Enable automatic server restarts?',
                default: config.get('server.autoRestart') || false,
            },
        ]);
        if (answers.autoRestart) {
            const restartConfig = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'restartHours',
                    message: 'Restart interval (in hours):',
                    default: 6,
                    validate: (input) => {
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
    async discordSetup() {
        console.log();
        console.log(chalk.cyan.bold('=== Discord Bot Integration ==='));
        console.log();
        console.log(chalk.gray('Connect your server to Discord for remote management and notifications.'));
        console.log();
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'enableDiscord',
                message: 'Enable Discord bot integration?',
                default: config.get('discord.enabled') || false,
            },
        ]);
        if (answers.enableDiscord) {
            const discordAnswers = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'botToken',
                    message: 'Discord bot token:',
                    default: config.get('discord.botToken') || '',
                    validate: (input) => input.trim().length > 0 || 'Bot token is required',
                },
                {
                    type: 'input',
                    name: 'guildId',
                    message: 'Discord server (guild) ID:',
                    default: config.get('discord.guildId') || '',
                    validate: (input) => input.trim().length > 0 || 'Guild ID is required',
                },
                {
                    type: 'input',
                    name: 'channelId',
                    message: 'Discord channel ID for notifications:',
                    default: config.get('discord.channelId') || '',
                    validate: (input) => input.trim().length > 0 || 'Channel ID is required',
                },
                {
                    type: 'input',
                    name: 'adminRoleId',
                    message: 'Discord admin role ID (for server control):',
                    default: config.get('discord.adminRoleId') || '',
                },
                {
                    type: 'confirm',
                    name: 'statusUpdates',
                    message: 'Send status updates to Discord?',
                    default: config.get('discord.statusUpdates') !== undefined ? config.get('discord.statusUpdates') : true,
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
        }
        else {
            config.set('discord.enabled', false);
        }
        this.answers = { ...this.answers, ...answers };
    }
    async backupSetup() {
        console.log();
        console.log(chalk.cyan.bold('=== Backup Configuration ==='));
        console.log();
        const answers = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'enableBackups',
                message: 'Enable automatic backups?',
                default: config.get('backup.enabled') || false,
            },
        ]);
        if (answers.enableBackups) {
            const backupAnswers = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'backupHours',
                    message: 'Backup interval (in hours):',
                    default: 24,
                    validate: (input) => {
                        const num = parseInt(input.toString());
                        return num > 0 || 'Backup interval must be greater than 0';
                    },
                },
                {
                    type: 'number',
                    name: 'maxBackups',
                    message: 'Maximum number of backups to keep:',
                    default: config.get('backup.maxBackups') || 5,
                    validate: (input) => {
                        const num = parseInt(input.toString());
                        return num > 0 || 'Must keep at least 1 backup';
                    },
                },
            ]);
            config.set('backup.enabled', true);
            config.set('backup.interval', backupAnswers.backupHours * 3600000);
            config.set('backup.maxBackups', backupAnswers.maxBackups);
        }
        else {
            config.set('backup.enabled', false);
        }
    }
    async downloadFile(url, dest) {
        return new Promise((resolve, reject) => {
            const file = createWriteStream(dest);
            https.get(url, (response) => {
                if (response.statusCode === 302 || response.statusCode === 301) {
                    // Handle redirect
                    file.close();
                    if (response.headers.location) {
                        this.downloadFile(response.headers.location, dest).then(resolve).catch(reject);
                    }
                    else {
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
    async setupHytaleDownloader() {
        const downloaderDir = path.join(__dirname, '..', 'hytale-downloader');
        const downloaderBinary = path.join(downloaderDir, 'hytale-downloader-linux-amd64');
        const downloaderZip = path.join(downloaderDir, 'hytale-downloader.zip');
        // Check if downloader already exists
        try {
            await fs.access(downloaderBinary);
            console.log(chalk.green('✓ Hytale downloader found'));
            return downloaderBinary;
        }
        catch {
            // Downloader doesn't exist, need to download it
        }
        console.log(chalk.yellow('⚠ Hytale downloader not found'));
        console.log(chalk.cyan('Automatically downloading hytale-downloader...'));
        // Create downloader directory
        await fs.mkdir(downloaderDir, { recursive: true });
        // Download the zip
        const spinner = ora('Downloading hytale-downloader.zip...').start();
        try {
            await this.downloadFile('https://downloader.hytale.com/hytale-downloader.zip', downloaderZip);
            spinner.succeed(chalk.green('Downloaded hytale-downloader.zip'));
        }
        catch (error) {
            spinner.fail(chalk.red(`Failed to download: ${error.message}`));
            throw error;
        }
        // Extract the zip
        spinner.start('Extracting hytale-downloader.zip...');
        try {
            execSync(`unzip -o "${downloaderZip}" -d "${downloaderDir}"`, { stdio: 'pipe' });
            spinner.succeed(chalk.green('Extracted hytale-downloader'));
        }
        catch (error) {
            spinner.fail(chalk.red('Failed to extract zip. Make sure unzip is installed.'));
            throw error;
        }
        // Make it executable
        try {
            await fs.chmod(downloaderBinary, 0o755);
            console.log(chalk.green('✓ Made downloader executable'));
        }
        catch (error) {
            console.log(chalk.red(`Failed to set permissions: ${error.message}`));
            throw error;
        }
        // Clean up zip file
        try {
            await fs.unlink(downloaderZip);
        }
        catch {
            // Ignore cleanup errors
        }
        return downloaderBinary;
    }
    async runHytaleDownloader(downloaderBinary, serverPath) {
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
                }
                else {
                    reject(new Error(`Downloader exited with code ${code}`));
                }
            });
            downloaderProcess.on('error', (error) => {
                reject(error);
            });
        });
    }
    async extractServerFiles(serverPath) {
        const downloadedZip = path.join(serverPath, 'hytale-server.zip');
        // Check if the downloaded zip exists
        try {
            await fs.access(downloadedZip);
        }
        catch {
            throw new Error('Downloaded server files not found');
        }
        console.log(chalk.cyan('Extracting server files (1.4 GB - this may take 5-10 minutes on Windows/WSL)...'));
        console.log(chalk.gray('Please wait - unzip is working in the background'));
        console.log();
        const spinner = ora('Decompressing files...').start();
        try {
            // Extract to server path - stdio: 'inherit' shows unzip progress
            execSync(`unzip -o "${downloadedZip}" -d "${serverPath}"`, { stdio: 'inherit' });
            spinner.stop();
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
                    }
                    catch {
                        // File doesn't exist, that's fine
                    }
                    await fs.rename(sourcePath, destPath);
                }
                // Remove empty Server/ directory
                await fs.rmdir(serverSubdir);
            }
            catch {
                // No Server/ subdirectory, files are already in the right place
            }
            spinner.succeed(chalk.green('Extracted server files'));
            // Clean up zip file
            await fs.unlink(downloadedZip);
        }
        catch (error) {
            spinner.fail(chalk.red('Failed to extract server files'));
            throw error;
        }
    }
    async downloadServerFiles() {
        console.log();
        console.log(chalk.cyan.bold('=== Server Files ==='));
        console.log();
        const serverPath = path.join(__dirname, '..', 'hytale-server');
        const assetsPath = path.join(serverPath, 'assets.zip');
        // Use default paths automatically
        config.set('server.serverPath', serverPath);
        config.set('server.assetsPath', assetsPath);
        // Create server directory if it doesn't exist
        await fs.mkdir(serverPath, { recursive: true });
        // Check if HytaleServer.jar and assets exist
        const serverJar = path.join(serverPath, 'HytaleServer.jar');
        let serverJarFound = false;
        let assetsFound = false;
        try {
            await fs.access(serverJar);
            serverJarFound = true;
            console.log(chalk.green('✓ HytaleServer.jar found'));
        }
        catch {
            console.log(chalk.yellow('⚠ HytaleServer.jar not found'));
        }
        try {
            await fs.access(assetsPath);
            assetsFound = true;
            console.log(chalk.green('✓ Assets file found'));
        }
        catch {
            console.log(chalk.yellow('⚠ Assets file not found'));
        }
        // If files are missing, automatically download them with a single confirmation
        if (!serverJarFound || !assetsFound) {
            console.log();
            console.log(chalk.cyan('Missing server files will be automatically downloaded.'));
            console.log(chalk.gray(`Server path: ${serverPath}`));
            console.log(chalk.gray(`Assets path: ${assetsPath}`));
            console.log();
            const confirmAnswer = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'autoInstall',
                    message: 'Proceed with automatic download and installation?',
                    default: true,
                },
            ]);
            if (confirmAnswer.autoInstall) {
                try {
                    console.log();
                    console.log(chalk.cyan('Starting automatic installation...'));
                    console.log();
                    // Setup hytale-downloader (download if needed)
                    const downloaderBinary = await this.setupHytaleDownloader();
                    // Run the downloader to get server files
                    await this.runHytaleDownloader(downloaderBinary, serverPath);
                    // Extract the downloaded files
                    await this.extractServerFiles(serverPath);
                    console.log();
                    console.log(chalk.green('✓ Server files are ready!'));
                }
                catch (error) {
                    console.log();
                    console.log(chalk.red(`Failed to download server files: ${error.message}`));
                    console.log(chalk.yellow('You can manually download them later using:'));
                    console.log(chalk.cyan('  ./hytale-downloader/hytale-downloader-linux-amd64'));
                }
            }
            else {
                console.log();
                console.log(chalk.yellow('Skipping download. You will need to manually download the server files.'));
                console.log(chalk.gray('Required files:'));
                console.log(chalk.gray(`  - HytaleServer.jar in: ${serverPath}`));
                console.log(chalk.gray(`  - assets.zip at: ${assetsPath}`));
            }
        }
        else {
            console.log();
            console.log(chalk.green('✓ All required server files are present!'));
        }
    }
    async reviewConfiguration() {
        console.log();
        console.log(chalk.cyan.bold('=== Configuration Review ==='));
        console.log();
        const cfg = config.getAll();
        console.log(chalk.bold('Server Configuration:'));
        console.log(`  Name: ${chalk.green(cfg.server.name)}`);
        console.log(`  MOTD: ${chalk.green(cfg.server.motd || '(none)')}`);
        console.log(`  Password: ${chalk.green(cfg.server.password ? '(set)' : '(none)')}`);
        console.log(`  Max Players: ${chalk.green(cfg.server.maxPlayers)}`);
        console.log(`  Max View Radius: ${chalk.green(cfg.server.maxViewRadius)} chunks`);
        console.log(`  Game Mode: ${chalk.green(cfg.server.gameMode)}`);
        console.log(`  Default World: ${chalk.green(cfg.server.defaultWorld)}`);
        console.log(`  Auto Restart: ${chalk.green(cfg.server.autoRestart ? 'Enabled' : 'Disabled')}`);
        console.log();
        console.log(chalk.bold('World Configuration:'));
        console.log(`  PvP: ${chalk.green(cfg.world.pvpEnabled ? 'Enabled' : 'Disabled')}`);
        console.log(`  Fall Damage: ${chalk.green(cfg.world.fallDamageEnabled ? 'Enabled' : 'Disabled')}`);
        console.log(`  NPC Spawning: ${chalk.green(cfg.world.npcSpawning ? 'Enabled' : 'Disabled')}`);
        if (cfg.world.seed) {
            console.log(`  Seed: ${chalk.green(cfg.world.seed)}`);
        }
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
    async finalizeSetup() {
        const answers = await inquirer.prompt([
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
                spinner.succeed(chalk.green('Manager configuration saved!'));
            }
            catch (error) {
                spinner.fail(chalk.red(`Failed to save configuration: ${error.message}`));
                return;
            }
            // Write the Hytale server and world config files
            const hytaleSpinner = ora('Writing Hytale server configs...').start();
            try {
                await config.writeHytaleConfigs();
                hytaleSpinner.succeed(chalk.green('Hytale server and world configs written!'));
                const serverPath = config.get('server.serverPath');
                const defaultWorld = config.get('server.defaultWorld') || 'default';
                console.log(chalk.gray(`  → ${path.join(serverPath, 'config.json')}`));
                console.log(chalk.gray(`  → ${path.join(serverPath, 'universe', 'worlds', defaultWorld, 'config.json')}`));
            }
            catch (error) {
                hytaleSpinner.fail(chalk.red(`Failed to write Hytale configs: ${error.message}`));
                console.log(chalk.yellow('Note: Hytale configs will be created when the server first runs.'));
            }
            console.log();
            const startAnswer = await inquirer.prompt([
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
                    // Launch in a screen session
                    await serverManager.launchInScreen();
                    // Server is now running in screen, exit the wizard
                    process.exit(0);
                }
                catch (error) {
                    console.log(chalk.red(`Failed to start server: ${error.message}`));
                }
            }
            else {
                console.log();
                console.log(chalk.green('Setup complete!'));
                console.log();
                console.log(chalk.bold('Next steps:'));
                console.log(`  1. Download server files using hytale-downloader:`);
                console.log(`     ${chalk.cyan('./hytale-downloader/hytale-downloader-linux-amd64')}`);
                console.log(`  2. Ensure these files exist:`);
                console.log(`     - ${chalk.cyan(path.join(config.get('server.serverPath'), 'HytaleServer.jar'))}`);
                console.log(`     - ${chalk.cyan(config.get('server.assetsPath'))}`);
                console.log(`  3. Start the server with: ${chalk.cyan('npm start')}`);
                if (config.get('discord.enabled')) {
                    console.log(`  4. Start the Discord bot with: ${chalk.cyan('npm run discord')}`);
                }
                console.log();
            }
        }
        else {
            console.log(chalk.yellow('Configuration not saved. Run the wizard again to configure your server.'));
        }
    }
}
// Run the wizard
const wizard = new SetupWizard();
wizard.run().catch((error) => {
    console.error(chalk.red('Error running setup wizard:'), error);
    process.exit(1);
});
//# sourceMappingURL=setup-wizard.js.map