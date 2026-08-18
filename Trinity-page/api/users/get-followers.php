<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Obtener lista de seguidos / seguidores
//  GET ?user_id=int&tipo=seguidos|seguidores&page=int
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\SocialService;

SessionManager::start();
header('Access-Control-Allow-Origin: *');

Controller::handle(function () {
    Request::requireMethod('GET');

    $userId = (int) (Request::query('user_id', '0'));
    $tipo   = trim((string) Request::query('tipo', 'seguidores'));
    $page   = max(1, (int) Request::query('page', '1'));

    return (new SocialService())->listFollowers($userId, $tipo, $page);
});
