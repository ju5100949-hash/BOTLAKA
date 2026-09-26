const config = require('../config')

// Map<groupId, { enabled, maxMsg, window, action, delay }>
const groupConfigs = new Map()

function isEnabled(groupId) {
    return groupConfigs.get(groupId)?.enabled === true
}

function getConfig(groupId) {
    return groupConfigs.get(groupId) || { ...config.antispamDefaults }
}

function ensureConfig(groupId) {
    if (!groupConfigs.has(groupId)) {
        groupConfigs.set(groupId, { enabled: false, ...config.antispamDefaults })
    }
    return groupConfigs.get(groupId)
}

async function trigger(sock, groupId, spammer, cfg) {
    await new Promise(r => setTimeout(r, cfg.delay))

    const tag = `@${spammer.split('@')[0]}`

    if (cfg.action === 'kick') {
        try {
            await sock.groupParticipantsUpdate(groupId, [spammer], 'remove')
            await sock.sendMessage(groupId, {
                text:     `🚫 ${tag} dikick karena spam.`,
                mentions: [spammer]
            })
        } catch (_) {}
        return
    }

    if (cfg.action === 'warn') {
        try {
            await sock.sendMessage(groupId, {
                text:     `⚠️ ${tag} *Warning!* Spam terdeteksi — kurangi kecepatan kirim pesan.`,
                mentions: [spammer]
            })
        } catch (_) {}
        return
    }

    if (cfg.action === 'mute') {
        try {
            await sock.sendMessage(groupId, {
                text:     `🔇 ${tag} *Ditandai untuk mute.* Admin harap tindak lanjut.`,
                mentions: [spammer]
            })
        } catch (_) {}
    }
}

async function configure(sock, msg, from, sender, args, isGroup, isOwner) {
    if (!isGroup) return sock.sendMessage(from, { text: '❌ Grup only.' }, { quoted: msg })
    if (!isOwner) return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg })

    const sub = args[0]?.toLowerCase()
    const cfg = ensureConfig(from)

    if (!sub || sub === 'help') {
        return sock.sendMessage(from, {
            text: `*< /antispam >*\n\nCommands:\n• \`/antispam on\`\n• \`/antispam off\`\n• \`/antispam status\`\n• \`/antispam max <angka>\`\n• \`/antispam window <ms>\`\n• \`/antispam action <warn|kick|mute>\`\n• \`/antispam delay <ms>\`\n\n_Default delay: 3000ms_`
        }, { quoted: msg })
    }

    const validators = {
        on:     () => { cfg.enabled = true;  return `✅ *Antispam aktif.*` },
        off:    () => { cfg.enabled = false; return `🔴 *Antispam dimatikan.*` },
        status: () => `*< /antispam > Status*\n\n*Aktif:* ${cfg.enabled ? '✅' : '❌'}\n*Max Pesan:* ${cfg.maxMsg}\n*Window:* ${cfg.window}ms\n*Aksi:* ${cfg.action}\n*Delay:* ${cfg.delay}ms`
    }

    if (validators[sub]) {
        const out = validators[sub]()
        groupConfigs.set(from, cfg)
        return sock.sendMessage(from, { text: out }, { quoted: msg })
    }

    if (sub === 'max') {
        const v = parseInt(args[1])
        if (isNaN(v) || v < 1) return sock.sendMessage(from, { text: '❌ Angka tidak valid.' }, { quoted: msg })
        cfg.maxMsg = v
    } else if (sub === 'window') {
        const v = parseInt(args[1])
        if (isNaN(v) || v < 1000) return sock.sendMessage(from, { text: '❌ Minimal 1000ms.' }, { quoted: msg })
        cfg.window = v
    } else if (sub === 'action') {
        const v = args[1]?.toLowerCase()
        if (!['warn', 'kick', 'mute'].includes(v)) return sock.sendMessage(from, { text: '❌ Pilih: warn | kick | mute' }, { quoted: msg })
        cfg.action = v
    } else if (sub === 'delay') {
        const v = parseInt(args[1])
        if (isNaN(v) || v < 0) return sock.sendMessage(from, { text: '❌ Delay tidak valid.' }, { quoted: msg })
        cfg.delay = v
    } else {
        return sock.sendMessage(from, { text: '❌ Perintah tidak dikenal. Ketik /antispam help' }, { quoted: msg })
    }

    groupConfigs.set(from, cfg)
    await sock.sendMessage(from, { text: `✅ *${sub}* diperbarui → \`${args[1]}\`` }, { quoted: msg })
}

module.exports = { isEnabled, getConfig, trigger, configure }
