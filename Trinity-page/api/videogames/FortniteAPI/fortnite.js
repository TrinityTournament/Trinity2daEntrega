import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs'; 
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true }); // Quiet hace que no aparezca un aviso en terminal.
const apikey = process.env.FNKEY;

// La api devuelve el tiempo jugado en minutos, lo convertimos a horas.
function m2H(minutes) {
    return (minutes / 60).toFixed(1);
}

// Helper para no repetir tanto codigo alv
function modeStats(title, mode) {
    if (!mode) return "";

    return `${title}:\n` +
           `\tPartidas jugadas: ${mode.matches}\n` +
           `\tVictorias: ${mode.wins}\n` +
           `\tTop 3: ${mode.top3 ?? 0}\n` +
           `\tTop 5: ${mode.top5 ?? 0}\n` +
           `\tKills: ${mode.kills}\n` +
           `\tMuertes: ${mode.deaths}\n` +
           `\tWin-rate: ${mode.winRate}\n` +
           `\tHoras jugadas: ${m2H(mode.minutesPlayed)}\n`;
}

async function FortNiteProfile() {
    try {
        let user = ""
        const FUser = "MiraCertera3343"

        const { data } = await axios.get
        (`https://fortnite-api.com/v2/stats/br/v2?name=${encodeURIComponent(FUser)}`,
            { headers: { Authorization: apikey }})

        const profile = data.data
        const statsKM = profile.stats.keyboardMouse
        const statsGP = profile.stats.gamepad

        // Ya expliqué que hace esto brochacho
        fs.writeFileSync(
            'data.json', 
            JSON.stringify(profile, null, 4),
            'utf8'
        ); 

        user += `Perfil de ${FUser}\n` +
                `Horas totales: ${m2H(profile.stats.all.overall.minutesPlayed)}\n` +
                `Pase de batalla:\n   Nivel: ${profile.battlePass.level}\n   Progreso: ${profile.battlePass.progress}\n\n` +
                `Estadisticas ⌨️ 🖱️\n` +
                modeStats("   SOLO", statsKM.solo) +
                modeStats("   DUO", statsKM.duo) +
                modeStats("   ESCUADRA", statsKM.squad) +
                modeStats("   Limited Time Modes", statsKM.ltm) +
                `\nEstadisticas 🎮\n` +
                modeStats("   SOLO", statsGP.solo) +
                modeStats("   DUO", statsGP.duo) +
                modeStats("   ESCUADRA", statsGP.squad) +
                modeStats("   Limited Time Modes", statsGP.ltm);

            console.log(user);
    } catch (err) {
        console.log(err.response);
        console.log(err.response?.profile);
    }
}

FortNiteProfile()