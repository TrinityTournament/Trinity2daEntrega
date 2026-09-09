<?php

namespace Trinity\Services;

use Trinity\Core\ApiException;
use Trinity\Core\Env;
use Trinity\Core\Mailer;
use Trinity\Core\WhatsAppClient;
use Trinity\Models\TournamentModel;
use Trinity\Models\UserModel;

class TournamentService
{
    private const ESTADOS_VALIDOS = ['en_creacion', 'abierto', 'en_curso', 'finalizado', 'cancelado'];

    private const ESTADO_LABELS = [
        'en_creacion' => 'En creación',
        'abierto'     => 'Abierto',
        'en_curso'    => 'En curso',
        'finalizado'  => 'Finalizado',
        'cancelado'   => 'Cancelado',
    ];

    private const FORMATOS_VALIDOS = ['liga', 'eliminacion', 'suizo'];

    // El form de crear.html manda las etiquetas visibles (radios/<select>
    // sin `value`), no los códigos internos — se traducen acá.
    private const FORMATO_LABELS = [
        'liga'                  => 'liga',
        'eliminación directa'   => 'eliminacion',
        'eliminacion directa'   => 'eliminacion',
        'sistema suizo'         => 'suizo',
    ];

    private const VISIBILIDAD_LABELS = [
        'público'                          => 'publico',
        'publico'                          => 'publico',
        'privado (solo con invitación)'    => 'privado',
        'privado (solo con invitacion)'    => 'privado',
        'privado'                          => 'privado',
    ];

    private TournamentModel $tournaments;
    private UserModel $users;
    private NotificationService $notifications;

    public function __construct()
    {
        $this->tournaments   = new TournamentModel();
        $this->users         = new UserModel();
        $this->notifications = new NotificationService();
    }

    /**
     * Crea un torneo. $publicar=true → queda 'abierto' y (si es público)
     * dispara el aviso por email/WhatsApp a los usuarios interesados en
     * ese deporte. $publicar=false → 'en_creacion' (borrador, el
     * organizador puede invitar gente antes de abrirlo).
     *
     * @return array<string,mixed>
     */
    public function create(array $organizador, string $titulo, string $deporte, string $descripcion, string $formatoInput, int $cupo, string $fecha, string $visibilidadInput, ?string $bannerUrl, bool $publicar): array
    {
        $titulo = trim($titulo);
        if (mb_strlen($titulo) < 3) {
            throw new ApiException('El nombre del torneo tiene que tener al menos 3 caracteres.', 400);
        }
        if (mb_strlen($titulo) > 120) {
            throw new ApiException('El nombre del torneo es demasiado largo (máximo 120 caracteres).', 400);
        }

        $deporte = trim($deporte);
        if (!$deporte) {
            throw new ApiException('Elegí una disciplina.', 400);
        }

        if ($cupo < 2) {
            throw new ApiException('El cupo mínimo es de 2 participantes.', 400);
        }
        if ($cupo > 1000) {
            throw new ApiException('El cupo máximo es de 1000 participantes.', 400);
        }

        $fechaObj = \DateTime::createFromFormat('Y-m-d', $fecha);
        if (!$fechaObj || $fechaObj->format('Y-m-d') !== $fecha) {
            throw new ApiException('La fecha de inicio no es válida.', 400);
        }
        if ($fechaObj < new \DateTime('today')) {
            throw new ApiException('La fecha de inicio no puede ser en el pasado.', 400);
        }

        $formato = self::FORMATO_LABELS[mb_strtolower(trim($formatoInput))] ?? null;
        if (!$formato || !in_array($formato, self::FORMATOS_VALIDOS, true)) {
            throw new ApiException('El formato de competencia no es válido.', 400);
        }

        $visibilidad = self::VISIBILIDAD_LABELS[mb_strtolower(trim($visibilidadInput))] ?? 'publico';

        $descripcion = trim($descripcion);
        if (mb_strlen($descripcion) > 1000) {
            throw new ApiException('La descripción es demasiado larga (máximo 1000 caracteres).', 400);
        }

        $estado = $publicar ? 'abierto' : 'en_creacion';

        $torneoId = $this->tournaments->create([
            'organizador_id'    => $organizador['id'],
            'titulo'            => $titulo,
            'deporte'           => $deporte,
            'descripcion'       => $descripcion ?: null,
            'formato'           => $formato,
            'max_participantes' => $cupo,
            'fecha_inicio'      => $fecha,
            'visibilidad'       => $visibilidad,
            'banner_url'        => $bannerUrl ?: null,
            'estado'            => $estado,
        ]);

        $resultado = [
            'id'      => $torneoId,
            'estado'  => $estado,
            'mensaje' => $publicar ? 'Torneo creado y publicado.' : 'Torneo guardado como borrador.',
        ];

        // Solo se avisa por email/WhatsApp si quedó público y abierto —
        // un torneo privado se maneja por invitación (ver invite()).
        if ($publicar && $visibilidad === 'publico') {
            try {
                $resultado['notificaciones'] = $this->notify(
                    $titulo,
                    $descripcion ?: "Nuevo torneo de {$deporte}.",
                    $fecha,
                    $deporte,
                    'deporte',
                    ''
                );
            } catch (\Throwable $e) {
                // Un fallo al notificar no debe tirar abajo la creación ya confirmada.
                error_log('[TournamentService::create] Error notificando: ' . $e->getMessage());
                $resultado['notificaciones'] = ['ok' => false, 'mensaje' => 'El torneo se creó pero no se pudo avisar a los usuarios.'];
            }
        }

        return $resultado;
    }

