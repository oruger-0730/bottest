const {
    SlashCommandBuilder,
    PermissionsBitField,
    EmbedBuilder,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('指定したロールを付与または剥奪します')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('ロールを付与します')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('ロールを付与する対象ユーザー')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('付与するロール')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('ロールを剥奪します')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('ロールを剥奪する対象ユーザー')
                        .setRequired(true)
                )
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('剥奪するロール')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getMember('user');
        const role = interaction.options.getRole('role');
        const botMember = interaction.guild.members.cache.get(interaction.client.user.id);

        // BOTの権限チェック
        if (!botMember.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('権限エラー')
                        .setDescription('Botに以下の権限がありません。```ロールを管理```')
                ],
                ephemeral: true,
            });
        }

        // BOTのロール階層チェック
        if (botMember.roles.highest.position <= role.position) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('階層エラー')
                        .setDescription('Botのロールが指定したロールよりも低い位置にあります。')
                ],
                ephemeral: true,
            });
        }

        // ユーザーの権限チェック
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('権限エラー')
                        .setDescription('あなたには以下の権限がありません。```ロールを管理```')
                ],
                ephemeral: true,
            });
        }

        // ロールの操作
        try {
            if (subcommand === 'add') {
                if (targetUser.roles.cache.has(role.id)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('Yellow')
                                .setDescription(`<@${targetUser.id}> はすでに <@&${role.id}> を持っています。`)
                        ],
                        ephemeral: true,
                    });
                }

                await targetUser.roles.add(role);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setDescription(`<@${targetUser.id}> に <@&${role.id}> を付与しました。`)
                    ]
                });
            } else if (subcommand === 'remove') {
                if (!targetUser.roles.cache.has(role.id)) {
                    return interaction.reply({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('Yellow')
                                .setDescription(`<@${targetUser.id}> は <@&${role.id}> を持っていません。`)
                        ],
                        ephemeral: true,
                    });
                }

                await targetUser.roles.remove(role);
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('Green')
                            .setDescription(`<@${targetUser.id}> から <@&${role.id}> を剥奪しました。`)
                    ]
                });
            }
        } catch (err) {
            console.error(err);
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('Red')
                        .setTitle('エラー')
                        .setDescription('ロールの操作中にエラーが発生しました。管理者に連絡してください。')
                ],
                ephemeral: true,
            });
        }
    },
};
