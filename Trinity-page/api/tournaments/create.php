<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Crear torneo
//  Body: { titulo, deporte, descripcion, formato, max_participantes,
//          fecha_inicio, visibilidad, banner_url, publicar }
//
//  Requiere sesión con rol organizador o admin. Si "publicar" es true
//  y la visibilidad es pública, dispara aviso por email/WhatsApp a los
//  usuarios interesados en ese deporte (ver TournamentService::create).
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Core\SessionManager;
use Trinity\Services\TournamentService;

SessionManager::start();

Controller::handle(function () {
    Request::requireMethod('POST');
    $user = Auth::requireRole('organizador', 'admin');
    Auth::validateCsrf();

    $body = Request::body();

    return (new TournamentService())->create(
        $user,
        (string) ($body['titulo']            ?? ''),
        (string) ($body['deporte']           ?? ''),
        (string) ($body['descripcion']       ?? ''),
        (string) ($body['formato']           ?? ''),
        (int)    ($body['max_participantes'] ?? 0),
        (string) ($body['fecha_inicio']      ?? ''),
        (string) ($body['visibilidad']       ?? 'Público'),
        !empty($body['banner_url']) ? (string) $body['banner_url'] : null,
        (bool)   ($body['publicar']          ?? false)
    );
});
