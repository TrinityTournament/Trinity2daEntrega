<?php
// TRINITY — Minecraft: obtener cuenta vinculada
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\MinecraftService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('GET');
    $user = Auth::requireLogin();
    return (new MinecraftService())->getAccount((int) $user['id']);
});
