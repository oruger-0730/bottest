const { SlashCommandBuilder, EmbedBuilder, InteractionType } = require('discord.js');
const fs = require('fs');
const path = require('path');

// データファイルのパス
const userDataPath = path.join(__dirname, '../json/userData.json');
const farmDataPath = path.join(__dirname, '../json/farm.json');

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('farm')
    .setDescription('農場関連のコマンドです。')
    .addSubcommand(subcommand =>
      subcommand
        .setName('riceseedsget')
        .setDescription('米の種を得ます！')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('plant')
        .setDescription('種を植えて米を育てます！')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('商品を選択')
                .setRequired(true)
                .addChoices(
                    { name: '米', value: 'rice' },
                    { name: 'にんじん', value: 'carrot' },
                )
        )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('植える種の数を指定します。')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('harvest')
        .setDescription('育った米を収穫します！')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('item')
        .setDescription('指定した人の持ち物を表示します。')
        .addUserOption(option =>
          option
            .setName('target')
            .setDescription('持ち物を確認したいユーザーを指定します。')
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('sell')
        .setDescription('収穫した米を売ります！')
        .addStringOption(option =>
      option.setName('type')
        .setDescription('売る作物を選択')
        .setRequired(true)
        .addChoices(
          { name: '米', value: 'rice' },
          { name: 'にんじん', value: 'carrot' }
        )
    )
        .addIntegerOption(option =>
          option
            .setName('amount')
            .setDescription('売る米の数を指定します。')
            .setRequired(true)
        )
    ),
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetUserId = targetUser.id;
        let userData = this.readJSON(userDataPath);
        let farmData = this.readJSON(farmDataPath);
    
    const userDataValues = {
            G: 0,        // お金
            riceSeeds: 0, // 米の種
            carrotSeeds: 0,
            rice: 0,     // 米
            carrot: 0,
            lastWorkTime: 0,
            userName: `${targetUser.username}`,
            
        };
    
        const farmDataValues = {
            farmLevel: 1,
   　　　　　 plantedSeeds: 0,
   　　　　　 nextHarvestTime: 0,
   　　　　　 plantedKind: "米",
   　　　　　 lastRicePriceChange: 0,
   　　　　　 lastCarrotPriceChange: 0,
            
        };

        // ユーザーデータが存在しない場合、またはキーが不足している場合の初期化
        if (!userData[targetUserId]) {
            userData[targetUserId] = { ...userDataValues };
        } else {
            // 既存のデータに不足しているキーがあれば追加
            for (const key in userDataValues) {
                if (!(key in userData[targetUserId])) {
                    userData[targetUserId][key] =userDataValues[key];
                }
            }
        }
        this.writeJSON(userDataPath, userData);
    
        if (!farmData[targetUserId]) {
            farmData[targetUserId] = { ...farmDataValues };
        } else {
            // 既存のデータに不足しているキーがあれば追加
            for (const key in farmDataValues) {
                if (!(key in farmData[targetUserId])) {
                    farmData[targetUserId][key] =farmDataValues[key];
                }
            }
        }
        this.writeJSON(farmDataPath, farmData)

    if (subcommand === 'riceseedsget') {
      await this.riceseedsget(interaction);
    } else if (subcommand === 'plant') {
      await this.plant(interaction);
    } else if (subcommand === 'harvest') {
      await this.harvest(interaction);
    } else if (subcommand === 'item') {
      await this.item(interaction);
    } else if (subcommand === 'sell') {
      await this.sell(interaction);
    }
  },

  async sell(interaction) {
    const userId = interaction.user.id;
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');

    // データの読み込み
    let userData = this.readJSON(userDataPath);
    let farmData = this.readJSON(farmDataPath);

    const user = userData[userId];
    
    if (type === 'rice') {

    // 売れる米があるかチェック
    if (user.rice <= 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('米がありません！まずは /farm harvest で収穫してください。')
        ],
        ephemeral: true
      });
    }

    if (amount > user.rice) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`売れる米の数 (${user.rice}個) を超える数を売ることはできません。`)
        ],
        ephemeral: true
      });
    }

    // 米の価格設定 (750〜1000でランダムに変動)
    const lastRicePriceChange = farmData[userId].lastRicePriceChange || 0;
    const currentTime = Date.now();
    let ricePrice = 750;

    if (currentTime - lastRicePriceChange > 15 * 60 * 1000) {  // 15分経過
      const ricePriceChance = Math.random();
      if (ricePriceChance < 0.5) {
        ricePrice = 750;
      } else {
        ricePrice = Math.floor(Math.random() * (1000 - 751) + 751);
      }

      // 価格の更新
      farmData[userId].lastRicePriceChange = currentTime;
      this.writeJSON(farmDataPath, farmData);
    }

    // 米を売る
    const Gamount = ricePrice * amount;
    user.rice -= amount;  // 売った米の分を減らす
    user.G += ricePrice * amount;

    // データ保存
    this.writeJSON(userDataPath, userData);

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('米を売りました！')
          .setDescription(`${amount}個の米を売って、${Gamount}Gを得ました！\n現在の米の数: ${user.rice}個\n合計G: ${user.G}G`)
      ],
    });
  }
      if (type === 'carrot') {

    // 売れる米があるかチェック
    if (user.carrot <= 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('にんじんがありません！まずは /farm harvest で収穫してください。')
        ],
        ephemeral: true
      });
    }

    if (amount > user.carrot) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`売れるにんじんの数 (${user.carrot}個) を超える数を売ることはできません。`)
        ],
        ephemeral: true
      });
    }

    // 米の価格設定 (750〜1000でランダムに変動)
    const lastCarrotPriceChange = farmData[userId].lastCarrotPriceChange || 0;
    const currentTime = Date.now();
    let carrotPrice = 1000;

    if (currentTime - lastCarrotPriceChange > 15 * 60 * 1000) {  // 15分経過
      const carrotPriceChance = Math.random();
      if (carrotPriceChance < 0.5) {
        carrotPrice = 1000;
      } else {
        carrotPrice = Math.floor(Math.random() * (1500 - 751) + 751);
      }

      // 価格の更新
      farmData[userId].lastCarrotPriceChange = currentTime;
      this.writeJSON(farmDataPath, farmData);
    }

    // 米を売る
    const Gamount = carrotPrice * amount;
    user.carrot -= amount;  // 売った米の分を減らす
    user.G += carrotPrice * amount;

    // データ保存
    this.writeJSON(userDataPath, userData);

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('にんじんを売りました！')
          .setDescription(`${amount}個のにんじんを売って、${Gamount}Gを得ました！\n現在のにんじんの数: ${user.carrot}個\n合計G: ${user.G}G`)
      ],
    });
  }
},
  async item(interaction) {
    const targetUser = interaction.options.getUser('target') || interaction.user;
    const targetUserId = targetUser.id;
    const farmData = this.readJSON(farmDataPath);
    const farm = farmData[targetUserId];
    const plantedSeeds = farmData[targetUserId].plantedSeeds
    const seeds = farmData[targetUserId].plantedSeeds;
    const farmLevel = farmData[targetUserId].farmLevel;
    let userData = this.readJSON(userDataPath);
    const user = userData[targetUserId];
    let message = '';
    if (farmData[targetUserId].plantedSeeds === 0) {
        message = '🌱 種は植えられていません。';
    } else if (farmData[targetUserId].nextHarvestTime <= Date.now()) {
        message = `✅ 収穫可能です！${seeds}個の${farm.plantedKind}を収穫できます。`;
    } else {
        const timeRemaining = farmData[targetUserId].nextHarvestTime - Date.now();
        const minutes = Math.floor(timeRemaining / 60000);
        const seconds = Math.floor((timeRemaining % 60000) / 1000);
        message = `⏳ ${seeds}個の${farm.plantedKind}を収穫可能になるまであと ${minutes}分 ${seconds}秒`;
    }

    const timeRemaining = farmData[targetUserId].nextHarvestTime - Date.now();
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);
    

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Blue')
          .setTitle(`${targetUser.username}さんの持ち物`)
          .setDescription(
            `🚜 農地レベル: ${farmLevel}\n🌱 米の種: ${user.riceSeeds}個\n🍚 米: ${user.rice}個\n🍃 にんじんの種: ${user.carrotSeeds}\n🥕 にんじん: ${user.carrot}\n💵 G: ${user.G}\n${message}`
          )
      ],
    });
  },

  async harvest(interaction) {
    const userId = interaction.user.id;

    // データの読み込み
    let userData = this.readJSON(userDataPath);
    let farmData = this.readJSON(farmDataPath);

    const farm = farmData[userId];

    // 収穫可能かチェック
    if (farm.plantedSeeds === 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('収穫できるものがありません')
            .setDescription('まずは `/farm plant` で種を植えてください。')
        ],
        ephemeral: true
      });
    }

    if (Date.now() < farm.nextHarvestTime) {
      const timeRemaining = farm.nextHarvestTime - Date.now();
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('まだ収穫できません')
            .setDescription(`${farm.plantedKind}が収穫可能になるまであと ${minutes}分 ${seconds}秒お待ちください。`)],
        ephemeral: true
      });
    }

    // 米の収穫
    const seeds = farm.plantedSeeds;
    let message = ''; // メッセージ用変数を定義

    // 収穫処理
    if (farm.plantedKind === '米') {
        userData[userId].rice = (userData[userId].rice || 0) + seeds;
        message = `現在の持ち米: ${userData[userId].rice}個`;
    } else if (farm.plantedKind === 'にんじん') {
        userData[userId].carrot = (userData[userId].carrot || 0) + seeds;
        message = `現在のにんじんの数: ${userData[userId].carrot}個`;
    }

    // 収穫後の処理
    farm.plantedSeeds = 0;
    farm.nextHarvestTime = 0;
    

    // データ保存
    this.writeJSON(userDataPath, userData);
    this.writeJSON(farmDataPath, farmData);

    // 収穫完了メッセージを送信
    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('収穫完了！')
          .setDescription(`農場から ${seeds}個の${farm.plantedKind}を収穫しました！\n${message}`)
      ],
    });
  },

  async plant(interaction) {
    const userId = interaction.user.id;
    const type = interaction.options.getString('type');
    const amount = interaction.options.getInteger('amount');
    
    

    // データの読み込み
    let userData = this.readJSON(userDataPath);
    let farmData = this.readJSON(farmDataPath);

    const user = userData[userId];
    const farm = farmData[userId];
    const maxSeeds = farm.farmLevel * 10; // レベルごとの最大種植え数
    
    if (Date.now() >= farm.nextHarvestTime && farm.plantedSeeds > 0 ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Blue')
            .setTitle('エラー')
            .setDescription('野菜を回収してください。')
        ],
        ephemeral: true
      });
    }
    
    if (type === 'rice') {

    // 植える条件をチェック
    if (user.riceSeeds <= 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('種がありません！まずは `/farm getriceseeds` で種を集めてください。')
        ],
        ephemeral: true
      });
    }

    if (amount > user.riceSeeds) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`持っている種の数 (${user.riceSeeds}個) を超える数を植えることはできません。`)
        ],
        ephemeral: true
      });
    }
      
    if (amount > maxSeeds ) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`最大個数（${maxSeeds}）を超えることはできません。`)
        ],
        ephemeral: true
      });
    }

    if (farm.plantedSeeds >= maxSeeds) {
      const timeRemaining = farm.nextHarvestTime - Date.now();
      const timerminutes = Math.floor(timeRemaining / 60000);
      const timerseconds = Math.floor((timeRemaining % 60000) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`すでに最大数の${farm.plantedKind} の種が${maxSeeds}個植えられています。\n ${farm.plantedSeeds}個収穫可能になるまであと ${timerminutes}分 ${timerseconds}秒お待ちください。`)
        ],
        ephemeral: true
      });
    }
    if(farm.plantedSeeds > 0) {
      const timeRemaining = farm.nextHarvestTime - Date.now();
      const timerminutes = Math.floor(timeRemaining / 60000);
      const timerseconds = Math.floor((timeRemaining % 60000) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`すでに${farm.plantedKind}の種が${farm.plantedSeeds}個植えられてます。\n 収穫可能になるまであと ${timerminutes}分 ${timerseconds}秒お待ちください。`)
        ],
        ephemeral: true
      });
    }
    if(farm.plantedSeeds === 0) {
      const riceseedsToPlant = Math.min(amount, maxSeeds - farm.plantedSeeds);
      farm.plantedKind = '米';
      user.riceSeeds -= riceseedsToPlant;
      farm.plantedSeeds += riceseedsToPlant;
      farm.nextHarvestTime = Date.now() + 30 * 60 * 1000; // 30分後

      // データ保存
      this.writeJSON(userDataPath, userData);
      this.writeJSON(farmDataPath, farmData);

      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('種を植えました！')
            .setDescription(`${farm.plantedKind}の種を${riceseedsToPlant}個植えました！\n収穫可能になるまで30分お待ちください。\n現在の農場の状況: ${farm.plantedSeeds}/${maxSeeds}個`)
        ],
      });
    }
  }
    if (type === 'carrot') {

    // 植える条件をチェック
    if (user.carrotSeeds <= 0) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription('種がありません！まずは /money shopで種を買ってください')
        ],
        ephemeral: true
      });
    }
      if (amount > user.carrotSeeds) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`持っている種の数 (${user.carrotSeeds}個) を超える数を植えることはできません。`)
        ],
        ephemeral: true
      });
    }

    if (farm.plantedSeeds >= maxSeeds) {
      const timeRemaining = farm.nextHarvestTime - Date.now();
      const timerminutes = Math.floor(timeRemaining / 60000);
      const timerseconds = Math.floor((timeRemaining % 60000) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`すでに最大数の${farm.plantedKind}の種が${maxSeeds}個植えられています。\n ${farm.plantedSeeds}個収穫可能になるまであと ${timerminutes}分 ${timerseconds}秒お待ちください。`)
        ],
        ephemeral: true
      });
    }
    if(farm.plantedSeeds > 0 ) {
      const timeRemaining = farm.nextHarvestTime - Date.now();
      const timerminutes = Math.floor(timeRemaining / 60000);
      const timerseconds = Math.floor((timeRemaining % 60000) / 1000);
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('エラー')
            .setDescription(`すでに${farm.plantedKind}の種が ${farm.plantedSeeds}個植えられてます。\n 収穫可能になるまであと ${timerminutes}分 ${timerseconds}秒お待ちください。`)
        ],
        ephemeral: true
      });
    }
    if(farm.plantedSeeds === 0) {
      const riceseedsToPlant = Math.min(amount, maxSeeds - farm.plantedSeeds);
      user.carrotSeeds -= riceseedsToPlant;
      farm.plantedKind = 'にんじん';
      farm.plantedSeeds += riceseedsToPlant;
      farm.nextHarvestTime = Date.now() + 30 * 60 * 1000; // 30分後

      // データ保存
      this.writeJSON(userDataPath, userData);
      this.writeJSON(farmDataPath, farmData);

      interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Green')
            .setTitle('種を植えました！')
            .setDescription(
              `${farm.plantedKind}の種を${riceseedsToPlant}個植えました！\n収穫可能になるまで30分お待ちください。\n現在の農場の状況: ${farm.plantedSeeds}/${maxSeeds}個`
            )
        ],
      });
    }
  }
},

  async riceseedsget(interaction) {
    const userId = interaction.user.id;

    // データの読み込み
    let userData = this.readJSON(userDataPath);

    const coolDownTime = 600000; // 10分 (ミリ秒)
    const currentTime = Date.now();
    const lastWorkTime = userData[userId].lastWorkTime;

    if (currentTime - lastWorkTime < coolDownTime) {
      const timeRemaining = coolDownTime - (currentTime - lastWorkTime);
      const minutes = Math.floor(timeRemaining / 60000);
      const seconds = Math.floor((timeRemaining % 60000) / 1000);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('Red')
            .setTitle('クールタイム中')
            .setDescription(`次に種を獲得できるまであと ${minutes}分 ${seconds}秒です。`),
        ],
        ephemeral: true
      });
    }

    // 種を獲得
    const riceSeedsEarned = Math.floor(Math.random() * 5) + 5;
    userData[userId].lastWorkTime = currentTime;
    userData[userId].riceSeeds += riceSeedsEarned;

    this.writeJSON(userDataPath, userData);

    interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('Green')
          .setTitle('お疲れ様でした！')
          .setDescription(`${riceSeedsEarned}個の米の種を得ました！\n現在の米の種の数は${userData[userId].riceSeeds}個です。`),
      ],
    });
  },

// JSON読み込み
readJSON(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify({}, null, 2), 'utf-8');
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (error) {
    console.error('JSON ファイルの読み込みエラー:', error);
    return {};
  }
},

// JSON書き込み
writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('JSON ファイルの保存エラー:', error);
  }
},
};