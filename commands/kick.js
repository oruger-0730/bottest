const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('指定したユーザーをキックします')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('キックするユーザーを指定してください')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('reason')
        .setDescription('キックの理由を入力してください')
        .setRequired(false)),
  
  async execute(interaction) {
    const targetUser = interaction.options.getUser('target');
    const reason = interaction.options.getString('reason') || '理由なし';
    
    // キック権限のチェック
    if (!interaction.member.permissions.has(PermissionFlagsBits.KickMembers)) {
      const noPermissionEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('エラー')
        .setDescription('キック権限がありません。')
        .setTimestamp();

      return interaction.reply({ embeds: [noPermissionEmbed], ephemeral: true }); // 他のユーザーには見えない形で返信
    }

    const member = interaction.guild.members.cache.get(targetUser.id);

    // キックするユーザーがサーバーにいるか確認
    if (!member) {
      const noMemberEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('エラー')
        .setDescription('そのユーザーはこのサーバーにいません。')
        .setTimestamp();

      return interaction.reply({ embeds: [noMemberEmbed], ephemeral: true });
    }

    try {
      await member.kick(reason);

      const successEmbed = new EmbedBuilder()
        .setColor('Green')
        .setTitle('ユーザーをキックしました')
        .setDescription(`**${targetUser.tag}** がキックされました。\n理由: ${reason}`)
        .setTimestamp();

      return interaction.reply({ embeds: [successEmbed] });
    } catch (error) {
      console.error('キックエラー:', error);

      const errorEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('エラー')
        .setDescription('ユーザーをキックできませんでした。')
        .setTimestamp();

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
};