    /**
     * @return array<string,mixed>
     */
    public function myTournaments(int $userId, ?string $estado): array
    {
        $estadoFiltro = ($estado && in_array($estado, self::ESTADOS_VALIDOS, true)) ? $estado : null;
        $torneos      = $this->tournaments->forOrganizer($userId, $estadoFiltro);

        foreach ($torneos as &$t) {
            $t['estado_label'] = self::ESTADO_LABELS[$t['estado']] ?? ucfirst($t['estado']);
        }
        unset($t);

        return ['torneos' => $torneos];
    }

    /**
     * @return array<string,mixed>
     */
    public function allForAdmin(): array
    {
        $torneos = $this->tournaments->allWithOrganizer();

        foreach ($torneos as &$t) {
            $t['id']           = (int) $t['id'];
            $t['estado_label'] = self::ESTADO_LABELS[$t['estado']] ?? ucfirst($t['estado']);
        }
        unset($t);

        return ['torneos' => $torneos];
    }

    /**
     * @return array<string,mixed>
     */
    public function invite(int $organizadorId, string $orgNombre, string $orgUsuario, int $torneoId, int $invitadoId): array
    {
        if (!$torneoId || !$invitadoId) {
            throw new ApiException('Se requieren torneo_id e invitado_id.', 400);
        }
        if ($invitadoId === $organizadorId) {
            throw new ApiException('No podés invitarte a vos mismo.', 400);
        }

        $torneo = $this->tournaments->findOwnedByOrganizer($torneoId, $organizadorId);
        if (!$torneo) {
            throw new ApiException('No encontramos ese torneo entre los que estás organizando.', 404);
        }

        if ($torneo['estado'] !== 'en_creacion') {
            $labels = [
                'abierto'    => 'abierto para inscripciones',
                'en_curso'   => 'en curso',
                'finalizado' => 'finalizado',
                'cancelado'  => 'cancelado',
            ];
            $label = $labels[$torneo['estado']] ?? $torneo['estado'];
            throw new ApiException("Solo podés invitar cuando el torneo está en proceso de creación. Este torneo está {$label}.", 409);
        }

        $invitado = $this->users->findById($invitadoId);
        if (!$invitado) {
            throw new ApiException('El usuario al que querés invitar no existe.', 404);
        }

        if ($this->tournaments->alreadyInvited($torneoId, $invitadoId)) {
            throw new ApiException('Este usuario ya fue invitado a ese torneo.', 409);
        }
        if ($this->tournaments->alreadyParticipant($torneoId, $invitadoId)) {
            throw new ApiException('Este usuario ya está inscripto en ese torneo.', 409);
        }

        $this->tournaments->insertInvitation($torneoId, $organizadorId, $invitadoId);

        $this->notifications->create(
            $invitadoId,
            'torneo_invitacion',
            "Te invitaron al torneo \"{$torneo['titulo']}\"",
            "{$orgNombre} (@{$orgUsuario}) te envió una invitación. ¡Ingresá para aceptarla o rechazarla!"
        );

        return ['mensaje' => "Invitación enviada a {$invitado['nombre']}."];
    }

