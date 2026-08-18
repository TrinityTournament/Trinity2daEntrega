<?php

namespace Trinity\Core;

/**
 * Reemplaza a session.php + las partes de sesión de middleware.php.
 * Centraliza toda la configuración y el acceso a $_SESSION.
 */
final class SessionManager
{
    private static bool $started = false;

    private function __construct()
    {
    }

    /**
     * Configura cookies seguras e inicia la sesión PHP.
     * Idempotente: puede llamarse varias veces en el mismo request.
     */
    public static function start(): void
    {
        if (self::$started) {
            return;
        }

        if (session_status() !== PHP_SESSION_ACTIVE) {
            // Cookie accesible desde cualquier path del dominio.
            ini_set('session.cookie_path', '/');
            // Lax: la cookie viaja en navegación normal pero no en cross-site POST.
            ini_set('session.cookie_samesite', 'Lax');
            // Evita que PHP adopte IDs de sesión arbitrarios del cliente.
            ini_set('session.use_strict_mode', '1');
            // Solo HTTP, no accesible desde JS.
            ini_set('session.cookie_httponly', '1');

            session_start();
        }

        self::$started = true;
    }

    public static function isAuthenticated(): bool
    {
        return !empty($_SESSION['trinity_user']);
    }

    /**
     * @return array<string,mixed>
     */
    public static function user(): array
    {
        return $_SESSION['trinity_user'] ?? [];
    }

    /**
     * @param array<string,mixed> $user
     */
    public static function setUser(array $user): void
    {
        $_SESSION['trinity_user'] = $user;
    }

    /**
     * Actualiza un único campo del usuario en sesión (tras editar perfil).
     */
    public static function setUserField(string $key, mixed $value): void
    {
        $_SESSION['trinity_user'][$key] = $value;
    }

    public static function destroy(): void
    {
        $_SESSION = [];
        session_destroy();
    }

    /**
     * Devuelve el token CSRF actual, generándolo si no existe.
     */
    public static function csrfToken(): string
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }

        return $_SESSION['csrf_token'];
    }

    /**
     * Genera un token CSRF nuevo (rotación tras login) y lo devuelve.
     */
    public static function rotateCsrfToken(): string
    {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        return $_SESSION['csrf_token'];
    }

    /**
     * Guarda un código de verificación temporal (OTP) asociado a un
     * destino (email o teléfono). Se mantiene en sesión, igual que en
     * el diseño original, para no requerir infraestructura adicional.
     */
    public static function setVerificationCode(string $destino, string $code, int $ttlSeconds = 600): void
    {
        $_SESSION['verification'][$destino] = [
            'code'      => $code,
            'expiresAt' => time() + $ttlSeconds,
        ];
    }

    /**
     * @return array{code:string,expiresAt:int}|null
     */
    public static function getVerificationCode(string $destino): ?array
    {
        return $_SESSION['verification'][$destino] ?? null;
    }

    public static function clearVerificationCode(string $destino): void
    {
        unset($_SESSION['verification'][$destino]);
    }
}
