import chalk from 'chalk';
import readline from 'readline';
import config from './config.js';
import serverManager from './server-manager.js';
console.log(chalk.blue.bold('╔═══════════════════════════════════════════╗'));
console.log(chalk.blue.bold('║   Hytale Server Manager                   ║'));
console.log(chalk.blue.bold('╚═══════════════════════════════════════════╝'));
console.log();
// Global readline interface for proper output handling
let rl = null;
/**
 * Print a message while preserving the readline prompt.
 * Clears the current line, prints the message, then redraws the prompt.
 */
function printWithPrompt(message) {
    if (rl && process.stdout.isTTY) {
        // Clear the current line and move cursor to start
        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        // Print the message
        console.log(message);
        // Redraw the prompt
        rl.prompt(true);
    }
    else {
        console.log(message);
    }
}
async function main() {
    try {
        // Check if we should launch inside a screen session
        const launchedInScreen = await serverManager.launchInScreen();
        if (launchedInScreen) {
            // We launched inside screen or attached to an existing one, exit this process
            process.exit(0);
        }
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
        // Show screen session info if we're inside one
        if (process.env.STY) {
            console.log(chalk.gray(`Running inside screen session: ${process.env.STY}`));
            console.log(chalk.gray('Use Ctrl+A, D to detach. Reattach with: screen -r hytale'));
            console.log();
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
        // Setup event handlers BEFORE starting server so we catch all output
        serverManager.on('ready', () => {
            printWithPrompt(chalk.green('✓ Server is ready and accepting connections'));
        });
        serverManager.on('playerJoin', ({ playerName, playerCount }) => {
            printWithPrompt(chalk.green(`+ ${playerName} joined the server (${playerCount}/${config.get('server.maxPlayers')})`));
        });
        serverManager.on('playerLeave', ({ playerName, playerCount }) => {
            printWithPrompt(chalk.yellow(`- ${playerName} left the server (${playerCount}/${config.get('server.maxPlayers')})`));
        });
        serverManager.on('error', (error) => {
            const errorMsg = typeof error === 'string' ? error : error.message;
            printWithPrompt(chalk.red(`Server error: ${errorMsg}`));
        });
        serverManager.on('crashed', ({ code, signal }) => {
            printWithPrompt(chalk.red(`Server crashed with code ${code}, signal ${signal}`));
            process.exit(1);
        });
        // Start server
        console.log(chalk.blue('Starting Hytale server...'));
        await serverManager.start();
        console.log(chalk.green.bold('✓ Server started successfully!'));
        console.log();
        console.log(chalk.gray('Press Ctrl+C to stop the server'));
        console.log(chalk.gray('Type commands and press Enter to send them to the server'));
        console.log();
        // Setup interactive console for server commands
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk.cyan('> '),
        });
        // Pass readline reference to server manager for proper output handling
        serverManager.setReadline(rl);
        rl.prompt();
        rl.on('line', (line) => {
            const command = line.trim();
            if (command) {
                try {
                    serverManager.sendCommand(command);
                }
                catch (error) {
                    printWithPrompt(chalk.red(`Failed to send command: ${error.message}`));
                }
            }
            rl.prompt();
        });
        rl.on('close', () => {
            shutdown();
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