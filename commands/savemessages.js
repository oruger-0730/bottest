const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('save_all_messages')
        .setDescription('指定したチャンネルのすべてのメッセージをファイルとして送信します')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('メッセージを取得するチャンネル')
                .setRequired(true)
        ),
    async execute(interaction) {
        // オプションで選ばれたチャンネル
        const channel = interaction.options.getChannel('channel');
        
        let allMessages = [];
        let lastMessageId = null;

        try {
            // 最初に応答を返して、インタラクションが有効なままにする
            await interaction.reply({
                content: 'メッセージを取得中です...少々お待ちください。',
                ephemeral: true
            });

            // 100メッセージずつ取得
            while (true) {
                const options = { limit: 100 };
                if (lastMessageId) {
                    options.before = lastMessageId;
                }

                const messages = await channel.messages.fetch(options);
                if (messages.size === 0) break; // 取得するメッセージがなければ終了

                allMessages.push(...messages.values()); // `values()` を使ってメッセージを取得

                lastMessageId = messages.last().id; // 最後のメッセージのIDを更新

                // 100メッセージごとに取得して続ける
            }

            // メッセージをテキスト形式で整形
            let messagesText = '';
            allMessages.reverse().forEach(msg => {
                messagesText += `${msg.author.tag}: ${msg.content}\n`;
            });

            // 3秒待機
            await new Promise(resolve => setTimeout(resolve, 3000));  // 3000ms = 3秒

            // ファイルとして保存
            const filePath = './all_messages.txt';
            fs.writeFileSync(filePath, messagesText);

            // ファイルをチャンネルに送信
            await interaction.followUp({
                content: 'すべてのメッセージをファイルとして送信します。',
                files: [filePath]
            });

            // ファイル送信後、ローカルファイルを削除
            fs.unlinkSync(filePath);

        } catch (error) {
            console.error(error);
            await interaction.followUp('メッセージの取得中にエラーが発生しました。');
        }
    },
};
