import chalk from 'chalk';
import readline from 'readline';
import config from './config.js';
import serverManager from './server-manager.js';
console.log(chalk.blue.bold('╔═══════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║   Hytale Server Manager                   ║'));
console.log(chalk.blue.bold('╚═══════════════════════════════════════════╝'));
console.log();
async function main() {
    try {
        // Load configuration
        console.log(chalk.blue('Loading configuration...'));
        await config.load();
        console.log(chalk.green('✓ Configuration loaded'));
        // Check if configuration exists
        const serverPath = config.get('server.serverPath');
        if (!serverPath) {
            console.log(chalk.yellow('⚠ No configuration found. Please run the setup wizard first:'));
            console.log(chalk.cyan('  npm run setup'));
            process.exit(1);
        }
        // Initialize server manager
        console.log(chalk.blue('Initializing server manager...'));
        await serverManager.initialize();
        console.log(chalk.green('✓ Server manager initialized'));
        // Display server info
        console.log();
        console.log(chalk.bold('Server Configuration:'));
        console.log(`  Name: ${chalk.cyan(config.get('server.name'))}`);
        console.log(`  Max Players: ${chalk.cyan(config.get('server.maxPlayers'))}`);
        console.log(`  Game Mode: ${chalk.cyan(config.get('server.gameMode') || 'Adventure')}`);
        console.log(`  Default World: ${chalk.cyan(config.get('server.defaultWorld') || 'default')}`);
        console.log();
        // Start server
        console.log(chalk.blue('Starting Hytale server...'));
        await serverManager.start();
        console.log(chalk.green.bold('✓ Server started successfully!'));
        console.log();
        console.log(chalk.gray('Press Ctrl+C to stop the server'));
        console.log(chalk.gray('Type commands and press Enter to send them to the server'));
        console.log();
        // Setup interactive console for server commands
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan('> '),
        });
        rl.prompt();
        rl.on('line', (line) => {
            const command = line.trim();
            if (command) {
                try {
                    serverManager.sendCommand(command);
                    console.log(chalk.gray(`Sent command: ${command}`));
                }
                catch (error) {
                    console.error(chalk.red(`Failed to send command: ${error.message}`));
                }
            }
            rl.prompt();
        });
        rl.on('close', () => {
            shutdown();
        });
        // Setup event handlers for logging
        serverManager.on('ready', () => {
            console.log(chalk.green('✓ Server is ready and accepting connections'));
        });
        serverManager.on('playerJoin', ({ playerName, playerCount }) => {
            console.log(chalk.green(`+ ${playerName} joined the server (${playerCount}/${config.get('server.maxPlayers')})`));
        });
        serverManager.on('playerLeave', ({ playerName, playerCount }) => {
            console.log(chalk.yellow(`- ${playerName} left the server (${playerCount}/${config.get('server.maxPlayers')})`));
        });
        serverManager.on('error', (error) => {
            const errorMsg = typeof error === 'string' ? error : error.message;
            console.error(chalk.red(`Server error: ${errorMsg}`));
        });
        serverManager.on('crashed', ({ code, signal }) => {
            console.error(chalk.red(`Server crashed with code ${code}, signal ${signal}`));
            process.exit(1);
        });
    }
    catch (error) {
        console.error(chalk.red('Error starting server:'), error);
        process.exit(1);
    }
}
// Handle shutdown
async function shutdown() {
    console.log();
    console.log(chalk.yellow('Shutting down...'));
    try {
        await serverManager.cleanup();
        console.log(chalk.green('✓ Server stopped gracefully'));
        process.exit(0);
    }
    catch (error) {
        console.error(chalk.red('Error during shutdown:'), error);
        process.exit(1);
    }
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
// Run main function
main();
//# sourceMappingURL=index.js.map