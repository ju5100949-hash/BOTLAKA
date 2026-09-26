const {
    default: makeWASocket,
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys')
const pino        = require('pino')
const { Boom }    = require('@hapi/boom')
const path        = require('path')
const fs          = require('fs')
const config      = require('./config')
const { handleCommand, handleAntiSpam } = require('./handler')

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState('./sessions')
    const { version }          = await fetchLatestBaileysVersion()

    const sock = makeWASocket({
        version,
        logger:             pino({ level: 'silent' }),
        printQRInTerminal:  true,
        auth:               state,
        browser:            ['ƧQᄂYΛЯD', 'Chrome', '121.0.0'],
        getMessage: async () => ({ conversation: '' })
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
        if (connection === 'close') {
            const code = lastDisconnect?.error?.output?.statusCode
            if (code !== DisconnectReason.loggedOut) {
                console.log('[ƧQᄂYΛЯD] Reconnecting...')
                startBot()
            } else {
                console.log('[ƧQᄂYΛЯD] Logged out. Delete /sessions and restart.')
            }
        }

        if (connection === 'open') {
            console.log('[ƧQᄂYΛЯD] ✅ Connected as', sock.user?.id)

            // Set profile picture dari assets/thumbnail.jpg
            const thumbPath = path.join(__dirname, 'assets', 'thumbnail.jpg')
            if (fs.existsSync(thumbPath)) {
                try {
                    await sock.updateProfilePicture(sock.user.id, fs.readFileSync(thumbPath))
                    console.log('[ƧQᄂYΛЯD] Profile pic set.')
                } catch (_) {}
            }
        }
    })

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return

        const msg    = messages[0]
        if (!msg?.message || msg.key.fromMe) return

        const from   = msg.key.remoteJid
        const sender = msg.key.participant || from
        const isGroup = from.endsWith('@g.us')

        const body =
            msg.message?.conversation ||
            msg.message?.extendedTextMessage?.text ||
            msg.message?.imageMessage?.caption ||
            msg.message?.videoMessage?.caption || ''

        const ownerClean = config.ownerNumber.replace(/:.*@/, '@')
        const isOwner    = (sender || '').replace(/:.*@/, '@') === ownerClean

        await handleAntiSpam(sock, msg, from, sender, isGroup)

        if (body.startsWith(config.prefix)) {
            await handleCommand(sock, msg, from, sender, body, isGroup, isOwner)
        }
    })
}

startBot().catch(console.error)
