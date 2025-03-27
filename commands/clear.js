const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('最新メッセージより一つ上のメッセージから一気に削除します')
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('削除するメッセージの数 (1〜99)')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Bot設定上の権限
  async execute(interaction) {
    try {
      // オプションの取得
      const count = interaction.options.getInteger('count');
      const channel = interaction.channel;

      // コマンド実行者の権限確認
      if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const errorEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('権限エラー')
          .setDescription('あなたに以下の権限がありません。```メッセージ管理```');
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // Botの権限確認
      if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
        const errorEmbed = new EmbedBuilder()
          .setColor('Red')
          .setTitle('権限エラー')
          .setDescription('Botに以下の権限がありません。```メッセージ管理```');
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }

      // 削除するメッセージ数のチェック
      if (count < 1 || count > 99) {
        return interaction.reply({
          content: '削除する数は1〜99で指定してください。',
          ephemeral: true,
        });
      }

      await interaction.deferReply(); // 応答を保留

      // 最新メッセージを取得
      const latestMessage = await channel.messages.fetch({ limit: 1 });

      // 最新のメッセージを除いて、それ以前のメッセージを取得
      const messages = await channel.messages.fetch({
        limit: count + 1, // 1つ多く取得して最新メッセージを除外する
      });

      // 最新メッセージを除いたメッセージの一覧
      const filteredMessages = messages.filter(msg => msg.id !== latestMessage.first().id);

      if (filteredMessages.size === 0) {
        return interaction.editReply('削除対象のメッセージが見つかりませんでした。');
      }

      await channel.bulkDelete(filteredMessages, true);  // メッセージ削除

      // 10秒待つ
      setTimeout(async () => {
        // 成功メッセージを送信
        const successEmbed = new EmbedBuilder()
          .setColor('Green')
          .setTitle('成功')
          .setDescription(`${filteredMessages.size}件のメッセージを削除しました。`);

        // メッセージが削除されると、editReply() がエラーになる可能性があるため、新しいメッセージで送信
        await interaction.followUp({ embeds: [successEmbed] });
      }, 3000); // 10秒待機

    } catch (error) {
      console.error('エラー:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('エラー')
        .setDescription('コマンド実行中に問題が発生しました。');

      // もし既に応答しているなら
      if (interaction.deferred) {
        return interaction.editReply({ embeds: [errorEmbed] });
      } else {
        return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};
