<?php

namespace Trinity\Services;

use Trinity\Core\ApiException;
use Trinity\Models\FollowModel;
use Trinity\Models\UserModel;

class SocialService
{
    private FollowModel $follows;
    private UserModel $users;
    private NotificationService $notifications;

    public function __construct()
    {
        $this->follows       = new FollowModel();
        $this->users         = new UserModel();
        $this->notifications = new NotificationService();
    }

    /**
     * @return array<string,mixed>
     */
    public function toggleFollow(int $followerId, int $targetId, string $accion): array
    {
        if (!$targetId) {
            throw new ApiException('Se requiere target_id.', 400);
        }
        if (!in_array($accion, ['follow', 'unfollow'], true)) {
            throw new ApiException('Acción inválida. Usá "follow" o "unfollow".', 400);
        }
        if ($followerId === $targetId) {
            throw new ApiException('No podés seguirte a vos mismo.', 400);
        }

        if (!$this->users->findById($targetId)) {
            throw new ApiException('Usuario no encontrado.', 404);
        }

        if ($accion === 'follow') {
            $esNuevo = $this->follows->follow($followerId, $targetId);

            if ($esNuevo) {
                $follower = $this->users->findById($followerId);
                if ($follower) {
                    $this->notifications->create(
                        $targetId,
                        'seguidor',
                        "{$follower['nombre']} empezó a seguirte",
                        "@{$follower['usuario']} se sumó a tus seguidores en Trinity.",
                        '/pages/profile/acc/view.html?u=' . $followerId
                    );
                }
            }
        } else {
            $this->follows->unfollow($followerId, $targetId);
        }

        return [];
    }

    /**
     * @return array<string,mixed>
     */
    public function listFollowers(int $userId, string $tipo, int $page): array
    {
        if (!$userId) {
            throw new ApiException('Se requiere user_id.', 400);
        }
        if (!in_array($tipo, ['seguidos', 'seguidores'], true)) {
            throw new ApiException('tipo debe ser "seguidos" o "seguidores".', 400);
        }

        $result = $this->follows->paginated($userId, $tipo, $page);

        return [
            'users' => $result['users'],
            'total' => $result['total'],
            'page'  => $page,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    public function searchUsers(string $query): array
    {
        if (strlen($query) < 2) {
            return ['users' => []];
        }

        $query = mb_substr($query, 0, 50);
        return ['users' => $this->users->search($query, 8)];
    }
}
