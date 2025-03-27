const fs = require('fs');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, PermissionsBitField, PermissionFlagsBits } = require('discord.js');

// ファイルパス
const joinMessagePath = './json/joinMessages.json';
const reportPath = './json/report.json';
const spamblockPath = './json/spamblock.json';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setting')
    .setDescription('Botの設定を変更します')
    .addSubcommand(subcommand =>
      subcommand
        .setName('joinmessage')
        .setDescription('参加メッセージの設定')
        .addChannelOption(option => option.setName('channel').setDescription('メッセージを送るチャンネル').setRequired(true))
        .addStringOption(option => option.setName('message').setDescription('[user] でメンションを入れるメッセージ').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('report')
        .setDescription('レポート送信先を設定')
        .addChannelOption(option => option.setName('channel').setDescription('レポート送信先チャンネル').setRequired(true))
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('spamblock')
        .setDescription('スパムをブロックします。')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      const noPermissionEmbed = new EmbedBuilder()
        .setColor('Red')
        .setTitle('エラー')
        .setDescription('あなたに以下の権限がありません。```管理者```')
        .setTimestamp();

      return interaction.reply({ embeds: [noPermissionEmbed], ephemeral: true }); // 他のユーザーには見えない形で返信
    }
    if (!interaction.guild.members.cache.get(interaction.client.user.id).permissions.has(PermissionsBitField.Flags.SendMessages)) {
      const errorEmbed = new EmbedBuilder()
          .setColor('Red')  // エラー時は赤
          .setTitle('権限エラー')
          .setDescription('Botに以下の権限がありません。```メッセージを送信```');
      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    } else { if (subcommand === 'joinmessage') {
      const channel = interaction.options.getChannel('channel');
      const message = interaction.options.getString('message');

      // joinMessages.jsonの読み込み
      let joinMessagesData = {};
      try {
        joinMessagesData = JSON.parse(fs.readFileSync(joinMessagePath, 'utf8'));
      } catch (err) {
        // ファイルがないか空の場合は初期化
        joinMessagesData = {};
      }

      // 既存のチャンネルメッセージを削除
      if (joinMessagesData[channel.id]) {
        // メッセージがすでに存在する場合は削除
        delete joinMessagesData[channel.id];
        fs.writeFileSync(joinMessagePath, JSON.stringify(joinMessagesData, null, 2));

        const embed = new EmbedBuilder()
          .setColor('Red')
          .setDescription(`既に設定されていた参加メッセージを削除しました。`);

        return interaction.reply({ embeds: [embed] });
      } else {
        // 新しい参加メッセージを追加
        joinMessagesData[channel.id] = { message: message };

        // 新しいデータをファイルに保存
        fs.writeFileSync(joinMessagePath, JSON.stringify(joinMessagesData, null, 2));

        // 応答メッセージ
        const embed = new EmbedBuilder()
          .setColor('Green')
          .setDescription(`参加メッセージをチャンネル <#${channel.id}> に設定しました。\nメッセージ内容: \`${message}\``);

        return interaction.reply({ embeds: [embed] });
      }
    }

    if (subcommand === 'report') {
      const channel = interaction.options.getChannel('channel');

      // report.jsonの読み込み
      let reportData = {};
      try {
        reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      } catch (err) {
        // ファイルがないか空の場合は初期化
        reportData = {};
      }

      // サーバーIDでレポート送信先を設定
      reportData[interaction.guild.id] = { channelId: channel.id };

      // 新しいデータをファイルに保存（サーバーごとに上書き）
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

      // 応答メッセージ
      const embed = new EmbedBuilder()
        .setColor('Blue')
        .setDescription(`サーバーのレポート送信先チャンネルを <#${channel.id}> に設定しました。`);

      return interaction.reply({ embeds: [embed] });
    }
    if (subcommand === 'spamblock') {
    const id = interaction.guild.id;
    const spamblockPath = "./json/spamblock.json";

    let spamBlockData = {};
    
    try {
        spamBlockData = JSON.parse(fs.readFileSync(spamblockPath, 'utf8'));
    } catch (err) {
        // ファイルがないか、読み込めない場合は初期化
        spamBlockData[interaction.guild.id] = { "enabled": true };
    }

    // `servers` キーが存在しない場合は初期化
    if (!Array.isArray(spamBlockData.servers)) {
        spamBlockData.servers = [];
    }

    // 重複防止してサーバーIDを追加
    if (!spamBlockData.servers.includes(id)) {
        spamBlockData.servers.push(id);
    }

    // 新しいデータをファイルに保存
    fs.writeFileSync(spamblockPath, JSON.stringify(spamBlockData, null, 2));

    // 応答メッセージ
    const embed = new EmbedBuilder()
        .setColor('Blue')
        .setDescription(`スパムブロックの設定をしました。`);

    return interaction.reply({ embeds: [embed] });
      }
    }
　}
}