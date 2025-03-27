const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    PermissionFlagsBits,
    PermissionsBitField,
    TextInputBuilder,
    TextInputStyle,
    EmbedBuilder,
} = require('discord.js');
const fs = require('fs');
const path = require('path');

// auth.json のパス
const authFilePath = path.resolve(__dirname, '../json/auth.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('auth')
        .setDescription('認証ボタンを作成します')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('認証の種類を選択')
                .setRequired(true)
                .addChoices(
                    { name: 'ノーマル', value: 'normal' },
                    { name: '計算', value: 'math' },
                )
        )
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('付与するロールを指定')
                .setRequired(true)
        ),
    async execute(interaction) {
        if (!interaction.guild.members.cache.get(interaction.client.user.id).permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('権限エラー')
                .setDescription('Botに以下の権限がありません。```ロールを管理```');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        if (!interaction.guild.members.cache.get(interaction.user.id).permissions.has(PermissionFlagsBits.ManageRoles)) {
            const errorEmbed = new EmbedBuilder()
                .setColor('Red')
                .setTitle('権限エラー')
                .setDescription('あなたには以下の権限がありません。```ロールを管理```');
            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const type = interaction.options.getString('type');
        const role = interaction.options.getRole('role');

        const customId = `auth_${type}_${role.id}`;

        let authData = {};
        try {
            authData = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));
        } catch (err) {
            if (err.code === 'ENOENT') {
                fs.writeFileSync(authFilePath, JSON.stringify(authData, null, 2));
            } else {
                return interaction.reply({ content: '設定ファイルの読み込みエラーが発生しました。管理者に連絡してください。', ephemeral: true });
            }
        }
        authData[customId] = { type, roleId: role.id };
        fs.writeFileSync(authFilePath, JSON.stringify(authData, null, 2));

        const button = new ButtonBuilder()
            .setCustomId(customId)
            .setLabel(type === 'normal' ? '認証する' : '計算で認証する')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(button);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setDescription(`以下のボタンを押して認証してください。ロール: <@&${role.id}>`);

        await interaction.reply({
            embeds: [embed],
            components: [row],
        });
    },

    async handleInteraction(interaction) {
        if (interaction.isButton()) {
            let authData = {};
            try {
                authData = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));
            } catch (err) {
                return interaction.reply({ content: '設定ファイルの読み込みエラーが発生しました。管理者に連絡してください。', ephemeral: true });
            }

            const buttonConfig = authData[interaction.customId];
            if (!buttonConfig) return;

            const { type, roleId } = buttonConfig;
            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) {
                return interaction.reply({ content: '指定されたロールが見つかりません。', ephemeral: true });
            }

            if (interaction.member.roles.cache.has(role.id)) {
                const Embed = new EmbedBuilder()
                    .setColor('Yellow')
                    .setDescription(`あなたはすでにロール: <@&${role.id}> を持っています。`);
                return interaction.reply({ embeds: [Embed], ephemeral: true });
            }

            if (type === 'math') {
                const modal = new ModalBuilder()
                    .setCustomId(`math_${roleId}`)
                    .setTitle('計算認証');

                const question = generateMathQuestion();
                const questionInput = new TextInputBuilder()
                    .setCustomId('answer')
                    .setLabel(`次の計算を解いてください: ${question.text}`)
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(questionInput);
                modal.addComponents(row);

                interaction.client.mathQuestions = interaction.client.mathQuestions || {};
                interaction.client.mathQuestions[interaction.user.id] = { answer: question.answer, roleId };

                return interaction.showModal(modal);
            }

            await interaction.member.roles.add(role);
            const successEmbed = new EmbedBuilder()
                .setColor('Green')
                .setTitle('認証成功')
                .setDescription(`認証完了！ロール: <@&${role.id}> が付与されました。`);
            return interaction.reply({ embeds: [successEmbed], ephemeral: true });
        }

        if (interaction.isModalSubmit()) {
            const [action, roleId] = interaction.customId.split('_');
            if (action !== 'math') return;

            const role = interaction.guild.roles.cache.get(roleId);
            if (!role) return interaction.reply({ content: '指定されたロールが見つかりません。', ephemeral: true });

            const userAnswer = interaction.fields.getTextInputValue('answer');
            const correctAnswer = interaction.client.mathQuestions?.[interaction.user.id]?.answer;

            if (Number(userAnswer) === correctAnswer) {
                await interaction.member.roles.add(role);
                const successEmbed = new EmbedBuilder()
                    .setColor('Green')
                    .setTitle('正解')
                    .setDescription(`正解です！ロール: <@&${roleId}> が付与されました。`);
                return interaction.reply({ embeds: [successEmbed], ephemeral: true });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setColor('Red')
                    .setTitle('不正解')
                    .setDescription('認証失敗。もう一度お試しください。');
                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};

function generateMathQuestion() {
    const operators = ['+', '-', '*', '/'];
    const operator = operators[Math.floor(Math.random() * operators.length)];

    let num1, num2;
    switch (operator) {
        case '+':
        case '-':
            num1 = Math.floor(Math.random() * 90) + 10; // 10-99 (2桁)
            num2 = Math.floor(Math.random() * 90) + 10; // 10-99 (2桁)
            break;
        case '*':
            num1 = Math.floor(Math.random() * 9) + 1; // 1-9 (1桁)
            num2 = Math.floor(Math.random() * 9) + 1; // 1-9 (1桁)
            break;
        case '/':
            num2 = Math.floor(Math.random() * 9) + 1; // 1-9 (1桁)
            num1 = (Math.floor(Math.random() * 90) + 10) * num2; // num1 is a multiple of num2
            break;
    }

    const questionText = `${num1} ${operator} ${num2}`;
    const answer = eval(questionText);
    return { text: questionText, answer };
}
