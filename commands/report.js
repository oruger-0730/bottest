const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits, ActionRowBuilder } = require('discord.js');
const fs = require('fs');
const reportPath = './json/report.json';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('report')
        .setDescription('ユーザーの通報を送信')
        .addUserOption(option => option.setName('user').setDescription('通報するユーザー').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('通報の理由').setRequired(true)),

    async execute(interaction) {
        const reportedUser = interaction.options.getUser('user');
        const reason = interaction.options.getString('reason') || '理由なし';

        // report.jsonの読み込み
        let reportData = {};
        try {
            reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        } catch (err) {
            // ファイルがないか空の場合は初期化
            reportData = {};
        }

        // サーバーのレポート送信先チャンネルが設定されていない場合
        if (!reportData[interaction.guild.id]) {
            return interaction.reply({ content: 'このサーバーにはレポート送信先チャンネルが設定されていません。設定者に確認してください。', ephemeral: true });
        }

        const reportChannelId = reportData[interaction.guild.id].channelId;
        const reportChannel = interaction.guild.channels.cache.get(reportChannelId);

        if (!reportChannel) {
            return interaction.reply({ content: 'レポート送信先チャンネルが見つかりませんでした。設定を確認してください。', ephemeral: true });
        }

        // 通報メッセージ
        const reportEmbed = new EmbedBuilder()
            .setColor('Red')
            .setTitle('通報')
            .setDescription(`**通報者** ${interaction.user.tag}\n**通報されたユーザー:** ${reportedUser.tag}\n**理由:** ${reason}`)
            .setTimestamp();

        // ボタン
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ban_${reportedUser.id}`)
                .setLabel('Ban')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`kick_${reportedUser.id}`)
                .setLabel('Kick')
                .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
                .setCustomId(`timeout_${reportedUser.id}`)
                .setLabel('Timeout')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`ignore_${reportedUser.id}`)
                .setLabel('無視')
                .setStyle(ButtonStyle.Secondary)
        );

        // 通報メッセージ送信
        const message = await reportChannel.send({ embeds: [reportEmbed], components: [buttons] });

        // 管理者のみのフィルター
        const filter = i => i.member.permissions.has(PermissionFlagsBits.Administrator);

        const collector = message.createMessageComponentCollector({ filter });

        collector.on('collect', async i => {
            const [action, userId] = i.customId.split('_');
            if (userId !== reportedUser.id) return;

            let response;
            switch (action) {
                case 'ban':
                    await interaction.guild.members.ban(reportedUser, { reason });
                    response = `🔨 **${reportedUser.tag}** をBanしました。`;
                    break;
                case 'kick':
                    await interaction.guild.members.kick(reportedUser, reason);
                    response = `👢 **${reportedUser.tag}** をKickしました。`;
                    break;
                case 'timeout':
                    const member = await interaction.guild.members.fetch(reportedUser.id);
                    await member.timeout(10 * 60 * 1000, reason); // 10分タイムアウト
                    response = `⏳ **${reportedUser.tag}** を10分間タイムアウトしました。`;
                    break;
                case 'ignore':
                    response = `🙈 **${reportedUser.tag}** の通報を無視しました。`;
                    break;
            }

            const resultEmbed = new EmbedBuilder()
                .setColor('Blue')
                .setDescription(response)
                .setTimestamp();

            await message.edit({ components: [] }); // ボタンを無効化
            await reportChannel.send({ embeds: [resultEmbed] });
            await i.reply({ content: '✅ 処理が完了しました。', ephemeral: true });

            collector.stop(); // コレクターを停止
        });

        await interaction.reply({ content: '✅ 通報を送信しました。管理者が対応します。', ephemeral: true });
    }
};
