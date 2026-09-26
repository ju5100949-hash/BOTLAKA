const fs      = require('fs')
const path    = require('path')
const config  = require('./config')

const decode    = require('./plugins/decode')
const igdl      = require('./plugins/igdl')
const join      = require('./plugins/join')
const bannex    = require('./plugins/bannex')
const antispam  = require('./plugins/antispam')

// ─── spam tracker ─────────────────────────────────────────
const spamMap = new Map()

// ─── menu panel ───────────────────────────────────────────
async function sendMenu(sock, from, msg) {
    const thumb = path.join(__dirname, 'assets', 'thumbnail.jpg')

    const panel = `
╔═══════════════════════════╗
║  *ƧQᄂYΛЯD Bot Tools v2*  ║
║       _by ZaaxX_          ║
╚═══════════════════════════╝

*< /> TOOLS LIST*

< /decode >    — Decode script & rename bot
< /igdl >      — Instagram video downloader
< /join >      — Masukkan bot ke grup
< /bannex >    — Mass kick anggota grup
< /antispam >  — Konfigurasi anti-spam

────────────────────────────
_Powered by ZaaxX Framework_
`.trim()

    await sock.sendMessage(from, {
        text: panel,
        contextInfo: fs.existsSync(thumb)
            ? {
                externalAdReply: {
                    title:     config.botName,
                    body:      config.botTag,
                    thumbnail: fs.readFileSync(thumb),
                    mediaType: 1
                }
              }
            : undefined
    }, { quoted: msg })
}

// ─── command router ───────────────────────────────────────
async function handleCommand(sock, msg, from, sender, body, isGroup, isOwner) {
    const parts = body.trim().split(/\s+/)
    const cmd   = parts[0].slice(config.prefix.length).toLowerCase()
    const args  = parts.slice(1)

    switch (cmd) {
        case 'menu':
        case 'help':
        case 'start':
            return sendMenu(sock, from, msg)

        case 'decode':
            return decode(sock, msg, from, sender, args, isOwner)

        case 'igdl':
            return igdl(sock, msg, from, sender, args)

        case 'join':
            return join(sock, msg, from, sender, args, isOwner)

        case 'bannex':
            return bannex(sock, msg, from, sender, args, isGroup, isOwner)

        case 'antispam':
            return antispam.configure(sock, msg, from, sender, args, isGroup, isOwner)
    }
}

// ─── antispam gate ────────────────────────────────────────
async function handleAntiSpam(sock, msg, from, sender, isGroup) {
    if (!isGroup || !antispam.isEnabled(from)) return

    const key = `${from}:${sender}`
    const now = Date.now()
    const cfg = antispam.getConfig(from)

    const rec = spamMap.get(key) || { count: 0, first: now }

    if (now - rec.first > cfg.window) {
        spamMap.set(key, { count: 1, first: now })
        return
    }

    rec.count++
    spamMap.set(key, rec)

    if (rec.count >= cfg.maxMsg) {
        spamMap.delete(key)
        await antispam.trigger(sock, from, sender, cfg)
    }
}

module.exports = { handleCommand, handleAntiSpam }
