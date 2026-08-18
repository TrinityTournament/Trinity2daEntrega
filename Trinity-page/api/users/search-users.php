<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Buscar usuarios
//  GET ?q=texto → hasta 8 usuarios que coincidan con nombre o usuario
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\SocialService;

header('Cache-Control: no-store');

Controller::handle(function () {
    Request::requireMethod('GET');
    return (new SocialService())->searchUsers(trim((string) Request::query('q', '')));
});
