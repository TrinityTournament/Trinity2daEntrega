/** ID TEST: 219110511 (Donato) 
 *  API BASE: https://siambhau69.eu.cc/freefireinfo/
 *  ENDPOINTS A USAR: "Player Info": "/bhau?uid=219110511&region=BD&key=Free2026",
 *                    "CS Ranked Stats": "/stats?uid=219110511&region=BD&gamemode=cs&matchmode=RANKED&key=Free2026",
 *                    "BR Ranked Stats": "/stats?uid=219110511&region=BD&gamemode=br&matchmode=RANKED&key=Free2026",
*/

import axios from 'axios';
import { ask, close } from '../../../components/ask.js';
import { USyncContactProtocol } from 'baileys';
const BASEURL = "https://siambhau69.eu.cc/freefireinfo";
const cs = "region=BD&gamemode=cs&matchmode=RANKED"; // no quiero hacer el axios tan largo alv 
const br = "region=BD&gamemode=br&matchmode=RANKED"; /* si llegan a leer esto, haganme acuerdo
                                                          de borrarlo DJASKDJAS hay que poner
                                                          la url completa seguramente */

async function FFProfile() {
    try { 
        const id = await ask("Usuario: "); 
        let reg = await ask("¿Region?\n1) Norteamerica\n2) Brasil\n3) Europa\n\n"); close();
        let profile = "";
        switch(reg) {
            case "1": reg = "US"; break;
            case "2": reg = "BR"; break;
            case "3": reg = "EU"; break;
        }

        const { data } = await axios.get(`${BASEURL}/bhau?uid=${id}&region=${reg}&key=Free2026`)
        
        profile += `\n${data.basicInfo.nickname} Nivel: ${data.basicInfo.level}\n`
        profile += `${data.basicInfo.accountId}\n`
        profile += `Region: ${data.basicInfo.region}\n`
        profile += `Rango maximo: ${data.basicInfo.maxRank}\n`
        profile += `Rango maximo; Duelo de escuadras: ${data.basicInfo.csMaxRank}\n\n`
        profile += `Clan:\n`
        profile += `${data.clanBasicInfo.clanName} Nivel del clan: ${data.clanBasicInfo.clanLevel}\n`
        profile += `${data.clanBasicInfo.clanId}\n`
        profile += `Miembros: ${data.clanBasicInfo.memberNum}/${data.clanBasicInfo.capacity}\n`
        
        console.log(profile)
    } catch(err) {
        console.log(err.response);
    }
}

FFProfile()