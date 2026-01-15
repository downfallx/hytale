#!/usr/bin/env node
import { REST, Routes, SlashCommandBuilder } from 'discord.js';
import { config as dotenvConfig } from 'dotenv';
import config from './config.js';
import chalk from 'chalk';
dotenvConfig();
async function registerCommands() {
    console.log(chalk.blue.bold('Discord Slash Command Registration'));
    console.log();
    await config.load();
    const token = process.env.DISCORD_BOT_TOKEN || config.get('discord.botToken');
    const clientId = process.env.DISCORD_CLIENT_ID || config.get('discord.clientId');
    const guildId = config.get('discord.guildId');
    if (!token) {
        console.error(chalk.red('Error: Discord bot token not found.'));
        console.log(chalk.yellow('Please set DISCORD_BOT_TOKEN in your .env file or run the setup wizard.'));
        process.exit(1);
    }
    if (!clientId) {
        console.error(chalk.red('Error: Discord client ID not found.'));
        console.log(chalk.yellow('Please set DISCORD_CLIENT_ID in your .env file.'));
        console.log(chalk.gray('You can find this in the Discord Developer Portal under "General Information"'));
        process.exit(1);
    }
    if (!guildId) {
        console.error(chalk.red('Error: Discord guild ID not found.'));
        console.log(chalk.yellow('Please run the setup wizard to configure Discord integration.'));
        process.exit(1);
    }
    const commands = [
        new SlashCommandBuilder()
            .setName('server-on')
            .setDescription('Start the Hytale server'),
        new SlashCommandBuilder()
            .setName('server-off')
            .setDescription('Stop the Hytale server')
            .addStringOption(option => option.setName('reason')
            .setDescription('Reason for stopping the server')
            .setRequired(false)),
        new SlashCommandBuilder()
            .setName('server-restart')
            .setDescription('Restart the Hytale server')
            .addStringOption(option => option.setName('reason')
            .setDescription('Reason for restarting the server')
            .setRequired(false)),
        new SlashCommandBuilder()
            .setName('server-status')
            .setDescription('Get the current server status'),
        new SlashCommandBuilder()
            .setName('server-command')
            .setDescription('Send a command to the server console')
            .addStringOption(option => option.setName('command')
            .setDescription('The command to send')
            .setRequired(true)),
        new SlashCommandBuilder()
            .setName('server-players')
            .setDescription('Get the current player count'),
        new SlashCommandBuilder()
            .setName('server-info')
            .setDescription('Get detailed server information'),
    ];
    const rest = new REST({ version: '10' }).setToken(token);
    try {
        console.log(chalk.blue(`Registering ${commands.length} slash commands...`));
        console.log(chalk.gray(`Client ID: ${clientId}`));
        console.log(chalk.gray(`Guild ID: ${guildId}`));
        console.log();
        const data = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands.map(cmd => cmd.toJSON()) });
        console.log(chalk.green(`✓ Successfully registered ${data.length} slash commands!`));
        console.log();
        console.log(chalk.bold('Registered commands:'));
        data.forEach((cmd) => {
            console.log(chalk.cyan(`  /${cmd.name}`) + chalk.gray(` - ${cmd.description}`));
        });
        console.log();
        console.log(chalk.green('Commands are now available in your Discord server!'));
        console.log(chalk.gray('Note: It may take a few minutes for Discord to sync the commands.'));
    }
    catch (error) {
        console.error(chalk.red('Error registering commands:'));
        console.error(error);
        process.exit(1);
    }
}
registerCommands();
//# sourceMappingURL=register-commands.js.map