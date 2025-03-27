const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('node:fs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('利用可能なコマンド一覧を表示します'),
  async execute(interaction) {
    try {
      // /commands フォルダ内のコマンドファイルを読み込む
      const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

      // 埋め込みのフィールドに追加する内容を格納
      const fields = [];

      for (const file of commandFiles) {
        const command = require(`./${file}`);

        // コマンド名と説明を取得
        if (command.data && command.data.name && command.data.description) {
          fields.push({
            name: `/${command.data.name}`,
            value: command.data.description,
            inline: true,
          });
        }
      }

      // Embed メッセージを作成
      const helpEmbed = new EmbedBuilder()
        .setColor('Green') // 埋め込みの色
        .setTitle('📜 Bot ヘルプ')
        .setDescription('以下は現在利用可能なコマンドの一覧です:')
        .addFields(fields) // 動的に生成したフィールドを追加
        .setFooter({ text: '各コマンドの詳細は /コマンド名 を実行してください' })
        .setTimestamp();

      // 埋め込みを送信
      await interaction.reply({ embeds: [helpEmbed] });
    } catch (error) {
      console.error('エラーが発生しました:', error);
      await interaction.reply({
        content: 'コマンド一覧の取得中にエラーが発生しました。',
        ephemeral: true, // 他のユーザーに見えないようにする
      });
    }
  },
};
