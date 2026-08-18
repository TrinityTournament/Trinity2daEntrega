<?php

namespace Trinity\Services\GameAccounts;

use Trinity\Models\GameAccountModel;

/**
 * Base común a todos los proveedores de videojuego (Clash Royale,
 * Brawl Stars, Fortnite, Minecraft). Cada subclase define su propia
 * clave de juego y la lógica de consulta a la API externa.
 */
abstract class AbstractGameAccountService
{
    protected GameAccountModel $accounts;

    public function __construct()
    {
        $this->accounts = new GameAccountModel();
    }

    /** Clave interna usada en la columna `juego` de cuentas_videojuego. */
    abstract protected function gameKey(): string;

    public function getLinkedIdentifier(int $userId): ?string
    {
        return $this->accounts->getIdentificador($userId, $this->gameKey());
    }

    protected function link(int $userId, string $identificador): void
    {
        $this->accounts->upsert($userId, $this->gameKey(), $identificador);
    }
}
