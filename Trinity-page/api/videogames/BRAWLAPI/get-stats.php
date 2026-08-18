<?php
// TRINITY — Brawl Stars: estadísticas del jugador
// GET ?tag=#VOYUUUO | GET (sin params) → cuenta vinculada
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\BrawlStarsService;

SessionManager::start();
header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');

    $tagQuery = trim((string) Request::query('tag', ''));
    $user     = SessionManager::user();
    $userId   = isset($user['id']) ? (int) $user['id'] : null;

    return (new BrawlStarsService())->stats($userId, $tagQuery);
});
