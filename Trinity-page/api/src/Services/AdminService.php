<?php

namespace Trinity\Services;

use Trinity\Core\ApiException;
use Trinity\Models\UserModel;

class AdminService
{
    private const ROLES_VALIDOS = ['admin', 'organizador', 'participante'];

    private UserModel $users;

    public function __construct()
    {
        $this->users = new UserModel();
    }

    /**
     * @return array<string,mixed>
     */
    public function listUsers(): array
    {
        return ['usuarios' => $this->users->allForAdmin()];
    }

    /**
     * @return array<string,mixed>
     */
    public function changeRole(int $actingUserId, int $targetId, string $rol): array
    {
        if (!$targetId || !$rol) {
            throw new ApiException('Se requieren "id" y "rol".', 400);
        }
        if (!in_array($rol, self::ROLES_VALIDOS, true)) {
            throw new ApiException('Rol inválido. Válidos: ' . implode(', ', self::ROLES_VALIDOS), 400);
        }
        if ($targetId === $actingUserId && $rol !== 'admin') {
            throw new ApiException('No podés cambiar tu propio rol.', 403);
        }

        if (!$this->users->setRole($targetId, $rol)) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        return [];
    }

    /**
     * Promueve a admin buscando por id, usuario o email. Pensado para
     * el primer despliegue, protegido por ADMIN_KEY (ver Auth::requireAdminKey).
     *
     * @return array<string,mixed>
     */
    public function promoteFirstAdmin(?int $id, ?string $usuario, ?string $email): array
    {
        if ($id) {
            $user = $this->users->findById($id);
        } elseif ($usuario) {
            $user = $this->users->findByUsuario(trim($usuario));
        } elseif ($email) {
            $user = $this->users->findByEmail(trim($email));
        } else {
            throw new ApiException('Indicá "id", "usuario" o "email" del usuario a promover.', 400);
        }

        if (!$user) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        $this->users->setRole((int) $user['id'], 'admin');

        return ['mensaje' => "@{$user['usuario']} ahora es administrador."];
    }
}
