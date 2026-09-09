<?php
// TRINITY — Minecraft: perfil del jugador (UUID)
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\MinecraftService;

SessionManager::start();
header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');

    $usernameQuery = trim((string) Request::query('username', ''));
    $user          = SessionManager::user();
    $userId        = isset($user['id']) ? (int) $user['id'] : null;

    return (new MinecraftService())->stats($userId, $usernameQuery);
});
