<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Obtener perfil público de un usuario
//  GET ?id=123
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\ProfileService;

SessionManager::start();
header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');

    $targetId = (int) Request::query('id', '0');
    $viewer   = SessionManager::user();
    $viewerId = isset($viewer['id']) ? (int) $viewer['id'] : null;

    return (new ProfileService())->getPublicProfile($targetId, $viewerId);
});
