<?php

namespace Trinity\Services;

use PDOException;
use Trinity\Core\ApiException;
use Trinity\Core\Env;
use Trinity\Core\Mailer;
use Trinity\Core\SessionManager;
use Trinity\Core\WhatsAppClient;
use Trinity\Models\PasswordResetModel;
use Trinity\Models\UserModel;

class AuthService
{
    private UserModel $users;
    private PasswordResetModel $resets;

    public function __construct()
    {
        $this->users  = new UserModel();
        $this->resets = new PasswordResetModel();
    }

    /**
     * @return array<string,mixed>
     */
    public function login(string $identifier, string $password): array
    {
        if (!$identifier || !$password) {
            throw new ApiException('Faltan datos de usuario.', 400);
        }

        $user = $this->users->findByIdentifier($identifier);

        if (!$user || !password_verify($password, $user['password'])) {
            throw new ApiException('Credenciales incorrectas.', 401);
        }

        unset($user['password']);
        SessionManager::setUser($user);
        $csrf = SessionManager::rotateCsrfToken();

        return [
            'usuario'    => $this->publicSessionUser($user),
            'csrf_token' => $csrf,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function checkSession(): array
    {
        if (!SessionManager::isAuthenticated()) {
            throw new ApiException('No autenticado.', 401);
        }

        $u = SessionManager::user();

        return [
            'usuario' => [
                'id'             => $u['id'],
                'usuario'        => $u['usuario'],
                'nombre'         => $u['nombre'],
                'email'          => $u['email'],
                'foto_url'       => $u['foto_url'] ?? null,
                'rol'            => $u['rol'] ?? 'participante',
                'notif_whatsapp' => (bool) ($u['notif_whatsapp'] ?? false),
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function csrfToken(): array
    {
        return ['csrf_token' => SessionManager::csrfToken()];
    }

    /**
     * Siempre responde ok:true exista o no el email, para no permitir
     * enumerar cuentas registradas.
     *
     * @return array<string,mixed>
     */
    public function requestPasswordReset(string $email): array
    {
        if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('Email inválido.', 400);
        }

        $user = $this->users->findByEmail($email);
        if (!$user) {
            return [];
        }

        $userId = (int) $user['id'];
        $this->resets->invalidateAllForUser($userId);

        $token  = bin2hex(random_bytes(32));
        $expira = date('Y-m-d H:i:s', time() + 900); // 15 minutos
        $this->resets->create($userId, $token, $expira);

        $baseUrl  = rtrim(Env::get('APP_URL', 'http://localhost'), '/');
        $resetUrl = $baseUrl . '/pages/reset-password/index.html?token=' . $token;

        $html = "
            <div style='font-family:sans-serif;max-width:520px;margin:auto;padding:40px;background:#0c1120;border-radius:14px;color:#f0f4ff;'>
                <h1 style='font-size:26px;letter-spacing:6px;margin-bottom:4px;'>TRINITY</h1>
                <p style='color:#6b7a9f;margin-bottom:28px;font-size:13px;'>Plataforma de competencia</p>
                <h2 style='font-size:18px;font-weight:700;margin-bottom:12px;'>Restablecer contraseña</h2>
                <p style='color:#a0aec0;font-size:14px;line-height:1.7;margin-bottom:24px;'>
                    Recibimos una solicitud para restablecer la contraseña de tu cuenta.<br>
                    Hacé click en el botón para continuar. El link expira en <strong>15 minutos</strong>.
                </p>
                <a href='{$resetUrl}' style='display:inline-block;background:#1a6fff;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:1px;'>
                    Restablecer contraseña →
                </a>
                <p style='color:#6b7a9f;font-size:12px;margin-top:24px;line-height:1.6;'>
                    Si no solicitaste este cambio, ignorá este mensaje. Tu contraseña no será modificada.<br>
                    Por seguridad, este link solo puede usarse una vez.
                </p>
            </div>
        ";

        $ok = Mailer::send($email, 'Restablecer contraseña — Trinity', $html);
        if (!$ok) {
            throw new ApiException('No se pudo enviar el correo.', 500);
        }

        if (!empty($user['telefono'])) {
            $waMsg = "*TRINITY*\n\n"
                   . "Recibimos una solicitud para cambiar la contraseña de tu cuenta.\n\n"
                   . "🔗 {$resetUrl}\n\n"
                   . "⏱ Este link expira en 15 minutos y es de uso unico.\n"
                   . "Si no fuiste vos, ignorá este mensaje.";
            WhatsAppClient::send($user['telefono'], $waMsg);
        }

        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function verifyResetToken(string $token): array
    {
        if (!$token) {
            return ['valido' => false];
        }

        return ['valido' => (bool) $this->resets->findValid($token)];
    }

    /**
     * @return array<string,mixed>
     */
    public function resetPassword(string $token, string $newPassword): array
    {
        if (!$token || !$newPassword) {
            throw new ApiException('Faltan datos.', 400);
        }
        if (strlen($newPassword) < 6) {
            throw new ApiException('La contraseña debe tener al menos 6 caracteres.', 400);
        }

        $reset = $this->resets->findValid($token);
        if (!$reset) {
            throw new ApiException('El link es inválido o ya expiró. Solicitá uno nuevo.', 400);
        }

        $hash = password_hash($newPassword, PASSWORD_BCRYPT);
        $this->users->updatePassword((int) $reset['usuario_id'], $hash);
        $this->resets->markUsed((int) $reset['id']);

        return [];
    }

    /**
     * Forma pública del usuario que se envía al front tras el login
     * (nunca incluye el hash de la contraseña).
     *
     * @param array<string,mixed> $user
     * @return array<string,mixed>
     */
    private function publicSessionUser(array $user): array
    {
        return [
            'id'               => $user['id'],
            'usuario'          => $user['usuario'],
            'nombre'           => $user['nombre'],
            'email'            => $user['email'],
            'telefono'         => $user['telefono'],
            'tipo'             => $user['tipo'],
            'deportes'         => $user['deportes_seleccionados']
                                    ? json_decode($user['deportes_seleccionados'], true)
                                    : null,
            'fecha_nacimiento' => $user['fecha_nacimiento'],
            'perfil_completo'  => !empty($user['tipo']) && !empty($user['deportes_seleccionados']),
            'pronouns'         => $user['pronouns']    ?? null,
            'descripcion'      => $user['descripcion'] ?? null,
            'foto_url'         => $user['foto_url']    ?? null,
            'notif_whatsapp'   => (bool) ($user['notif_whatsapp'] ?? false),
            'rol'              => $user['rol'] ?? 'participante',
        ];
    }
}