    /**
     * Anuncio masivo de torneo (no depende de la tabla `torneos`: solo
     * necesita la lista de usuarios objetivo y sus preferencias).
     *
     * @return array<string,mixed>
     */
    public function notify(string $titulo, string $desc, string $fecha, string $deporte, string $target, string $testPhone): array
    {
        if (!$titulo || !$desc) {
            throw new ApiException('Se requieren "titulo" y "descripcion".', 400);
        }

        $emoji = $this->emojiForSport($deporte);

        if ($target === 'test') {
            if (!$testPhone) {
                throw new ApiException('Indicá "test_phone" para el modo test.', 400);
            }

            $waMensaje = $this->buildWhatsAppMessage($emoji, $titulo, $desc, $fecha, $deporte);
            $ok = WhatsAppClient::send($testPhone, $waMensaje);

            return [
                'ok'      => $ok,
                'mensaje' => $ok ? "Mensaje de prueba enviado a {$testPhone}." : 'El bot de WhatsApp no respondió.',
                'mode'    => 'test',
            ];
        }

        $usuarios = $target === 'deporte' && $deporte
            ? $this->users->findTargetedBySport($deporte)
            : $this->users->allForBroadcast();

        if (empty($usuarios)) {
            return ['mensaje' => 'No hay usuarios que cumplan el criterio.', 'enviados' => 0];
        }

        $mensajeBase = $desc;
        if ($fecha) {
            $mensajeBase .= " — Fecha: {$fecha}";
        }
        if ($deporte) {
            $mensajeBase .= " — Disciplina: {$deporte}.";
        }

        $linkHtml  = "<p style='margin-top:16px;'><a href='" . Env::get('APP_URL', '') . "' style='color:#c0000a;font-weight:bold;'>Ver torneos en Trinity →</a></p>";
        $htmlEmail = "
            <div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f0000;color:#f5f0f0;border-radius:10px;overflow:hidden;'>
                <div style='background:#c0000a;padding:16px 24px;'>
                    <h1 style='margin:0;font-size:20px;letter-spacing:3px;'>TRINITY</h1>
                </div>
                <div style='padding:24px;'>
                    <h2 style='margin:0 0 8px;font-size:17px;'>{$emoji} {$titulo}</h2>
                    <p style='margin:0;color:#c0a0a0;font-size:14px;'>{$mensajeBase}</p>
                    {$linkHtml}
                </div>
                <div style='padding:12px 24px;border-top:1px solid rgba(180,0,0,0.2);font-size:11px;color:#8a6a6a;'>
                    Recibiste esta notificación de Trinity. Para administrar tus preferencias, ingresá a Configuración.
                </div>
            </div>
        ";

        $waMensaje = $this->buildWhatsAppMessage($emoji, $titulo, $desc, $fecha, $deporte);

        $phonesWa = [];
        $ok       = 0;

        foreach ($usuarios as $u) {
            try {
                $this->notifications->create((int) $u['id'], 'torneo_anuncio', $titulo, $mensajeBase);
                $ok++;

                if (!empty($u['email'])) {
                    Mailer::send($u['email'], "{$emoji} {$titulo}", $htmlEmail);
                }

                if (!empty($u['notif_whatsapp']) && !empty($u['telefono'])) {
                    $phoneClean = preg_replace('/[^0-9]/', '', $u['telefono']);
                    if (strlen($phoneClean) >= 7) {
                        $phonesWa[] = $phoneClean;
                    }
                }
            } catch (\Throwable $e) {
                error_log('[TournamentService::notify] Error usuario ' . $u['id'] . ': ' . $e->getMessage());
            }
        }

        $waSent = !empty($phonesWa) && WhatsAppClient::broadcast($phonesWa, $waMensaje);

        return [
            'enviados'   => $ok,
            'wa_enviado' => $waSent,
            'wa_count'   => count($phonesWa),
            'mensaje'    => "Notificación enviada a {$ok} usuario(s). WhatsApp: " . count($phonesWa) . ' opt-in(s).',
        ];
    }

    private function emojiForSport(string $deporte): string
    {
        return match (strtolower($deporte)) {
            'fútbol', 'futbol'     => '⚽',
            'basketball'           => '🏀',
            'volleyball'           => '🏐',
            'tenis'                => '🎾',
            'natación', 'natacion' => '🏊',
            'atletismo'            => '🏃',
            'valorant'             => '🎯',
            'lol'                  => '🧙',
            'fortnite'             => '🔫',
            default                => '🏆',
        };
    }

    private function buildWhatsAppMessage(string $emoji, string $titulo, string $desc, string $fecha, string $deporte): string
    {
        $msg = "{$emoji} *TRINITY* — Nuevo torneo\n\n*{$titulo}*\n{$desc}";
        if ($fecha) {
            $msg .= "\n📅 Fecha: {$fecha}";
        }
        if ($deporte) {
            $msg .= "\n🎮 Disciplina: {$deporte}";
        }
        $msg .= "\n\n¡Inscribite ahora en " . Env::get('APP_URL', '') . '!';
        return $msg;
    }
}
