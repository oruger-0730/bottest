const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('ボットの情報を表示します'),
  async execute(interaction) {
    try {
      const aboutEmbed = new EmbedBuilder()
        .setColor(0x00ff00) // 緑色
        .setTitle('ボット情報')
        .setDescription('このボットの詳細情報をご確認ください。')
        .addFields(
          { name: '名前', value: 'Clystal Bot', inline: true },
          { name: 'バージョン', value: '1.3.9', inline: true },
          { name: '作者', value: 'Oruger', inline: true },
          { name: '公式ホームページ', value: '[公式ホームページはこちら](https://oruger-0730.github.io/clystal_bot-home-page/)', inline: false },
          { name: 'サポート', value: '[サポートサーバーに参加](https://discord.gg/Kn47Ktqe9w)', inline: false },
        )
        .setFooter({ text: 'Clystal Bot | Powered by Discord.js', iconURL: 'https://i.imgur.com/AfFp7pu.png' })
        .setTimestamp();

      await interaction.reply({ embeds: [aboutEmbed] });
    } catch (error) {
      console.error('エラー: /about コマンドの実行中に問題が発生しました', error);
      await interaction.reply({
        content: '情報の取得中にエラーが発生しました。もう一度お試しください。',
        ephemeral: true, // 他のユーザーには見えないように表示
      });
    }
  },
};
