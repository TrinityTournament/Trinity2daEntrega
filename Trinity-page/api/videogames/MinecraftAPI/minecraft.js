/**
 * BASE:         https://api.mojang.com/
 * OBTENER SKIN: https://mc-heads.net/player/
 *
 * ✔ Nombre  ✔ UUID  ✔ Skins
 *
 * GET users/profiles/minecraft/${nametag}
 * { 
 *   "id": "cc8049c26c314f18b2eb9c79171b1130",
 *    "name": "MoonRealm_"
 * }
 */

import axios from 'axios';

async function getMCSkin(type, uuid) {
    // type: "avatar" | "head" | "body" | "player"
    const skin = await axios.get(`https://mc-heads.net/${type}/${uuid}`, {
        responseType: 'arraybuffer' // devuelve imagen en binario
    });
    return skin;
}

async function minecraftProfile() {
    try {
        const nametag = "moonrealm_";

        // 1. Obtener UUID y nombre
        const { data } = await axios.get(
            `https://api.mojang.com/users/profiles/minecraft/${nametag}`
        );

        // 2. Obtener skin (opcional — la URL directa ya es usable sin descargarla)
        const skin = await getMCSkin("player", data.id);

        const user =
            `Datos de perfil de Minecraft Java\n` +
            `Nametag : ${data.name}\n` +
            `UUID    : ${data.id}\n` +
            `Avatar  : https://mc-heads.net/avatar/${data.id}\n` +
            `Head    : https://mc-heads.net/head/${data.id}\n` +
            `Body    : https://mc-heads.net/body/${data.id}\n` +
            `Skin    : https://mc-heads.net/player/${data.id}\n`;

        console.log(user);

    } catch (err) {
        console.error("Status :", err.response?.status);
        console.error("Error  :", err.response?.data);
    }
}

minecraftProfile();