const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const userDataFile = './json/userData.json';

// ルーレットの色と数値の対応表
const redNumbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
const blackNumbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roulette')
    .setDescription('Gを使ってルーレットを回します。')
    .addStringOption(option =>
      option.setName('betamount')
        .setDescription('賭ける金額を入力 (または "all")')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('bettype')
        .setDescription('賭けの種類 (数字/赤/黒/奇数/偶数/範囲)')
        .setRequired(true)
    ),
  
  async execute(interaction) {
    const userId = interaction.user.id;
    let betAmount = interaction.options.getString('betamount');
    const betType = interaction.options.getString('bettype').toLowerCase();

    // ユーザーデータを取得
    let userData = {};
    try {
      if (fs.existsSync(userDataFile)) {
        userData = JSON.parse(fs.readFileSync(userDataFile, 'utf8'));
      }
    } catch (error) {
      console.error('ユーザーデータの読み込みに失敗しました:', error);
    }

    // ユーザーデータがなければ初期化
    if (!userData[userId]) userData[userId] = { G: 0, items: {} };

    // "all" の場合は全額ベット
    if (betAmount === 'all') {
      betAmount = userData[userId].G;
    } else {
      betAmount = parseInt(betAmount);
    }

    // 所持金チェック
    if (isNaN(betAmount) || betAmount <= 0 || userData[userId].G < betAmount) {
      return interaction.reply({
        embeds: [new EmbedBuilder().setColor('Red').setDescription('Gが不足しているか、無効なベット額です。')],
        ephemeral: true
      });
    }

    // ルーレットを回す（0〜36のランダムな数値）
    const roll = Math.floor(Math.random() * 37);
    let resultColor = redNumbers.includes(roll) ? '赤' : blackNumbers.includes(roll) ? '黒' : '緑';
    let multiplier = 0;

    // 勝敗判定
    if (!isNaN(betType) && parseInt(betType) === roll) {
      multiplier = 30; // 数字が一致した場合
    } else if ((betType === '赤' && resultColor === '赤') || (betType === '黒' && resultColor === '黒')) {
      multiplier = 1.5; // 赤 or 黒が一致
    } else if ((betType === '奇数' && roll % 2 === 1 && roll !== 0) || (betType === '偶数' && roll % 2 === 0 && roll !== 0)) {
      multiplier = 1.5; // 奇数 or 偶数が一致
    } else if ((betType === '1-12' && roll >= 1 && roll <= 12) ||
               (betType === '13-24' && roll >= 13 && roll <= 24) ||
               (betType === '25-36' && roll >= 25 && roll <= 36)) {
      multiplier = 2; // 範囲に一致
    }

    // 勝ち負け処理（小数点以下を切り捨て）
    let winnings = Math.floor(betAmount * multiplier);
    if (winnings > 0) {
      userData[userId].G += winnings - betAmount;
    } else {
      userData[userId].G -= betAmount;
    }

    // 更新後のデータを保存
    try {
      fs.writeFileSync(userDataFile, JSON.stringify(userData, null, 2));
    } catch (error) {
      console.error('Gのデータの保存に失敗しました:', error);
    }

    // 結果のEmbed
    const embed = new EmbedBuilder()
      .setColor(multiplier > 0 ? 'Green' : 'Red')
      .setTitle('🎰 ルーレット結果 🎰')
      .setDescription(`ルーレットの結果: **${roll} (${resultColor})**`)
      .addFields(
        { name: '賭けた内容', value: `${betType}`, inline: true },
        { name: '賭けたG', value: `${betAmount} G`, inline: true },
        { name: '倍率', value: `×${multiplier || 0}`, inline: true },
        { name: '獲得G', value: `${winnings} G`, inline: true },
        { name: '現在の所持G', value: `${userData[userId].G} G`, inline: true }
      );

    return interaction.reply({ embeds: [embed] });
  }
};
