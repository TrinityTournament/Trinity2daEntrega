<?php
// TRINITY — Clash Royale: vincular cuenta
// POST { tag: '#ABC123' } → { ok: true, tag, perfil: {...} }
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\GameAccounts\ClashRoyaleService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::validateCsrf();
    $user = Auth::requireLogin();

    $body = Request::body();
    return (new ClashRoyaleService())->save((int) $user['id'], trim((string) ($body['tag'] ?? '')));
});
