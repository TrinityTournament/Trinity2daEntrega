<?php

namespace Trinity\Services\GameAccounts;

use Trinity\Core\ApiException;

class MinecraftService extends AbstractGameAccountService
{
    private const API_BASE = 'https://api.mojang.com/users/profiles/minecraft/';

    protected function gameKey(): string
    {
        return 'minecraft';
    }

    public function getAccount(int $userId): array
    {
        return ['username' => $this->getLinkedIdentifier($userId)];
    }

    /**
     * @return array<string,mixed>
     */
    public function save(int $userId, string $username): array
    {
        $username = trim($username);
        if ($username === '') {
            throw new ApiException('Ingresá tu nametag de Minecraft.', 400);
        }

        $data = $this->fetchProfile($username);
        $confirmedName = $data['name'];

        $this->link($userId, $confirmedName);

        return ['username' => $confirmedName];
    }

    /**
     * @return array<string,mixed>
     */
    public function stats(?int $userId, string $usernameQuery): array
    {
        if ($usernameQuery !== '') {
            $username = $usernameQuery;
        } else {
            if (!$userId) {
                throw new ApiException('No autenticado.', 401);
            }
            $username = $this->getLinkedIdentifier($userId);
            if (!$username) {
                throw new ApiException('Todavía no vinculaste tu cuenta de Minecraft.', 404);
            }
        }

        $data = $this->fetchProfile($username);

        $uuid = preg_replace(
            '/^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/',
            '$1-$2-$3-$4-$5',
            $data['id']
        );

        return ['perfil' => ['nombre' => $data['name'], 'uuid' => $uuid]];
    }

    /**
     * @return array{id:string,name:string}
     */
    private function fetchProfile(string $username): array
    {
        $raw = @file_get_contents(self::API_BASE . urlencode($username));
        if ($raw === false || $raw === '') {
            throw new ApiException('No se encontró ese nametag de Minecraft Java.', 404);
        }

        $data = json_decode($raw, true);
        if (!isset($data['id'])) {
            throw new ApiException('No se encontró ese nametag de Minecraft Java.', 404);
        }

        return $data;
    }
}
