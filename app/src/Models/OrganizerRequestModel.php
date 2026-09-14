<?php

namespace Trinity\Models;

use PDO;
use PDOException;
use Trinity\Core\ApiException;
use Trinity\Core\Database;

/** Solicitudes de usuarios para convertirse en 'organizador'.
  * Igual que TournamentModel, envuelve en guarded() por si la
  * migración todavía no corrió en este despliegue. */
class OrganizerRequestModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    public function create(int $usuarioId): int
    {
        return $this->guarded(function () use ($usuarioId) {
            $stmt = $this->pdo->prepare(
                'INSERT INTO solicitudes_organizador (usuario_id, estado) VALUES (:uid, "pendiente")'
            );
            $stmt->execute([':uid' => $usuarioId]);
            return (int) $this->pdo->lastInsertId();
        });
    }

    public function findPendienteDeUsuario(int $usuarioId): ?array
    {
        return $this->guarded(function () use ($usuarioId) {
            $stmt = $this->pdo->prepare(
                "SELECT * FROM solicitudes_organizador WHERE usuario_id = :uid AND estado = 'pendiente' LIMIT 1"
            );
            $stmt->execute([':uid' => $usuarioId]);
            $row = $stmt->fetch();
            return $row ?: null;
        });
    }

    public function findUltimaDeUsuario(int $usuarioId): ?array
    {
        return $this->guarded(function () use ($usuarioId) {
            $stmt = $this->pdo->prepare(
                'SELECT * FROM solicitudes_organizador WHERE usuario_id = :uid ORDER BY creado_en DESC LIMIT 1'
            );
            $stmt->execute([':uid' => $usuarioId]);
            $row = $stmt->fetch();
            return $row ?: null;
        });
    }

    public function find(int $id): ?array
    {
        return $this->guarded(function () use ($id) {
            $stmt = $this->pdo->prepare('SELECT * FROM solicitudes_organizador WHERE id = :id LIMIT 1');
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch();
            return $row ?: null;
        });
    }

    public function resolver(int $id, string $estado, int $adminId): bool
    {
        return $this->guarded(function () use ($id, $estado, $adminId) {
            $stmt = $this->pdo->prepare(
                "UPDATE solicitudes_organizador
                 SET estado = :estado, resuelto_por = :admin, resuelto_en = NOW()
                 WHERE id = :id AND estado = 'pendiente'"
            );
            $stmt->execute([':estado' => $estado, ':admin' => $adminId, ':id' => $id]);
            return $stmt->rowCount() > 0;
        });
    }

    private function guarded(callable $fn): mixed
    {
        try {
            return $fn();
        } catch (PDOException $e) {
            if ($e->getCode() === '42S02') {
                throw new ApiException(
                    'La tabla solicitudes_organizador no existe todavía en esta base de datos. ',
                    501
                );
            }
            throw $e;
        }
    }
}
