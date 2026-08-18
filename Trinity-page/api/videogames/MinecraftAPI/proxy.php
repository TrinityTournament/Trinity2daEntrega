<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Proxy CORS para la API de Mojang
//  El browser no puede llamar a Mojang directo (CORS). Esta ruta
//  corre en el servidor, reutiliza MinecraftService (misma lógica
//  que save-account.php / get-stats.php) y devuelve el perfil.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../../config.php';

use Trinity\Core\ApiException;
use Trinity\Core\Response;
use Trinity\Services\GameAccounts\MinecraftService;

header('Access-Control-Allow-Origin: *');

$nick = trim($_GET['nick'] ?? '');

if (!$nick) {
    Response::json(['error' => 'Nick requerido'], 400);
}
if (!preg_match('/^[a-zA-Z0-9_]{1,16}$/', $nick)) {
    Response::json(['error' => 'Nick inválido'], 400);
}

try {
    $resultado = (new MinecraftService())->stats(null, $nick);
    Response::json($resultado['perfil']);
} catch (ApiException $e) {
    Response::json(['error' => 'Jugador no encontrado'], 404);
}
