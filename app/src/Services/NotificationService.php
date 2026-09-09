<?php

namespace Trinity\Services;

use Trinity\Core\ApiException;
use Trinity\Core\Env;
use Trinity\Core\Mailer;
use Trinity\Core\WhatsAppClient;
use Trinity\Models\NotificationModel;
use Trinity\Models\UserModel;

class NotificationService
{
    private NotificationModel $notifications;
    private UserModel $users;

    public function __construct()
    {
        $this->notifications = new NotificationModel();
        $this->users         = new UserModel();
    }

    /**
     * Crea una notificación in-app y, además, la reenvía por email
     * (si el usuario tiene email y Brevo está configurado) y por
     * WhatsApp (solo con opt-in + teléfono registrado).
     *
     * La usan SocialService (follow), TournamentService (invitaciones)
     * y AdminService. Réplica fiel de la antigua crear_notificacion().
     */
    public function create(int $userId, string $tipo, string $titulo, string $mensaje, ?string $link = null): void
    {
        try {
            $this->notifications->create($userId, $tipo, $titulo, $mensaje, $link);

            $usuario = $this->users->findById($userId);
            if (!$usuario) {
                return;
            }

            if (!empty($usuario['email'])) {
                $linkHtml = $link
                    ? "<p style='margin-top:16px;'><a href='" . Env::get('APP_URL', '') . $link . "' style='color:#c0000a;font-weight:bold;'>Ver en Trinity →</a></p>"
                    : '';
                $html = "
                    <div style='font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0f0000;color:#f5f0f0;border-radius:10px;overflow:hidden;'>
                        <div style='background:#c0000a;padding:16px 24px;'>
                            <h1 style='margin:0;font-size:20px;letter-spacing:3px;'>TRINITY</h1>
                        </div>
                        <div style='padding:24px;'>
                            <h2 style='margin:0 0 8px;font-size:17px;'>{$titulo}</h2>
                            <p style='margin:0;color:#c0a0a0;font-size:14px;'>{$mensaje}</p>
                            {$linkHtml}
                        </div>
                        <div style='padding:12px 24px;border-top:1px solid rgba(180,0,0,0.2);font-size:11px;color:#8a6a6a;'>
                            Recibiste esta notificación de Trinity. Para administrar tus preferencias, ingresá a Configuración.
                        </div>
                    </div>
                ";
                Mailer::send($usuario['email'], $titulo, $html);
            }

            if (!empty($usuario['notif_whatsapp']) && !empty($usuario['telefono'])) {
                $waMensaje = "*TRINITY* — {$titulo}\n\n{$mensaje}";
                if ($link) {
                    $waMensaje .= "\n\n" . Env::get('APP_URL', '') . $link;
                }
                WhatsAppClient::send($usuario['telefono'], $waMensaje);
            }
        } catch (\Throwable $e) {
            error_log('[NotificationService::create] Error: ' . $e->getMessage());
        }
    }

    /**
     * @return array<string,mixed>
     */
    public function list(int $userId, int $page, int $limit): array
    {
        $page  = max(1, $page);
        $limit = min(50, max(1, $limit));

        return [
            'notificaciones' => $this->notifications->paginatedForUser($userId, $page, $limit),
            'no_leidas'      => $this->notifications->countUnread($userId),
            'page'           => $page,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function markRead(int $userId, ?int $id, bool $all): array
    {
        if ($all) {
            $this->notifications->markAllRead($userId);
        } elseif ($id) {
            $this->notifications->markOneRead($id, $userId);
        } else {
            throw new ApiException('Se requiere "id" o "all".', 400);
        }

        return [];
    }
}
