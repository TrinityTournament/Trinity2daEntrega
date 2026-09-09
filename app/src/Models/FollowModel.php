<?php

namespace Trinity\Models;

use PDO;
use Trinity\Core\Database;

class FollowModel
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::pdo();
    }

    /**
     * Inserta el follow si no existía. Devuelve true si fue un follow
     * nuevo (útil para no notificar duplicados).
     */
    public function follow(int $followerId, int $targetId): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT IGNORE INTO seguidores (seguidor_id, seguido_id) VALUES (:follower, :target)'
        );
        $stmt->execute([':follower' => $followerId, ':target' => $targetId]);
        return $stmt->rowCount() > 0;
    }

    public function unfollow(int $followerId, int $targetId): void
    {
        $stmt = $this->pdo->prepare(
            'DELETE FROM seguidores WHERE seguidor_id = :follower AND seguido_id = :target'
        );
        $stmt->execute([':follower' => $followerId, ':target' => $targetId]);
    }

    public function isFollowing(int $viewerId, int $targetId): bool
    {
        $stmt = $this->pdo->prepare(
            'SELECT id FROM seguidores WHERE seguidor_id = :viewer AND seguido_id = :target LIMIT 1'
        );
        $stmt->execute([':viewer' => $viewerId, ':target' => $targetId]);
        return (bool) $stmt->fetch();
    }

    /**
     * @return array{users: array<int,array<string,mixed>>, total: int}
     */
    public function paginated(int $userId, string $tipo, int $page, int $limit = 30): array
    {
        $offset = ($page - 1) * $limit;

        if ($tipo === 'seguidores') {
            $sql = 'SELECT u.id, u.nombre, u.usuario, u.foto_url
                    FROM seguidores s
                    JOIN usuarios u ON u.id = s.seguidor_id
                    WHERE s.seguido_id = :uid
                    ORDER BY s.creado_en DESC
                    LIMIT :lim OFFSET :off';
            $cntSql = 'SELECT COUNT(*) FROM seguidores WHERE seguido_id = :uid';
        } else {
            $sql = 'SELECT u.id, u.nombre, u.usuario, u.foto_url
                    FROM seguidores s
                    JOIN usuarios u ON u.id = s.seguido_id
                    WHERE s.seguidor_id = :uid
                    ORDER BY s.creado_en DESC
                    LIMIT :lim OFFSET :off';
            $cntSql = 'SELECT COUNT(*) FROM seguidores WHERE seguidor_id = :uid';
        }

        $cntStmt = $this->pdo->prepare($cntSql);
        $cntStmt->execute([':uid' => $userId]);
        $total = (int) $cntStmt->fetchColumn();

        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':off', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return ['users' => $stmt->fetchAll(), 'total' => $total];
    }
}
