const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

// データファイルのパス
const userDataPath = path.join(__dirname, "../json/userData.json");
const farmDataPath = path.join(__dirname, "../json/farm.json");

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("money")
    .setDescription("お金系のコマンドです")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("item")
        .setDescription("持ち物を表示します")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("持ち物を確認したいユーザーを指定します。")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("shop")
        .setDescription("買い物をします")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("商品を選択")
            .setRequired(true)
            .addChoices(
              { name: "農地  100000G", value: "lands" },
              { name: "にんじんの種  700G", value: "carrotseeds" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("購入数を指定")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("ranking")
        .setDescription("お金ランキングを表示します。")
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser =
      interaction.options.getUser("target") || interaction.user;
    const targetUserId = targetUser.id;
    let userData = readJSON(userDataPath);
    let farmData = readJSON(farmDataPath);

    const userDataValues = {
      G: 0, // お金
      riceSeeds: 0, // 米の種
      carrotSeeds: 0,
      rice: 0, // 米
      carrot: 0,
      lastWorkTime: 0,
      userName: `${targetUser.username}`,
    };

    const farmDataValues = {
      farmLevel: 1,
      plantedSeeds: 0,
      nextHarvestTime: 0,
      lastRicePriceChange: 0,
      lastCarrotPriceChange: 0,
      plantedKind: "米",
    };

    // ユーザーデータが存在しない場合、またはキーが不足している場合の初期化
    if (!userData[targetUserId]) {
      userData[targetUserId] = { ...userDataValues };
    } else {
      // 既存のデータに不足しているキーがあれば追加
      for (const key in userDataValues) {
        if (!(key in userData[targetUserId])) {
          userData[targetUserId][key] = userDataValues[key];
        }
      }
    }
    writeJSON(userDataPath, userData);

    if (!farmData[targetUserId]) {
      farmData[targetUserId] = { ...farmDataValues };
    } else {
      // 既存のデータに不足しているキーがあれば追加
      for (const key in farmDataValues) {
        if (!(key in farmData[targetUserId])) {
          farmData[targetUserId][key] = farmDataValues[key];
        }
      }
    }

    // データを保存
    writeJSON(farmDataPath, farmData);

    switch (subcommand) {
      case "item":
        {
          const user = userData[targetUserId];

          const serverEmbed = new EmbedBuilder()
            .setColor("Green")
            .setTitle(`${targetUser.username}の持ち物`) // 修正: username に変更
            .setDescription(`💵 ${user.G}G`);

          await interaction.reply({ embeds: [serverEmbed] });
          break;
        }

        const user = userData[targetUserId];

      case "shop": {
        const user = userData[targetUserId];
        const itemType = interaction.options.getString("type");
        const amount = interaction.options.getInteger("amount");
        const shopItems = {
          lands: { name: "農地", price: 100000 },
          carrotseeds: { name: "にんじんの種", price: 700 },
        };

        if (!shopItems[itemType]) {
          return await interaction.reply({
            content: "無効な商品です。",
            ephemeral: true,
          });
        }

        const itemName = shopItems[itemType].name;
        const totalPrice = shopItems[itemType].price * amount;

        if (user.G < totalPrice) {
          return await interaction.reply({
            content: `所持金が不足しています。\n💵 必要金額: ${totalPrice}G\n👜 あなたの所持金: ${user.G}G`,
            ephemeral: true,
          });
        }

        // `farm.json` を読み込む
        let farmData = readJSON("./json/farm.json");

        // 購入処理
        user.G -= totalPrice;

        if (itemType === "lands") {
          // `farm.json` に `farmLevel` を保存
          farmData[targetUserId].farmLevel =
            (farmData[targetUserId].farmLevel || 0) + amount;
          writeJSON(farmDataPath, farmData);
          writeJSON(userDataPath, userData);
        } else if (itemType === "carrotseeds") {
          // `userData.json` に `carrotSeeds` を保存
          user.carrotSeeds = (user.carrotSeeds || 0) + amount;
          writeJSON(userDataPath, userData);
        }

        const successEmbed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("🛒 購入成功！")
          .setDescription(
            `📦 ${itemName}を ${amount}個 購入しました！\n` +
              `💵 残り所持金: ${user.G}G`
          );

        await interaction.reply({ embeds: [successEmbed] });
      }
      case "ranking": {
        const filePath = "./json/userData.json"; // JSONファイルのパス
        const userData = JSON.parse(fs.readFileSync(filePath, "utf8"));

        // `G`（所持金）で降順ソート
        const sortedUsers = Object.entries(userData)
          .sort((a, b) => (b[1].G || 0) - (a[1].G || 0)) // `G`を比較
          .slice(0, 10); // 上位10人を取得

        // ランキングを作成
        const ranking = sortedUsers
          .map(
            ([userId, data], index) =>
              `${index + 1}位: ${userData[userId].userName} - 所持金: ${
                data.G
              }G`
          )
          .join("\n"); // Discordの埋め込みメッセージで返信

        const embed = new EmbedBuilder()
          .setColor("Gold")
          .setTitle("💰 所持金ランキング 💰")
          .setDescription(ranking || "データがありません");

      　　await interaction.reply({ embeds: [embed] });
      };
    }
  },
};
