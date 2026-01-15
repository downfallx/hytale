# Discord Bot Setup Guide

This guide will walk you through setting up the Discord bot for your Hytale server.

## Prerequisites

- A Discord account
- Administrator permissions on your Discord server
- Completed the Hytale server setup wizard

## Step 1: Create a Discord Application

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give your application a name (e.g., "Hytale Server Manager")
4. Click "Create"

## Step 2: Create a Bot

1. In your application, navigate to the "Bot" section in the left sidebar
2. Click "Add Bot"
3. Click "Yes, do it!" to confirm
4. **IMPORTANT**: Copy the bot token and save it securely
   - Click "Reset Token" if you need to generate a new one
   - You'll need this token during the setup wizard

### Configure Bot Settings

1. **Privileged Gateway Intents**: Enable the following intents:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

2. **Bot Permissions**: We'll set these when generating the invite link

## Step 3: Get Your Application ID

1. Go to the "General Information" section
2. Copy your "Application ID" (also called Client ID)
3. Save this for later - you'll need it to register slash commands

## Step 4: Invite the Bot to Your Server

1. Go to "OAuth2" → "URL Generator"

2. **Select Scopes**:
   - ✅ `bot`
   - ✅ `applications.commands`

3. **Select Bot Permissions**:
   - ✅ Send Messages
   - ✅ Embed Links
   - ✅ Read Message History
   - ✅ Use Slash Commands
   - ✅ Read Messages/View Channels

4. Copy the generated URL at the bottom

5. Open the URL in your browser

6. Select your Discord server from the dropdown

7. Click "Authorize"

8. Complete the CAPTCHA

## Step 5: Get Server and Channel IDs

### Enable Developer Mode

1. Open Discord
2. Go to User Settings (gear icon)
3. Navigate to "Advanced" under "App Settings"
4. Enable "Developer Mode"

### Get Your Server ID (Guild ID)

1. Right-click on your server icon in the server list
2. Click "Copy Server ID" (or "Copy ID")
3. Save this ID - you'll need it during setup

### Get Your Channel ID

1. Right-click on the channel where you want notifications
2. Click "Copy Channel ID" (or "Copy ID")
3. Save this ID - you'll need it during setup

### Get Your Admin Role ID (Optional)

If you want to restrict server commands to specific roles:

1. Go to Server Settings → Roles
2. Right-click on the admin role
3. Click "Copy Role ID" (or "Copy ID")
4. Save this ID - you'll need it during setup

## Step 6: Configure the Server Manager

1. If you haven't already, run the setup wizard:

```bash
npm run setup
```

2. When prompted about Discord integration, select "Yes"

3. Enter the following information when prompted:
   - **Bot Token**: The token you copied in Step 2
   - **Guild ID**: Your server ID from Step 5
   - **Channel ID**: Your notification channel ID from Step 5
   - **Admin Role ID**: Your admin role ID from Step 5 (optional)

4. Complete the rest of the setup wizard

## Step 7: Update Discord Bot Configuration

The bot needs your Application ID to register slash commands. Add it to your `.env` file:

```bash
DISCORD_CLIENT_ID=your_application_id_here
```

Or add it to `config.json`:

```json
{
  "discord": {
    "enabled": true,
    "clientId": "your_application_id_here",
    ...
  }
}
```

## Step 8: Start the Discord Bot

```bash
npm run discord
```

You should see:
```
Registering Discord slash commands...
✓ Discord slash commands registered successfully!
✓ Discord bot logged in as YourBotName#1234
✓ Notification channel connected: #your-channel
🤖 Discord Bot Online
```

## Step 9: Test the Bot

In your Discord server, try typing `/` in the channel. You should see the following commands:

- `/server-on`
- `/server-off`
- `/server-restart`
- `/server-status`
- `/server-players`
- `/server-info`
- `/server-command`

Try `/server-status` to verify the bot is working correctly.

## Troubleshooting

### Bot doesn't show up in server

- Verify you invited the bot using the correct OAuth2 URL
- Check that you selected the correct server during authorization
- Ensure the bot has permission to view the channel

### Slash commands don't appear

- Wait a few minutes - Discord can take time to sync commands
- Verify the Application ID is correct in your configuration
- Check that the bot has `applications.commands` scope
- Try restarting the Discord client

### Bot can't send messages

- Check channel permissions for the bot role
- Verify the bot has "Send Messages" and "Embed Links" permissions
- Ensure the Channel ID is correct

### "Missing Access" error

- The bot needs permission to view and send messages in the notification channel
- Check the channel permissions for the bot's role

### Commands return "You do not have permission"

- If you set an Admin Role ID, ensure your Discord role matches
- If you didn't set an Admin Role ID, this check is disabled
- Verify the role ID is correct in the configuration

## Security Best Practices

1. **Never share your bot token**
   - Treat it like a password
   - Don't commit it to version control
   - Store it securely in the `.env` file

2. **Use Admin Role restrictions**
   - Limit who can control the server
   - Set up an admin role and configure the Admin Role ID

3. **Limit bot permissions**
   - Only grant necessary permissions
   - Review bot permissions regularly

4. **Monitor bot activity**
   - Check logs regularly
   - Watch for unusual command usage

## Advanced Configuration

### Multiple Servers

To use the bot with multiple Hytale servers:

1. Set up each server in a separate directory
2. Create a separate Discord bot for each server
3. Configure each bot with different notification channels

### Custom Notifications

Edit `config.json` to customize which events trigger notifications:

```json
{
  "notifications": {
    "playerJoin": true,
    "playerLeave": true,
    "serverStart": true,
    "serverStop": true,
    "serverCrash": true
  }
}
```

### Bot Status Message

The bot's status is automatically set. To customize it, edit `src/discord-bot.js`:

```javascript
this.client.on('ready', async () => {
  this.client.user.setActivity('Hytale Server', { type: 'WATCHING' });
  // ...
});
```

## Additional Resources

- [Discord.js Documentation](https://discord.js.org/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [Discord Developer Community](https://discord.gg/discord-developers)

## Need Help?

If you encounter issues:

1. Check the troubleshooting section above
2. Review the bot logs in the console
3. Check the server logs in the `logs/` directory
4. Open an issue on GitHub with:
   - What you were trying to do
   - What happened instead
   - Any error messages
   - Your configuration (without sensitive tokens)
