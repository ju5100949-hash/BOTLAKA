const config  = require('../config')

// Per-group active state
const activeOps = new Map()

module.exports = async function bannex(sock, msg, from, sender, args, isGroup, isOwner) {
    if (!isGroup) {
        return sock.sendMessage(from, { text: '❌ Hanya bisa di dalam grup.' }, { quoted: msg })
    }
    if (!isOwner) {
        return sock.sendMessage(from, { text: '❌ Owner only.' }, { quoted: msg })
    }

    const sub = (args[0] || 'start').toLowerCase()

    // ── stop ──────────────────────────────────────────────
    if (sub === 'stop') {
        if (activeOps.get(from)) {
            activeOps.set(from, false)
            return sock.sendMessage(from, { text: '🛑 *Bannex dihentikan.*' }, { quoted: msg })
        }
        return sock.sendMessage(from, { text: '❌ Tidak ada bannex aktif di grup ini.' }, { quoted: msg })
    }

    // ── status ────────────────────────────────────────────
    if (sub === 'status') {
        const running = activeOps.get(from) === true
        return sock.sendMessage(from, {
            text: `*< /bannex > Status*\n\n${running ? '🟢 Aktif' : '🔴 Tidak aktif'}`
        }, { quoted: msg })
    }

    // ── start ─────────────────────────────────────────────
    if (activeOps.get(from) === true) {
        return sock.sendMessage(from, {
            text: '⚠️ Bannex sudah berjalan.\n_Gunakan /bannex stop untuk menghentikan._'
        }, { quoted: msg })
    }

    let meta
    try {
        meta = await sock.groupMetadata(from)
    } catch (_) {
        return sock.sendMessage(from, { text: '❌ Gagal ambil data grup.' }, { quoted: msg })
    }

    const botId    = (sock.user?.id || '').replace(/:.*@/, '@')
    const ownerClean = config.ownerNumber.replace(/:.*@/, '@')

    const targets = meta.participants.filter(p => {
        const pid = p.id.replace(/:.*@/, '@')
        return (
            pid !== botId &&
            pid !== ownerClean &&
            p.admin !== 'admin' &&
            p.admin !== 'superadmin'
        )
    })

    if (!targets.length) {
        return sock.sendMessage(from, {
            text: '⚠️ Tidak ada target yang bisa dikick.\n_Admin & owner dilindungi._'
        }, { quoted: msg })
    }

    await sock.sendMessage(from, {
        text: `⚡ *< /bannex > Dimulai*\n\n*Target:* ${targets.length} anggota\n*Delay:* ${config.bannexDelay / 1000}s per kick\n\n_Gunakan /bannex stop untuk berhenti_`
    }, { quoted: msg })

    activeOps.set(from, true)
    let kicked = 0

    for (const p of targets) {
        if (!activeOps.get(from)) break

        try {
            await sock.groupParticipantsUpdate(from, [p.id], 'remove')
            kicked++

            if (kicked % 5 === 0) {
                await sock.sendMessage(from, {
                    text: `🔄 *Progress:* ${kicked}/${targets.length} kicked`
                })
            }
        } catch (_) {}

        // 5 detik delay antar kick
        await new Promise(r => setTimeout(r, config.bannexDelay))
    }

    activeOps.delete(from)

    await sock.sendMessage(from, {
        text: `✅ *< /bannex > Selesai*\n\n*Kicked:* ${kicked}/${targets.length}`
    }, { quoted: msg })
}
