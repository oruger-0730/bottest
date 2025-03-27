const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

// データファイルのパス
const userDataPath = path.join(__dirname, '../json/userData.json');
const giftCodesPath = path.join(__dirname, '../json/giftCodes.json');

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) return {};
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    } catch (error) {
        console.error(`ファイル書き込みエラー: ${filePath}`, error);
    }
}

function generateGiftCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gift')
        .setDescription('ギフトコマンドです。')
        .addSubcommand(subcommand =>
            subcommand
                .setName('give')
                .setDescription('対象のユーザーに直接送ります。')
                .addUserOption(option =>
                    option.setName("target")
                        .setDescription("ギフトを送るユーザーを指定します。(10%の税金がかかります)")
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('ギフトするGの数を指定します。')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('code')
                .setDescription('ギフトコードを生成します。(10%の税金がかかります)')
                .addIntegerOption((option) =>
                    option.setName("amount")
                        .setDescription("ギフトするGの数を指定します。")
                        .setRequired(true)
                        .addChoices(
                            { name: '100G', value: 100 },
                            { name: '300G', value: 300 },
                            { name: '500G', value: 500 },
                            { name: '1000G', value: 1000 },
                            { name: '3000G', value: 3000 },
                            { name: '5000G', value: 5000 },
                            { name: '10000G', value: 10000 },
                            { name: '30000G', value: 30000 },
                            { name: '50000G', value: 50000 },
                            { name: '100000G', value: 100000 }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('get')
                .setDescription('ギフトコードを使用してお金を獲得します。')
                .addStringOption(option =>
                    option.setName('code')
                        .setDescription('使用するギフトコードを入力してください。')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('自分が作成したギフトコードを一覧で表示します。')
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        let userData = readJSON(userDataPath);
        let giftCodes = readJSON(giftCodesPath);

        switch (subcommand) {
            case "give": {
                const targetUser = interaction.options.getUser("target");
                const interactionUserId = interaction.user.id;
                const targetUserId = targetUser.id;
                const amount = interaction.options.getInteger("amount");

                if (!userData[interactionUserId]) userData[interactionUserId] = { G: 0 };
                if (!userData[targetUserId]) userData[targetUserId] = { G: 0 };

                const sender = userData[interactionUserId];
                const receiver = userData[targetUserId];
                const totalPrice = Math.floor(amount * 1.1);

                if (amount <= 0) {
                    return await interaction.reply({ content: "送金額は1G以上である必要があります。", ephemeral: true });
                }

                if (sender.G < totalPrice) {
                    return await interaction.reply({ content: `所持金が不足しています。\n💵 必要金額: ${totalPrice}G\n👜 あなたの所持金: ${sender.G}G`, ephemeral: true });
                }

                sender.G -= totalPrice;
                receiver.G += amount;
                writeJSON(userDataPath, userData);

                const successEmbed = new EmbedBuilder()
                    .setColor("Green")
                    .setTitle("🎁 送金成功！")
                    .setDescription(`💰 ${targetUser.username} に ${amount}G 送りました！\n💵 残り所持金: ${sender.G}G`);

                await interaction.reply({ embeds: [successEmbed] });
                break;
            }
            case "code": {
                const interactionUserId = interaction.user.id;
                const amount = interaction.options.getInteger("amount");

                if (!userData[interactionUserId]) userData[interactionUserId] = { G: 0 };

                const totalPrice = Math.floor(amount * 1.1);

                if (userData[interactionUserId].G < totalPrice) {
                    return await interaction.reply({ content: `所持金が不足しています。\n💵 必要金額: ${totalPrice}G\n👜 あなたの所持金: ${userData[interactionUserId].G}G`, ephemeral: true });
                }

                userData[interactionUserId].G -= totalPrice;
                const giftCode = generateGiftCode();
                giftCodes[giftCode] = { amount, userId: interactionUserId };  // ユーザーIDを登録

                writeJSON(userDataPath, userData);
                writeJSON(giftCodesPath, giftCodes);

                const codeEmbed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("🎟 ギフトコード生成完了！")
                    .setDescription(`🆔 コード: \`${giftCode}\`\n💰 金額: ${amount}G`);

                await interaction.reply({ embeds: [codeEmbed], ephemeral: true });
                break;
            }
            case "get": {
                const code = interaction.options.getString("code");
                const interactionUserId = interaction.user.id;

                if (!giftCodes[code]) {
                    return await interaction.reply({ content: "無効なギフトコードです。", ephemeral: true });
                }

                const giftData = giftCodes[code];
                const amount = giftData.amount;  // 金額を取得

                if (!userData[interactionUserId]) userData[interactionUserId] = { G: 0 };
                userData[interactionUserId].G += amount;
                delete giftCodes[code];

                writeJSON(userDataPath, userData);
                writeJSON(giftCodesPath, giftCodes);

                const codeEmbed = new EmbedBuilder()
                    .setColor("Blue")
                    .setTitle("✅ ギフト受け取り成功！")
                    .setDescription(`🎁 ギフトを受け取りました！\n💰 金額: ${amount}G`);

                await interaction.reply({ embeds: [codeEmbed] });
                break;
            }
            case "list": {
                const interactionUserId = interaction.user.id;
                const userGiftCodes = Object.entries(giftCodes)
                    .filter(([code, data]) => data.userId === interactionUserId)  // ユーザーIDが一致するギフトコードをフィルタリング
                    .map(([code, data]) => `${code}: ${data.amount}G`);  // ギフトコードと金額をリスト化

                if (userGiftCodes.length === 0) {
                    return await interaction.reply({ content: "作成したギフトコードはありません。", ephemeral: true });
                }

                const listEmbed = new EmbedBuilder()
                    .setColor("Yellow")
                    .setTitle("💳 あなたのギフトコード一覧")
                    .setDescription(userGiftCodes.join("\n"));

                await interaction.reply({ embeds: [listEmbed], ephemeral: true });
                break;
            }
        }
    }
};
