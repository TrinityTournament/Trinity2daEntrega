<?php

namespace Trinity\Core;

/**
 * Reemplaza a middleware.php. Se apoya en SessionManager para leer
 * el usuario autenticado y lanza ApiException (401/403) cuando
 * corresponde, que Controller::handle() traduce a JSON.
 */
final class Auth
{
    private function __construct()
    {
    }

    /**
     * @return array<string,mixed> el usuario en sesión
     */
    public static function requireLogin(): array
    {
        if (!SessionManager::isAuthenticated()) {
            throw new ApiException('No autenticado.', 401);
        }

        return SessionManager::user();
    }

    /**
     * @return array<string,mixed> el usuario en sesión
     */
    public static function requireRole(string ...$roles): array
    {
        $user     = self::requireLogin();
        $rolActual = $user['rol'] ?? 'participante';

        if (!in_array($rolActual, $roles, true)) {
            throw new ApiException('Sin permisos suficientes.', 403);
        }

        return $user;
    }

    /**
     * Verifica el header X-CSRF-Token contra el guardado en sesión.
     * Solo aplica a métodos que modifican estado.
     */
    public static function validateCsrf(): void
    {
        if (in_array(Request::method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }

        $tokenSesion = $_SESSION['csrf_token'] ?? '';
        $tokenHeader = Request::header('X-CSRF-Token') ?? '';

        if (!$tokenSesion || !hash_equals($tokenSesion, $tokenHeader)) {
            throw new ApiException('Token CSRF inválido o ausente.', 403);
        }
    }

    /**
     * Valida la clave maestra de administrador (header X-Admin-Key)
     * contra ADMIN_KEY del .env. Usado por endpoints de bootstrap
     * (crear-admin.php) que no requieren sesión.
     */
    public static function requireAdminKey(): void
    {
        $adminKey = Env::get('ADMIN_KEY', '');

        if (!$adminKey) {
            throw new ApiException('ADMIN_KEY no configurada en el servidor.', 500);
        }

        $recibida = Request::header('X-Admin-Key') ?? '';

        if (!hash_equals($adminKey, $recibida)) {
            throw new ApiException('Clave de administrador incorrecta.', 401);
        }
    }
}
