module.exports = async function join(sock, msg, from, sender, args, isOwner) {
    if (!isOwner) {
        return sock.sendMessage(from, { text: '❌ Owner only command.' }, { quoted: msg })
    }

    const link = args[0]
    if (!link || !link.includes('chat.whatsapp.com')) {
        return sock.sendMessage(from, {
            text: `*< /join >*\n\nUsage: \`/join <invite_link>\`\nContoh: \`/join https://chat.whatsapp.com/xxxxxx\``
        }, { quoted: msg })
    }

    const code = link.replace('https://chat.whatsapp.com/', '').trim()

    if (code.length < 10) {
        return sock.sendMessage(from, { text: '❌ Invite link tidak valid.' }, { quoted: msg })
    }

    try {
        const gid = await sock.groupAcceptInvite(code)
        await sock.sendMessage(from, {
            text: `✅ *Bot berhasil join grup!*\n\n*Group ID:* \`${gid}\`\n_Bot sekarang aktif di grup tersebut._`
        }, { quoted: msg })
    } catch (e) {
        await sock.sendMessage(from, {
            text: `❌ *Gagal join.*\n_${e.message || 'Link expired atau sudah member.'}_`
        }, { quoted: msg })
    }
}
