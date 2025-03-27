const { SlashCommandBuilder, EmbedBuilder,ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server')
        .setDescription('サーバー情報を表示します。'),
    async execute(interaction) {
        const { guild } = interaction;

        // サーバーオーナーの取得
        const owner = await guild.fetchOwner(); // サーバーオーナー
        const totalMembers = guild.memberCount; // 合計メンバー数
        const botCount = guild.members.cache.filter(member => member.user.bot).size; // ボット数
        const userCount = totalMembers - botCount; // ユーザー数
        const applicationCount = guild.members.cache.filter(member => member.user.bot).size; // アプリケーション（ボット）の数

        // サーバーブースト情報
        const boostCount = guild.premiumSubscriptionCount || 0; // ブースト数
        const boostLevel = guild.premiumTier; // ブーストレベル

        const channels = await interaction.guild.channels.fetch();

        // チャンネル数の取得 (ボットがアクセスできるテキストとボイス)
        const text = channels.filter(ch=>ch.type === ChannelType.GuildText);
        const voice = channels.filter(ch=>ch.type === ChannelType.GuildVoice);
        const category = channels.filter(ch=>ch.type === ChannelType.GuildCategory);

        // ロールの数（すべてのロール）
        const allRolesCount = guild.roles.cache.size;

        // サーバーアイコン
        const serverIcon = guild.iconURL({ dynamic: true, size: 512 });

        // 埋め込みメッセージの作成
        const embed = new EmbedBuilder()
            .setColor(0x00AEFF) // 青色
            .setTitle(`🌐 サーバー情報: ${guild.name}`)
            .setThumbnail(serverIcon) // アイコンを埋め込み
            .addFields(
                { name: 'サーバー ID', value: guild.id, inline: true },
                { name: '創設者', value: `${owner.user.tag} (${owner.id})`, inline: true },
                { name: '合計人数', value: `👤 ${totalMembers}人`, inline: true },
                { name: 'サーバーブースト', value: `レベル: ${boostLevel}\nブースト数: ${boostCount}`, inline: true },
                { name: 'チャンネル数', value: `チャンネル:${channels.size}個(💬:${text.size} 🔊:${voice.size} 📁:${category.size})`},
                { name: 'ロール数', value: `${allRolesCount}個`, inline: true }
            )
            .setTimestamp();

        // 埋め込みを送信
        await interaction.reply({ embeds: [embed] });
    },
};
