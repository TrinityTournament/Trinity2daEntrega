import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename); 
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true }); // Quiet hace que no aparezca un aviso en terminal.

async function brawlProfile() {
    try {
        const tag = "VOYUUUO"
        let profile = "";
        const { data } = await axios.get(`https://sprcll.vercel.app/brawl/players/${tag}`)
        const b = data.data

        profile += `Nombre: ${b.name} Nivel: ${b.expLevel}\n`
        profile += `Tag: ${b.tag}\n`
        profile += `Trofeos: ${b.trophies}\n`
        profile += `Record: ${b.highestTrophies}\n`
        profile += `\nVictorias 3v3: ${b["3vs3Victories"]}`
        profile += `\nVictorias en solitario: ${b.soloVictories}`
        profile += `\nVictorias en duo: ${b.duoVictories}\n\n`
        profile += `Competitivo\nRango: ${b.rankedRankName}\n`
        profile += `Elo: ${b.rankedElo}\n`
        profile += `Mayor elo alcanzado: ${b.highestAllTimeRankedElo}\n\n`
        profile += `Club\nNombre: ${b.club.name}\nTag: ${b.club.tag}`

        console.log(profile)
    } catch(err) {
        console.error(err.response)
    }
}
    
brawlProfile();