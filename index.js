const { Client, GatewayIntentBits, Collection, ActivityType, EmbedBuilder, PermissionsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v10');
const { clientId, token } = require('./json/config.json');
const fs = require('fs');
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
});
client.commands = new Collection();

// コマンドファイルの読み込み
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// ブラックリストの読み込み
const blacklistPath = './json/blacklist.json';
let blacklist = JSON.parse(fs.readFileSync(blacklistPath, 'utf-8'));

const auth = require('./commands/auth');

client.on('interactionCreate', async interaction => {
    try {
        await auth.handleInteraction(interaction);
    } catch (error) {
        console.error(error);
    }
});

const joinMessagePath = './json/joinMessages.json';
const loadSettings = () => {
    try {
        if (!fs.existsSync(joinMessagePath)) {
            return {}; // 設定ファイルがない場合は空のオブジェクトを返す
        }
        return JSON.parse(fs.readFileSync(joinMessagePath, 'utf8'));
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
        return {};
    }
};

// コマンド再登録関数
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);

  try {
    console.log('グローバルコマンドを再登録中...');
    const commands = client.commands.map(command => command.data.toJSON());
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('グローバルコマンドの再登録が完了しました！');
  } catch (error) {
    console.error('エラー: グローバルコマンド再登録中に問題が発生しました', error);
  }
}

// ボットが準備完了したときの処理
client.once('ready', async () => {
  console.log('ボットが準備完了しました！');

  client.user.setStatus('online');
  let stats = 0;
setInterval(async () => {
    if (stats === 0) {
        client.user.setActivity(`/help | ping: ${client.ws.ping}ms`, { type: ActivityType.Playing });
        stats = 1;
    } else {
        const serverCount = client.guilds.cache.size;
        const totalMembers = client.guilds.cache.reduce(
            (count, guild) => count + guild.memberCount,
            0
        );
        client.user.setActivity(`${serverCount} servers | ${totalMembers} users`, { type: ActivityType.Playing });
        stats = 0;
    }
}, 5000);
  // 初回のコマンド登録
  await registerCommands();
});

// 設定をロード
const spamblockPath = './json/spamblock.json';
const loadspamblockSettings = () => {
    try {
        if (!fs.existsSync(spamblockPath)) {
            return { servers: {} };
        }
        return JSON.parse(fs.readFileSync(spamblockPath, 'utf8'));
    } catch (error) {
        console.error('設定の読み込みに失敗しました:', error);
        return { servers: {} };
    }
};

// スパムブロックが有効か確認する関数
const isSpamBlockEnabled = (guildId) => {
    const settings = loadspamblockSettings();
    return settings.servers[guildId];
};

// ユーザーのメッセージ送信履歴を追跡するマップ
const userMessages = new Map();

client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Botのメッセージはスルー

    const guildId = message.guild.id;
    const spamSettings = loadspamblockSettings(); // 設定を動的に取得

    const userId = message.author.id;
    const now = Date.now();

    if (!userMessages.has(userId)) {
        userMessages.set(userId, []);
    }

    const timestamps = userMessages.get(userId);
    timestamps.push(now);

    // 5秒以上前のメッセージを削除
    userMessages.set(userId, timestamps.filter((timestamp) => now - timestamp <= 5000));

    // 5秒以内に7回以上送信した場合
    if (timestamps.length >= 7) {
        try {
            let targetMember;

            if (message.author.bot) {
                // メッセージがBotなら、コマンド実行者（メッセージの送信者）をタイムアウト
                targetMember = message.member;
            } else {
                // 通常のユーザーの場合、そのユーザーをタイムアウト
                targetMember = await message.guild.members.fetch(userId);
            }

            if (targetMember) {
                await targetMember.timeout(10 * 60 * 1000, '5秒以内に7回以上メッセージ送信');
            }

            // 最近のメッセージを取得
            const messages = await message.channel.messages.fetch({ limit: 100 });
            const userMessagesToDelete = messages.filter((msg) => msg.author.id === userId && (Date.now() - msg.createdTimestamp) < 14 * 24 * 60 * 60 * 1000);

            if (userMessagesToDelete.size > 0) {
                try {
                    await message.channel.bulkDelete(userMessagesToDelete, true);
                    console.log(`Deleted ${userMessagesToDelete.size} messages from ${userId}`);
                } catch (deleteError) {
                    console.error('メッセージの削除に失敗しました:', deleteError);
                }
            } else {
                console.log('削除できるメッセージがありません。');
            }

            await message.channel.send({
                content: `<@${targetMember.id}> がスパム行為でタイムアウトされました。最近のメッセージを削除しました。`,
            });

        } catch (error) {
            console.error('エラーが発生しました:', error);
        }

        // ユーザーの履歴をクリア
        userMessages.delete(userId);
    }
});


