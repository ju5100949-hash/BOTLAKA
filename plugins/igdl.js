const axios = require('axios')

function extractShortcode(url) {
    const m = url.match(/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/)
    return m ? m[1] : null
}

async function resolveMedia(url) {
    const code = extractShortcode(url)
    if (!code) throw new Error('Shortcode tidak ditemukan dari URL.')

    // Ambil dari Instagram embed endpoint (no auth required)
    const embedUrl = `https://www.instagram.com/p/${code}/embed/`
    const { data }  = await axios.get(embedUrl, {
        timeout: 12000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
    })

    // Video
    const videoMatch = data.match(/video_url":"([^"]+)"/)
    if (videoMatch) {
        return { type: 'video', url: videoMatch[1].replace(/\\u0026/g, '&') }
    }

    // Image
    const imgMatch = data.match(/display_url":"([^"]+)"/)
    if (imgMatch) {
        return { type: 'image', url: imgMatch[1].replace(/\\u0026/g, '&') }
    }

    throw new Error('Media tidak ditemukan. Mungkin akun private.')
}

module.exports = async function igdl(sock, msg, from, sender, args) {
    const url = args[0]

    if (!url || !url.includes('instagram.com')) {
        return sock.sendMessage(from, {
            text: `*< /igdl >*\n\nUsage: \`/igdl <link_instagram>\`\n_Support: Post, Reels, IGTV_\n\nContoh:\n\`/igdl https://www.instagram.com/reel/xxxxx/\``
        }, { quoted: msg })
    }

    await sock.sendMessage(from, { text: '⏳ *Fetching media...*' }, { quoted: msg })

    try {
        const media = await resolveMedia(url)

        if (media.type === 'video') {
            await sock.sendMessage(from, {
                video:    { url: media.url },
                caption:  `✅ *< /igdl >*\n_ƧQᄂYΛЯD • by ZaaxX_`,
                mimetype: 'video/mp4'
            }, { quoted: msg })
        } else {
            await sock.sendMessage(from, {
                image:   { url: media.url },
                caption: `✅ *< /igdl >*\n_ƧQᄂYΛЯD • by ZaaxX_`
            }, { quoted: msg })
        }
    } catch (e) {
        await sock.sendMessage(from, {
            text: `❌ *Download gagal*\n_${e.message}_`
        }, { quoted: msg })
    }
}
