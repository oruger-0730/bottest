const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('ボットとの通信速度を確認します。'),
    async execute(interaction) {
        // 現在の応答時間を計測
        const sent = await interaction.reply({ content: '計測中...', fetchReply: true });
        const roundTripLatency = sent.createdTimestamp - interaction.createdTimestamp;

        // 埋め込みメッセージを作成
        const embed = new EmbedBuilder()
            .setColor(0x00FF00) // 緑色
            .setTitle('🏓 Pong!')
            .setDescription('以下は現在のボットの応答速度です。')
            .addFields(
                { name: 'WebSocket Ping', value: `${interaction.client.ws.ping}ms`, inline: true },
                { name: '往復時間', value: `${roundTripLatency}ms`, inline: true }
            )
            .setTimestamp();

        // 埋め込みメッセージを送信
        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
