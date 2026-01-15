# Hytale Server Manager

An easy-to-use, all-in-one solution for setting up and managing your Hytale server with Discord integration.

## Features

- 🚀 **One-Command Setup** - Interactive wizard guides you through the entire setup process
- 🤖 **Discord Integration** - Control your server with Discord slash commands
- 📊 **Server Monitoring** - Real-time status updates and player notifications
- 🔄 **Auto-Restart** - Configurable automatic server restarts
- 💾 **Automatic Backups** - Schedule regular backups of your server data
- ⚙️ **Easy Configuration** - User-friendly configuration management
- 📝 **Logging** - Comprehensive server logging

## 🚀 Quick Start

**Get your Hytale server running in 15 minutes:**

```bash
git clone <repository-url>
cd hytale-server-manager
chmod +x install.sh && ./install.sh
```

### What happens next:

1. **Automatic installation** - Node.js, Java 25, and unzip are installed automatically
2. **Setup wizard** - Answer questions about your server configuration
3. **Server download** - Log in with your Hytale account to download server files
4. **Start your server** - Choose to start immediately or run `npm start` later

**Time required:** ~10-15 minutes
**User input needed:** Hytale login + server configuration

---

## 📋 Installation Details

<details>
<summary><b>What gets installed automatically?</b></summary>

The `install.sh` script automatically installs:
- **Node.js v20** (via NodeSource) if not present or version < 18
- **npm** (bundled with Node.js)
- **Java 25** (OpenJDK) if not present or version < 25
- **unzip** utility for extracting server files
- All npm dependencies from `package.json`

No prompts - these install silently in the background.
</details>

<details>
<summary><b>What will I be prompted for?</b></summary>

During the setup wizard you'll be asked:

**Required:**
- Server name
- Server port (default: 25565)
- Maximum players
- Server difficulty
- PvP enabled/disabled

**Optional:**
- Discord bot integration
- Automatic backups
- Auto-restart settings

**Authentication:**
- Hytale account login (OAuth browser flow) to download server files
</details>

---

## 📖 Manual Installation

<details>
<summary><b>If you prefer step-by-step control</b></summary>

### Installation

1. **Clone or download this repository** to your Linux server:

```bash
git clone <repository-url>
cd hytale-server-manager
```

2. **Run the installation script**:

```bash
chmod +x install.sh
./install.sh
```

This will:
- Check and install Node.js if needed
- Install Java 25 if needed
- Install all dependencies
- Create necessary directories
- Launch the setup wizard

### Setup Wizard

The wizard will guide you through:
1. Basic server configuration (name, port, max players, etc.)
2. Advanced settings (Java memory allocation, auto-restart)
3. Discord bot integration (optional)
4. Backup configuration (optional)
5. Server file download and location
6. Configuration review and save
7. Option to start the server immediately

### Starting the Server

After completing the setup wizard, you can start the server with:

```bash
npm start
```

</details>

---

### Discord Bot Setup

If you enabled Discord integration during setup:

1. **Create a Discord Bot**:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to the "Bot" section and create a bot
   - Copy the bot token (you'll need this during setup)
   - Enable the following Privileged Gateway Intents:
     - Server Members Intent
     - Message Content Intent

2. **Invite the Bot to Your Server**:
   - Go to OAuth2 → URL Generator
   - Select scopes: `bot`, `applications.commands`
   - Select bot permissions: `Send Messages`, `Embed Links`, `Read Message History`
   - Copy and visit the generated URL to invite the bot

3. **Get Your Server IDs**:
   - Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
   - Right-click your server → Copy ID (Guild ID)
   - Right-click your notification channel → Copy ID (Channel ID)
   - Right-click your admin role → Copy ID (Admin Role ID, optional)

4. **Start the Discord Bot**:

```bash
npm run discord
```

## Discord Commands

Once the Discord bot is running, you can use these slash commands:

- `/server-on` - Start the Hytale server
- `/server-off [reason]` - Stop the server (with optional reason)
- `/server-restart [reason]` - Restart the server (with optional reason)
- `/server-status` - Get current server status
- `/server-players` - Get current player count
- `/server-info` - Get detailed server information
- `/server-command <command>` - Send a command to the server console

## Project Structure

```
hytale-server-manager/
├── src/
│   ├── config.js           # Configuration management
│   ├── server-manager.js   # Server process management
│   ├── discord-bot.js      # Discord bot integration
│   ├── setup-wizard.js     # Interactive setup wizard
│   └── index.js            # Main server launcher
├── logs/                   # Server logs
├── backups/                # Automatic backups
├── hytale-server/          # Hytale server files (you provide these)
├── install.sh              # Bootstrap installation script
├── package.json
├── config.json             # Generated configuration
└── .env                    # Environment variables (bot token)
```

## Configuration

Configuration is stored in `config.json`. You can manually edit this file or re-run the setup wizard:

```bash
npm run setup
```

### Configuration Options

**Server Settings:**
- `server.name` - Server name
- `server.port` - Server port (default: 25565)
- `server.maxPlayers` - Maximum number of players
- `server.difficulty` - Game difficulty (peaceful, easy, normal, hard)
- `server.pvp` - Enable/disable PvP
- `server.motd` - Message of the day
- `server.javaArgs` - Java arguments for memory allocation
- `server.autoRestart` - Enable automatic restarts
- `server.restartInterval` - Restart interval in milliseconds

**Discord Settings:**
- `discord.enabled` - Enable Discord integration
- `discord.botToken` - Discord bot token
- `discord.guildId` - Discord server ID
- `discord.channelId` - Notification channel ID
- `discord.adminRoleId` - Admin role ID (optional)
- `discord.statusUpdates` - Enable status update messages

**Backup Settings:**
- `backup.enabled` - Enable automatic backups
- `backup.interval` - Backup interval in milliseconds
- `backup.maxBackups` - Maximum number of backups to keep

## System Requirements

- **Operating System**: Linux (Ubuntu 20.04+ recommended)
- **Node.js**: Version 18 or higher
- **Java**: Java 17 or higher (required for Hytale server)
- **RAM**: Minimum 2GB, 4GB+ recommended
- **Disk Space**: At least 10GB free

## Troubleshooting

### Server won't start

1. Verify Java is installed: `java -version`
2. Check that server files are in the correct location
3. Review logs in the `logs/` directory
4. Ensure sufficient RAM is available

### Discord bot won't connect

1. Verify bot token is correct in `.env` file
2. Check that bot has been invited to your server
3. Ensure all required IDs (Guild ID, Channel ID) are correct
4. Verify bot permissions in Discord

### Port already in use

If the default port (25565) is already in use, change it in the configuration:

```bash
npm run setup
```

Or manually edit `config.json` and change `server.port`.

## Advanced Usage

### Running as a System Service

To run the server as a systemd service:

1. Create a service file at `/etc/systemd/system/hytale.service`:

```ini
[Unit]
Description=Hytale Server
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/hytale-server-manager
ExecStart=/usr/bin/npm start
Restart=always

[Install]
WantedBy=multi-user.target
```

2. Enable and start the service:

```bash
sudo systemctl enable hytale
sudo systemctl start hytale
```

### Environment Variables

You can override configuration using environment variables:

- `DISCORD_BOT_TOKEN` - Discord bot token
- `DISCORD_CLIENT_ID` - Discord application client ID
- `SERVER_PORT` - Server port
- `MAX_PLAYERS` - Maximum players

## Security Considerations

- **Never share your bot token** - Keep your `.env` file secure
- **Use admin roles** - Restrict Discord commands to trusted users
- **Firewall configuration** - Only open necessary ports
- **Regular backups** - Enable automatic backups to prevent data loss
- **Keep software updated** - Regularly update Node.js and dependencies

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Workflow

This project uses TypeScript but ships pre-built JavaScript files for instant user setup.

**If you're modifying the source code:**

1. Edit files in `src/*.ts`
2. Run `npm run build` to compile TypeScript to JavaScript
3. Test your changes with `npm run setup` or `npm start`
4. **Important:** Commit both source and compiled files together:
   ```bash
   git add src/ dist/
   git commit -m "Your change description"
   ```

**Why we ship built files:**
- Users get instant setup without needing TypeScript compiler
- No build step delays during installation
- Standard practice for CLI tools distributed via git

**Development commands:**
- `npm run dev` - Watch mode (auto-rebuild on changes)
- `npm run build` - Build once
- `npm run clean` - Remove dist/ folder

**Note for Windows developers:**
On Windows, the first run after building may be slow (20-30 seconds) due to Windows Defender scanning. This does NOT affect Linux users. To speed up development:
```powershell
# Run as Administrator to exclude directories from Windows Defender:
Add-MpPreference -ExclusionPath "C:\path\to\hytale-server-manager\dist"
Add-MpPreference -ExclusionPath "C:\path\to\hytale-server-manager\node_modules"
```

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review logs in the `logs/` directory
3. Open an issue on GitHub

## Acknowledgments

- Built with Node.js and Discord.js
- Uses Inquirer for interactive CLI
- Styled with Chalk

---

**Note**: This is a community-made tool and is not officially affiliated with Hytale or Hypixel Studios. Make sure to download official Hytale server files from the official Hytale website.
