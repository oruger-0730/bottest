const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

// admin.jsonとblacklist.jsonのパス
const adminFilePath = path.join(__dirname, "../json/admin.json");
const blacklistFilePath = path.join(__dirname, "../json/blacklist.json");
const farmPath = path.join(__dirname, "../json/farm.json");
const userDataPath = path.join(__dirname, "../json/userData.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("管理者専用のコマンドです")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("server")
        .setDescription("ボットが参加中のサーバーを表示します")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leave")
        .setDescription("指定されたサーバーからボットを退出させます")
        .addStringOption((option) =>
          option
            .setName("server_id")
            .setDescription("サーバーID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("invite")
        .setDescription("指定されたサーバーの招待リンクを生成します")
        .addStringOption((option) =>
          option
            .setName("server_id")
            .setDescription("サーバーID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("member")
        .setDescription("管理者を追加します")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("管理者として追加するユーザー")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("blacklist")
        .setDescription("ユーザーまたはサーバーをブラックリストに登録します")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("ブラックリストのタイプ (user または server)")
            .setRequired(true)
            .addChoices(
              { name: "ユーザー", value: "user" },
              { name: "サーバー", value: "server" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("id")
            .setDescription("ユーザーIDまたはサーバーID")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reload")
        .setDescription("指定したコマンドをリロードします")
        .addStringOption((option) =>
          option
            .setName("command_name")
            .setDescription("リロードするコマンドの名前")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("db")
        .setDescription("ユーザーの情報を確認します")
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("管理者として追加するユーザー")
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
            .setName('code')
            .setDescription('指定した名前のコードをファイルにして送信')
            .addStringOption(option =>
              option.setName('filename')
                .setDescription('出力するコードのファイル名')
                .setRequired(true)
         )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const member = interaction.member;

    try {
      const adminData = JSON.parse(fs.readFileSync(adminFilePath, "utf-8"));

      // 実行者が管理者かどうか確認
      if (!adminData.admins.includes(member.id)) {
        const errorEmbed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("権限エラー")
          .setDescription("このコマンドはbot関係者のみ実行できます。(一般の方は使用できません)");
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      switch (subcommand) {
        case "server":
          // サーバー表示処理
          const guilds =
            interaction.client.guilds.cache
              .map((guild) => `**${guild.name}** (ID: ${guild.id})`)
              .join("\n") || "ボットは参加していません。";
          const serverEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("参加中のサーバー一覧")
            .setDescription(guilds);
          await interaction.reply({ embeds: [serverEmbed], ephemeral: true });
          break;

        case "leave":
          // サーバー退出処理
          const serverId = interaction.options.getString("server_id");
          const guild = interaction.client.guilds.cache.get(serverId);

          if (!guild) {
            const errorEmbed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("エラー")
              .setDescription("指定されたサーバーが見つかりません。");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }

          await guild.leave();
          const successLeaveEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("サーバー退出成功")
            .setDescription(`${guild.name} サーバーから退出しました。`);
          await interaction.reply({
            embeds: [successLeaveEmbed],
            ephemeral: true,
          });
          break;

        case "invite":
          // 招待リンク生成処理
          const inviteServerId = interaction.options.getString("server_id");
          const inviteGuild =
            interaction.client.guilds.cache.get(inviteServerId);

          if (!inviteGuild) {
            const errorEmbed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("エラー")
              .setDescription("指定されたサーバーが見つかりません。");
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }

          const invite = await inviteGuild.invites.create(
            inviteGuild.systemChannel.id,
            {
              unique: true,
              max_uses: 1,
              max_age: 0,
            }
          );

          const inviteEmbed = new EmbedBuilder()
            .setColor("Blue")
            .setTitle("招待リンク")
            .setDescription(`招待リンク: ${invite.url}`);
          await interaction.reply({ embeds: [inviteEmbed], ephemeral: true });
          break;

        case "member":
          // 管理者追加処理
          const user = interaction.options.getUser("user");
          const userId = user.id;

          if (!adminData.admins.includes(userId)) {
            adminData.admins.push(userId);
            fs.writeFileSync(adminFilePath, JSON.stringify(adminData, null, 2));

            const successEmbed = new EmbedBuilder()
              .setColor("Green")
              .setTitle("管理者追加成功")
              .setDescription(`${user.tag} を管理者として追加しました。`);
            await interaction.reply({
              embeds: [successEmbed],
              ephemeral: true,
            });
          } else {
            const alreadyAdminEmbed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("エラー")
              .setDescription(`${user.tag} はすでに管理者です。`);
            await interaction.reply({
              embeds: [alreadyAdminEmbed],
              ephemeral: true,
            });
          }
          break;

        case "blacklist":
          // ブラックリストに登録する処理
          const type = interaction.options.getString("type"); // user または server
          const id = interaction.options.getString("id");

          try {
            // blacklist.jsonの読み込み
            const blacklistData = JSON.parse(
              fs.readFileSync(blacklistFilePath, "utf-8")
            );

            // ブラックリストにIDを追加
            if (type === "user") {
              if (!blacklistData.bannedUsers.includes(id)) {
                blacklistData.bannedUsers.push(id);
              } else {
                const alreadyExistsEmbed = new EmbedBuilder()
                  .setColor("Red")
                  .setTitle("エラー")
                  .setDescription(
                    `指定されたユーザーID \`${id}\` は既にブラックリストに登録されています。`
                  );
                return interaction.reply({
                  embeds: [alreadyExistsEmbed],
                  ephemeral: true,
                });
              }
            } else if (type === "server") {
              if (!blacklistData.bannedServers.includes(id)) {
                blacklistData.bannedServers.push(id);
              } else {
                const alreadyExistsEmbed = new EmbedBuilder()
                  .setColor("Red")
                  .setTitle("エラー")
                  .setDescription(
                    `指定されたサーバーID \`${id}\` は既にブラックリストに登録されています。`
                  );
                return interaction.reply({
                  embeds: [alreadyExistsEmbed],
                  ephemeral: true,
                });
              }
            } else {
              const invalidTypeEmbed = new EmbedBuilder()
                .setColor("Red")
                .setTitle("エラー")
                .setDescription(
                  "無効なタイプが指定されました。`user` または `server` を選択してください。"
                );
              return interaction.reply({
                embeds: [invalidTypeEmbed],
                ephemeral: true,
              });
            }

            // 変更を保存
            fs.writeFileSync(
              blacklistFilePath,
              JSON.stringify(blacklistData, null, 2)
            );

            // 成功メッセージ
            const successEmbed = new EmbedBuilder()
              .setColor("Green")
              .setTitle("ブラックリスト登録成功")
              .setDescription(
                type === "user"
                  ? `ユーザーID \`${id}\` をブラックリストに登録しました。`
                  : `サーバーID \`${id}\` をブラックリストに登録しました。`
              );
            await interaction.reply({
              embeds: [successEmbed],
              ephemeral: true,
            });
          } catch (error) {
            console.error(error);

            // エラーメッセージ
            const errorEmbed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("エラー")
              .setDescription(
                "ブラックリストの読み込みまたは書き込み中にエラーが発生しました。"
              );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          break;

        case "reload":
          // コマンドのリロード処理
          const commandName = interaction.options.getString("command_name");
          const commandFilePath = path.join(__dirname, `./${commandName}.js`);

          try {
            delete require.cache[require.resolve(commandFilePath)];
            require(commandFilePath);
            const reloadEmbed = new EmbedBuilder()
              .setColor("Green")
              .setTitle("コマンドリロード成功")
              .setDescription(`${commandName} コマンドをリロードしました。`);
            await interaction.reply({ embeds: [reloadEmbed], ephemeral: true });
          } catch (error) {
            console.error(error);
            const errorEmbed = new EmbedBuilder()
              .setColor("Red")
              .setTitle("エラー")
              .setDescription(
                `${commandName} コマンドのリロード中にエラーが発生しました。`
              );
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
          }
          break;
          
        case "db":
        const targetUser = interaction.options.getUser('user'); // ユーザー取得
        if (!targetUser) {
            return interaction.reply({ content: '❌ ユーザーが見つかりません。', ephemeral: true });
        }

        const targetUserId = targetUser.id;
        const userName = targetUser.username; // ユーザー名

        const userDataPath = './json/userData.json';
        const farmDataPath = './json/farm.json';

        // JSONを読み込む関数
        function readJSON(filePath) {
            try {
                return JSON.parse(fs.readFileSync(filePath, 'utf8'));
            } catch (err) {
                console.error(`${filePath} の読み込みに失敗しました:`, err);
                return {};
            }
        }

        // データ取得
        const userData = readJSON(userDataPath);
        const farmData = readJSON(farmDataPath);

        const userStats = userData[targetUserId] || {};
        const farmStats = farmData[targetUserId] || {};

        // データがどちらもない場合の処理
        if (Object.keys(userStats).length === 0 && Object.keys(farmStats).length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('❌ データが見つかりません')
                        .setDescription(`指定されたユーザー <@${targetUserId}> のデータが見つかりませんでした。`)
                ],
                ephemeral: true
            });
        }

        // ユーザーデータ埋め込み作成
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle(`📌 ${userName} のデータ`)
            .setDescription(`ユーザーID: \`${targetUserId}\``);

        // userData.json の情報
        embed.addFields({ name: '📂 **ユーザーデータ**', value: ' ' });
        embed.addFields(
            { name: '💰 所持金', value: `${userStats.G ?? '0'} G`, inline: true },
            { name: '🌾 米の種', value: `${userStats.riceSeeds ?? '0'}`, inline: true },
            { name: '🥕 にんじんの種', value: `${userStats.carrotSeeds ?? '0'}`, inline: true },
            { name: '🌾 米', value: `${userStats.rice ?? '0'}`, inline: true },
            { name: '🥕 にんじん', value: `${userStats.carrot ?? '0'}`, inline: true }
        );

        // farm.json の情報
        embed.addFields({ name: '📂 **農場データ**', value: ' ' });
        embed.addFields(
            { name: '🏡 農場レベル', value: `${farmStats.farmLevel ?? '1'}`, inline: true },
            { name: '🌱 植えた種', value: `${farmStats.plantedSeeds ?? '0'}`, inline: true },
            { name: '🕒 収穫予定', value: farmStats.nextHarvestTime ? `<t:${Math.floor(farmStats.nextHarvestTime / 1000)}:R>` : '未定', inline: true },
            { name: '🌾 育てている作物', value: farmStats.plantedKind ?? 'なし', inline: true }
        );

        // メッセージ送信
        await interaction.reply({ embeds: [embed], ephemeral: true });
          break;
          case "code":
    try {
        const filename = interaction.options.getString('filename');

        // ファイルの拡張子チェック（省略可能）
        if (!filename.endsWith('.js')) {
            return interaction.reply({ content: '`.js` ファイルのみ指定できます。', ephemeral: true });
        }

        // ファイルパスの決定
        const filePath = path.join(__dirname, filename);

        // ファイルが存在するかチェック
        if (!fs.existsSync(filePath)) {
            return interaction.reply({ content: `ファイル \`${filename}\` が見つかりません。`, ephemeral: true });
        }

        // ファイルを添付して返信
        const file = new AttachmentBuilder(filePath);
        await interaction.reply({ content: `ファイル \`${filename}\` を送信します。`, files: [file] });

    } catch (error) {
        console.error("ファイル送信中にエラーが発生:", error);
        interaction.reply({ content: 'ファイルの送信に失敗しました。', ephemeral: true });
    }
    break;
        default:
          break;
      }
    } catch (error) {
      console.error(error);
      const errorEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("エラー")
        .setDescription("予期しないエラーが発生しました。");
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  },
};
