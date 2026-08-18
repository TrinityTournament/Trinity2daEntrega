<?php
// TRINITY — Clash Royale: estadísticas del jugador
// GET (sin params) → cuenta vinculada del usuario en sesión
// GET ?tag=#ABC123 → consulta puntual, no requiere sesión
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\ClashRoyaleService;

SessionManager::start();
header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');

    $tagQuery = trim((string) Request::query('tag', ''));
    $user     = SessionManager::user();
    $userId   = isset($user['id']) ? (int) $user['id'] : null;

    return (new ClashRoyaleService())->stats($userId, $tagQuery);
});
