<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Resolver solicitud de organizador (aprobar/rechazar)
//  POST { telefono, accion: "aprobar"|"rechazar", solicitud_id }
//
//  OJO: este endpoint NO lo llama el navegador — lo llama el bot
//  de WhatsApp (WhatsApp/main.js) cuando un admin responde
//  "/aprobar N" o "/rechazar N" en el chat. Se autentica con el
//  mismo WA_SECRET que ya comparten ambos lados (ver Auth::requireWaSecret
//  y WhatsAppClient, que hacen exactamente el mismo chequeo al revés).
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/../../config.php';

use Trinity\Core\Auth;
use Trinity\Core\Controller;
use Trinity\Core\Request;
use Trinity\Services\OrganizerService;

Controller::handle(function () {
    Request::requireMethod('POST');
    Auth::requireWaSecret();

    $body = Request::body();

    $mensaje = (new OrganizerService())->resolveByPhone(
        trim((string) ($body['phone'] ?? '')),
        trim((string) ($body['action'] ?? '')),
        (int) ($body['id_Application'] ?? 0)
    );

    return ['mensaje' => $mensaje];
});