const remindersFile = './json/reminders.json';

// リマインダーをJSONから読み込む関数
const loadReminders = () => {
    if (!fs.existsSync(remindersFile)) return [];

    try {
        const data = fs.readFileSync(remindersFile, 'utf8');
        return JSON.parse(data) || [];
    } catch (error) {
        console.error("JSONの読み込みエラー:", error);
        return [];
    }
};

// リマインダーをJSONに保存する関数
const saveReminders = (reminders) => {
    try {
        fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2), 'utf8');
    } catch (error) {
        console.error("リマインダーの保存エラー:", error);
    }
};
            
client.on('guildMemberAdd', async (member) => {
    try {
        const settings = await loadSettings();
        const guildId = member.guild.id;

        // サーバー内のどこかのチャンネルに設定があるか確認
        const channelId = Object.keys(settings).find(id => {
            const channel = member.guild.channels.cache.get(id);
            return channel && settings[id].message;
        });

        if (!channelId) return;

        const message = settings[channelId].message.replace('[user]', `<@${member.id}>`);

        const channel = await member.guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) return;

        // ✅ 権限のチェック方法を修正
        if (!channel.permissionsFor(client.user).has([
            PermissionsBitField.Flags.SendMessages,
            PermissionsBitField.Flags.ViewChannel
        ])) {
            console.error(`チャンネル ${channel.id} でメッセージを送信する権限がありません。`);
            return;
        }

        await channel.send(message);
    } catch (error) {
        console.error('guildMemberAdd イベントの処理中にエラーが発生しました:', error);
    }
});

const raidThreshold = 5; // 例えば10秒以内に5人以上の新規参加があればレイド判定
const timeFrame = 10 * 1000; // 10秒
let joinTimestamps = [];

client.on("guildMemberAdd", async (member) => {
  const now = Date.now();
  joinTimestamps.push(now);

  // 指定時間（10秒）より前のデータを削除
  joinTimestamps = joinTimestamps.filter((timestamp) => now - timestamp < timeFrame);

  if (joinTimestamps.length >= raidThreshold) {
    // レイド攻撃と判断し、サーバーの設定を変更
    const guild = member.guild;
    const everyoneRole = guild.roles.everyone;

    await guild.channels.cache.forEach((channel) => {
      channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: false,
      });
    });

    const logChannel = guild.channels.cache.find(ch => ch.name === "mod-logs");
    if (logChannel) {
      const embed = new EmbedBuilder()
        .setTitle("🚨 レイド攻撃検出！")
        .setDescription("短時間で大量のユーザーが参加したため、一時的にチャットを制限しました。")
        .setColor("RED")
        .setTimestamp();
      logChannel.send({ embeds: [embed] });
    }

    console.log("レイドモード発動！ チャットを制限しました。");
  }
});

// コマンド実行時の処理
client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  // ブラックリストチェック
  if (blacklist.bannedUsers.includes(interaction.user.id)) {
    await interaction.reply({
      content: 'あなたはこのボットの使用を禁止されています。もしサポートが必要な場合サポートサーバーにお越しください。',
      ephemeral: true,
    });
    return; // ここで処理を終了
  }

  if (blacklist.bannedServers.includes(interaction.guild.id)) {
    await interaction.reply({
      content: 'このサーバーはこのボットの使用を禁止されています。サーバーの管理者はもしサポートが必要な場合サポートサーバーにお越しください。',
      ephemeral: true,
    });
    return; // ここで処理を終了
  }

  const command = client.commands.get(interaction.commandName);
  if (!command) {
    return interaction.reply({ content: '不明なコマンドです。', ephemeral: true });
  }

  // 再登録トリガー (例: /reload-commands)
  if (interaction.commandName === 'reload-commands') {
    try {
      await interaction.reply('グローバルコマンドを再登録中...');
      await registerCommands();
      await interaction.editReply('グローバルコマンドの再登録が完了しました！');
    } catch (error) {
      console.error('エラー: コマンド再登録中に問題が発生しました', error);
      await interaction.editReply('コマンドの再登録に失敗しました。もう一度お試しください。');
    }
    return; // 他の処理をスキップ
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`エラー: コマンド「${interaction.commandName}」の実行中に問題が発生しました, error`);
    await interaction.reply({
      content: 'コマンドの実行中にエラーが発生しました。もう一度お試しください。',
      ephemeral: true,
    });
  }
});

// ボットを Discord にログイン
client.login(token);  