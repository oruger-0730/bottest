const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js'); // Colors をインポート

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('埋め込みメッセージを作成します')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('埋め込みメッセージのタイトル')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('description')
                .setDescription('埋め込みメッセージの内容')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('color')
                .setDescription('埋め込みメッセージの色（例: RED, Blue, Green または #FF0000）')
                .setRequired(false)
        ),
    async execute(interaction) {
        try {
            // ユーザーからの入力を取得
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const colorInput = interaction.options.getString('color') || 'BLUE'; // デフォルトは BLUE

            // 色を処理
            let embedColor;
            if (/^#[0-9A-Fa-f]{6}$/.test(colorInput)) {
                // 16進数カラーコードの場合
                embedColor = colorInput;
            } else {
                // Colors 定数に含まれるキーを柔軟に比較
                const colorKey = Object.keys(Colors).find(key => key.toLowerCase() === colorInput.trim().toLowerCase());
                embedColor = Colors[colorKey] || Colors.Blue;
            }

            // 埋め込みメッセージを作成
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(description)
                .setColor(embedColor) // 色を設定
                .setTimestamp();

            // メッセージを送信
            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('エラー:', error);
            await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました。', ephemeral: true });
        }
    },
};
