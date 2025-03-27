const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelid')
        .setDescription('指定したチャンネルのIDを取得します')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('チャンネルを選択')
                .setRequired(true)
        ),
    
    async execute(interaction) {
        // ユーザーが選択したチャンネルを取得
        const channel = interaction.options.getChannel('channel');

        // チャンネルIDを返信
        await interaction.reply(`チャンネル「${channel.name}」のIDは \`${channel.id}\` です。`);
    },
};
