<?php

namespace Trinity\Models;

use PDO;
use Trinity\Core\Database;

class PasswordResetModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    public function invalidateAllForUser(int $userId): void
    {
        $stmt = $this->pdo->prepare('UPDATE password_resets SET usado = 1 WHERE usuario_id = :uid');
        $stmt->execute([':uid' => $userId]);
    }

    public function create(int $userId, string $token, string $expiraEn): void
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO password_resets (usuario_id, token, expira_en) VALUES (:uid, :token, :expira)'
        );
        $stmt->execute([':uid' => $userId, ':token' => $token, ':expira' => $expiraEn]);
    }

    /**
     * Token válido = no usado y no expirado.
     */
    public function findValid(string $token): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, usuario_id
             FROM   password_resets
             WHERE  token = :token AND usado = 0 AND expira_en > NOW()
             LIMIT  1'
        );
        $stmt->execute([':token' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function markUsed(int $id): void
    {
        $stmt = $this->pdo->prepare('UPDATE password_resets SET usado = 1 WHERE id = :id');
        $stmt->execute([':id' => $id]);
    }
}
