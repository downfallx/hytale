# Quick Start Guide

Get your Hytale server up and running in minutes!

## Installation (One-Time Setup)

```bash
# 1. Make the install script executable
chmod +x install.sh

# 2. Run the installer
./install.sh
```

The installer will:
- Check for Node.js and install if needed
- Check for Java and offer to install OpenJDK 17
- Install all npm dependencies
- Create necessary directories
- Ask if you want to run the setup wizard

## Setup Wizard

```bash
npm run setup
```

Follow the prompts to configure:
1. ✅ Server name and basic settings
2. ✅ Port and player limits
3. ✅ Java memory allocation
4. ✅ Discord integration (optional)
5. ✅ Automatic backups (optional)
6. ✅ Server file location

## Starting Your Server

### Method 1: Normal Start

```bash
npm start
```

### Method 2: With Discord Bot

Terminal 1 (Server):
```bash
npm start
```

Terminal 2 (Discord Bot):
```bash
npm run discord
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run setup` | Run setup wizard |
| `npm start` | Start the server |
| `npm run discord` | Start Discord bot |

## Discord Commands

Once the bot is running:

| Command | Description |
|---------|-------------|
| `/server-on` | Start the server |
| `/server-off` | Stop the server |
| `/server-restart` | Restart the server |
| `/server-status` | Check server status |
| `/server-players` | See player count |
| `/server-info` | Detailed server info |
| `/server-command <cmd>` | Send console command |

## File Locations

```
hytale-server-manager/
├── config.json          # Your configuration
├── .env                 # Discord bot token
├── logs/                # Server logs
├── backups/             # Automatic backups
└── hytale-server/       # Place Hytale server files here
    └── server.jar       # Main server file
```

## First Time Setup Checklist

- [ ] Install Node.js (v18+)
- [ ] Install Java (17+)
- [ ] Run `./install.sh`
- [ ] Run `npm run setup`
- [ ] Download Hytale server files
- [ ] Place server files in `hytale-server/` directory
- [ ] Start server with `npm start`
- [ ] (Optional) Set up Discord bot
- [ ] (Optional) Start Discord bot with `npm run discord`

## Need the Server Files?

1. Visit the official Hytale website
2. Download the server files
3. Extract to the `hytale-server/` directory
4. Ensure `server.jar` is present

## Troubleshooting

### "Server jar not found"
- Download Hytale server files
- Place them in `hytale-server/` directory
- Verify `server.jar` exists

### "Port already in use"
- Change the port in the setup wizard
- Or edit `config.json` manually

### "Java not found"
- Install Java 17+: `sudo apt install openjdk-17-jdk`
- Verify: `java -version`

### Discord bot not working
- Check `.env` has correct bot token
- Verify bot is invited to your server
- Ensure Guild ID and Channel ID are correct
- See `DISCORD_SETUP.md` for detailed guide

## Quick Tips

💡 **Use screen/tmux for persistent sessions**
```bash
# Install screen
sudo apt install screen

# Start a screen session
screen -S hytale

# Run your server
npm start

# Detach: Ctrl+A then D
# Reattach: screen -r hytale
```

💡 **Auto-start on boot with systemd**
```bash
# See README.md "Running as a System Service" section
```

💡 **View logs**
```bash
# Latest log file
ls -t logs/*.log | head -1 | xargs tail -f
```

💡 **Backup manually**
```bash
# Create a backup of server data
tar -czf backup-$(date +%Y%m%d-%H%M%S).tar.gz server-data/
```

## Getting Help

1. Check `README.md` for detailed documentation
2. Check `DISCORD_SETUP.md` for Discord bot help
3. Review logs in `logs/` directory
4. Open an issue on GitHub

## Next Steps

Once your server is running:

1. Test connecting to your server
2. Configure firewall to allow the server port
3. Set up port forwarding if behind NAT
4. Invite friends to join!
5. Configure automatic backups
6. Set up the Discord bot for remote management

---

**Happy Hytale server hosting!** 🎮
