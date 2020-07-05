/**
 * Megumin Bot
 * This bot is kept simple intentionally.
 * It's only supposed to scale to one server.
 * Therefore I thought it's not worth using a framework or anything.
 * Back to the client.on("message") days.
 * I might refactor and improve this later if I feel like it.
 *
 * @author Raven
 * @license MIT
 */

/// --- Imports ---
const { token, owner, modlogs, prefix } = require("./config.json");
const { Client, Structures, MessageEmbed, version } = require("discord.js");
const { inspect, promisify } = require("util");
const { writeFile } = require("fs").promises;
const { existsSync, writeFileSync } = require("fs");

const exec = promisify(require("child_process").exec);

/// --- Extended Structures ---

Structures.extend("Message", (Message) => class extends Message {
  get isOwner() {
    return this.author.id === owner;
  }
});

// Yes, bad practice and all that but this is a small project so I don't really care.
String.prototype.toProperCase = function() {
  return this.replace(/([^\W_]+[^\s-]*) */g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
};

/// --- Initialization ---

const client = new Client({
  // This is a private bot for one server so keep all caches filled including members.
  fetchAllMembers: true,
  disableMentions: "everyone"
});

// Ensure roles.json exists.
if(!existsSync("./roles.json")) writeFileSync("./roles.json", "{}");

// Self assignable roles.
client.roles = require("./roles.json");

/// --- Events ---

client.on("ready", () => {
  console.log(`>>> Logged in as ${client.user.tag} (${client.user.id})`);
  client.modlogs = client.channels.cache.get(modlogs);
});

client.on("message", async(msg) => {
  // Ignore bots and webhooks.
  if(msg.author.bot || msg.webhookID) return;

  if(msg.channel.type === "dm") return msg.channel.send(`Hey! What do you think you are doing? I'm only usable in the server \`${client.guilds.cache.first().name}\`!`);

  // Check for prefix.
  if(!msg.content.startsWith(prefix)) return;

  const args = msg.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  /// --- Commands ---

  if(command === "ping") {
    const sent = await msg.channel.send("Pong!");
    const timestamp = sent.createdTimestamp - msg.createdTimestamp;
    return sent.edit(`Pong! Took **${timestamp} ms** API Latency **${client.ws.ping}**`);
  }

  if(command === "invite") {
    return msg.channel.send("Sorry but you cannot invite this bot to your server. This is a private bot specifically made for this server and is not suitable for other servers.");
  }

  if(command === "say") {
    if(!args.length) return msg.channel.send(`Usage: \`${prefix}say <text>\``);
    return msg.channel.send(args.join(" "));
  }

  if(command === "help" || command === "commands") {
    return msg.channel.send(new MessageEmbed()
      .setTitle("Bot Commands")
      .setAuthor(msg.member.displayName, msg.author.displayAvatarURL({ size: 64 }))
      .setColor(0xE91E63)
      .setDescription("```\n" + [
        "• help   | View commands list.",
        "• stats  | View Bot/Server statistics.",
        "• ping   | Pong! Checks bot latency.",
        "• roles  | View list of self assignable roles.",
        "• iam    | Assign a role to yourself.",
        "• iamnot | Remove a role from yourself.",
        "• say    | I'll say anything you want me to."
      ].join("\n") + "\n```"));
  }

  if(command === "stats") {
    return msg.channel.send(new MessageEmbed()
      .setTitle("Statistics")
      .setAuthor(client.user.tag, client.user.displayAvatarURL({ size: 64 }))
      .setColor(0xE91E63)
      .addField("Bot Stats", [
        `**Members:** ${msg.guild.memberCount}`,
        `**Channels:** ${client.channels.cache.size}`,
        `**Roles:** ${msg.guild.roles.cache.size}`,
        `**Total Memory Usage:** ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
        `**Memory Usage:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
      ].join("\n"))
      .addField("Versions", [
        `**Node.js Version:** ${process.version}`,
        `**Discord.js Version:** v${version}`
      ].join("\n")));
  }

  if(command === "roles") {
    return msg.channel.send(new MessageEmbed()
      .setTitle("Self Assignable Roles")
      .setDescription(Object.keys(client.roles).map((role) => `• ${role.toProperCase()}`))
      .setColor(0xE91E63)
      .setFooter(`Use ${prefix}iam to assign a role to yourself.`));
  }

  if(command === "giveme" || command === "add" || command === "give" || command === "iam" || command === "iamnot" || command === "take" || command === "remove") {
    if(!args.length) return msg.channel.send(`Usage: \`${prefix}${command}\` <role> (See \`${prefix}roles\` for a list)`);
    
    // Two commands (add, remove) for the price of one!
    const add = ["giveme", "add", "give", "iam"].includes(command);

    const role = msg.guild.roles.cache.get(client.roles[args.join(" ").toLowerCase()]);
    if(!role) return msg.channel.send(`That role does not exist. See \`${prefix}roles\` for a list.`);

    if(add && msg.member.roles.cache.has(role.id)) return msg.channel.send("You already have that role!");
    if(!add && !msg.member.roles.cache.has(role.id)) return msg.channel.send("You already don't have that role!");

    try {
      if(add) {
        await msg.member.roles.add(role);
        return msg.channel.send(`Successfully added the role \`${role.name}\` to you.`);
      } else {
        await msg.member.roles.remove(role);
        return msg.channel.send(`Successfully removed the role \`${role.name}\` from you.`);
      }
    } catch(err) {
      return msg.channel.send(`There was an error ${add ? "adding" : "removing"} the role ${add ? "to" : "from"} you: ${err.message}`);
    }
  }

  /// --- Owner Commands ---
  
  if(command === "addrole" && msg.isOwner) {
    if(args.length < 2) return msg.channel.send(`Usage: \`${prefix}addrole <roleID> <name>\`\n\nRole ID is the ID of the role to add to the assignable list. Name will be name users will use in the \`iam\` command to get this role.`);
    const role = msg.guild.roles.cache.get(args[0]);
    if(!role) return msg.channel.send("Role not found.");
    client.roles[args.slice(1).join(" ").toLowerCase()] = role.id;
    return writeFile("./roles.json", JSON.stringify(client.roles));
  }

  if(command === "reboot" && msg.isOwner) {
    await msg.channel.send("Rebooting...");
    process.exit(0);
  }

  if(command === "exec" && msg.isOwner) {
    const result = await exec(args.join(" "), { timeout: 60000 })
      .catch((error) => ({ stdout: null, stderr: error }));

    const output = result.stdout ? `**\`OUTPUT\`**${"```prolog\n" + result.stdout + "```"}` : "";
    const outerr = result.stderr ? `**\`ERROR\`**${"```prolog\n" + result.stderr + "```"}` : "";
    if(output === "" && outerr === "") return msg.channel.send("No output returned.");
    return msg.channel.send([output, outerr].join("\n"));
  }

  if(command === "eval" && msg.isOwner) {
    try {
      let output = eval(args.join(" "));

      if(output instanceof Promise || (Boolean(output) && typeof output.then === "function" && typeof output.catch === "function")) output = await output;
      output = inspect(output, { depth: 0, maxArrayLength: null });
      output = output.replace(/`/g, "`" + String.fromCharCode(8203));

      if (output.length < 1950) {
        return msg.channel.send(`\`\`\`js\n${output}\n\`\`\``);
      } else {
        return msg.channel.send("Output too long.");
      }
    } catch(err) {
      return msg.channel.send(err.stack || err, { code: "js" });
    }
  }
});

/// --- Modlogs ---

client.on("messageDelete", (msg) => {
  return client.modlogs.send(new MessageEmbed()
    .setTitle("Message Deleted")
    .setColor(0xE91E63)
    .setAuthor(msg.member.displayName, msg.author.displayAvatarURL({ size: 64 }))
    .setDescription(msg.content)
    .setTimestamp());
});

client.on("guildMemberAdd", (member) => {
  const days = Math.floor((new Date() - member.user.createdAt) / (1000 * 60 * 60 * 24));

  return client.modlogs.send(new MessageEmbed()
    .setTitle("Member Joined")
    .setColor(0xE91E63)
    .setAuthor(member.user.tag, member.user.displayAvatarURL({ size: 64 }))
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setDescription([
      `**ID:** ${member.id}`,
      `**Account Created:** ${member.user.createdAt.toDateString()} (${days} days ago)`,
      `**Bot:** ${member.user.bot ? "Yes" : "No"}`
    ].join("\n"))
    .setTimestamp());
});

client.on("guildMemberRemove", (member) => {
  const days = Math.floor((new Date() - member.user.createdAt) / (1000 * 60 * 60 * 24));
  const joinedDays = Math.floor((new Date() - member.joinedAt) / (1000 * 60 * 60 * 24));

  return client.modlogs.send(new MessageEmbed()
    .setTitle("Member Left")
    .setColor(0xE91E63)
    .setAuthor(member.user.tag, member.user.displayAvatarURL({ size: 64 }))
    .setThumbnail(member.user.displayAvatarURL({ size: 512 }))
    .setDescription([
      `**ID:** ${member.id}`,
      `**Account Created:** ${member.user.createdAt.toDateString()} (${days} days ago)`,
      `**Joined At:** ${member.joinedAt.toDateString()} (${joinedDays} days ago)`,
      `**Bot:** ${member.user.bot ? "Yes" : "No"}`,
      `**Roles:** ${member.roles.cache.map((role) => role.name).join(", ")}`
    ].join("\n"))
    .setTimestamp());
});

client.on("roleCreate", (role) => {
  return client.modlogs.send(new MessageEmbed()
    .setTitle("Role Created")
    .setColor(0xE91E63)
    .setDescription([
      `**Name:** ${role.name}`,
      `**ID:** ${role.id}`,
      `**Color:** ${role.hexColor}`,
      `**Permissions:** ${Object.entries(role.permissions.serialize())
          .filter(([, has]) => has)
          .map(([perm]) => perm.split("_").join(" ").toProperCase())
          .join(", ")}`
    ].join("\n"))
    .setTimestamp());
});

client.on("roleDelete", (role) => {
  const days = Math.floor((new Date() - role.createdAt) / (1000 * 60 * 60 * 24));

  return client.modlogs.send(new MessageEmbed()
    .setTitle("Role Deleted")
    .setColor(0xE91E63)
    .setDescription([
      `**ID:** ${role.id}`,
      `**Name:** ${role.name}`,
      `**Created At:** ${role.createdAt.toDateString()} (${days} days ago)`,
      `**Color:** ${role.hexColor}`,
      `**Permissions:** ${Object.entries(role.permissions.serialize())
          .filter(([, has]) => has)
          .map(([perm]) => perm.split("_").join(" ").toProperCase())
          .join(", ")}`
    ].join("\n"))
    .setTimestamp());
});

client.on("guildBanAdd", async(guild, user) => {
  const days = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

  const reason = await guild.fetchBans()
    .then((bans) => bans.find((ban) => ban.id === user.id))
    .then((user) => user ? user.reason : null)
    .catch(() => null);

  return client.modlogs.send(new MessageEmbed()
    .setTitle("Member Banned")
    .setColor(0xE91E63)
    .setAuthor(user.tag, user.displayAvatarURL({ size: 64 }))
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .setDescription([
      `**ID:** ${user.id}`,
      `**Account Created:** ${user.createdAt.toDateString()} (${days} days ago)`,
      `**Reason:** ${reason}`
    ].join("\n"))
    .setTimestamp())
});

client.on("guildBanRemove", (guild, user) => {
  const days = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));

  return client.modlogs.send(new MessageEmbed()
    .setTitle("Member Unbanned")
    .setColor(0xE91E63)
    .setAuthor(user.tag, user.displayAvatarURL({ size: 64 }))
    .setThumbnail(user.displayAvatarURL({ size: 512 }))
    .setDescription([
      `**ID:** ${user.id}`,
      `**Account Created:** ${user.createdAt.toDateString()} (${days} days ago)`
    ].join("\n"))
    .setTimestamp());
});

// Login
client.login(token);
