# Megumin Bot
Private bot for `Sakura Cafè` Join at [discord.gg/D9Tg7G4](https://discord.gg/D9Tg7G4)

## Running yourself
It might have a potential to be useful for your own server if you need a similar use case so here's how to run it for yourself.

**Node.js v12+** must be installed before you continue.

- **Step 1:** Star the repo (So I can notice that you are here and are interested)
- **Step 2:** Clone this repository or download it however you want. (`git clone https://github.com/ravener/megumin`)
- **Step 3**: Install dependencies. Run `npm install` in this directory.
- **Step 4:** Copy `config.json.example` to `config.json` and fill in the fields.
- **Step 5:** Run the bot with `node index.js` and you are good to go.
- **Step 6:** Enjoy the bot. You can also run it via `nodemon`/`pm2` or whatever you want to use.

The one thing you need to remember is that this bot is made specifically for one server so do make sure to make your bot application private and make sure it isn't in any other servers or the bot might not function properly.

**But wait, what does it even do? Does it have what I need?**

Here are the features:
- Self assignable roles. `iam`/`iamnot` commands. Bot owner can add roles on the fly using the owner command `addrole`
- View server statistics. `stats` command.
- Simple modlog to keep track of deleted messages, member leaves/joins, member bans/unbans, role creates/deletes.

The feature list can expand anytime with features you might or might not want/like. The primary goal of this bot is for my community but it's here in case it suits you as well.

## License
Released under the [MIT License](LICENSE)
