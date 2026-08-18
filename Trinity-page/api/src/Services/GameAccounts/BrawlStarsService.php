<?php

namespace Trinity\Services\GameAccounts;

use Trinity\Core\ApiException;

class BrawlStarsService extends AbstractGameAccountService
{
    private const API_BASE = 'https://sprcll.vercel.app/brawl/players/';

    protected function gameKey(): string
    {
        return 'brawlstars';
    }

    public function getAccount(int $userId): array
    {
        $tag = $this->getLinkedIdentifier($userId);
        return ['tag' => $tag ? '#' . $tag : null];
    }

    /**
     * @return array<string,mixed>
     */
    public function save(int $userId, string $tagCrudo): array
    {
        $tag = ltrim(strtoupper(trim($tagCrudo)), '#');

        if ($tag === '' || !preg_match('/^[0-9A-Z]{5,12}$/', $tag)) {
            throw new ApiException('El tag no tiene un formato válido. Ejemplo: #VOYUUUO', 400);
        }

        $raw = @file_get_contents(self::API_BASE . $tag);
        if ($raw === false) {
            throw new ApiException('No se pudo verificar el tag. Intentá de nuevo.', 422);
        }

        $data = json_decode($raw, true);
        if (!isset($data['data']['tag'])) {
            throw new ApiException('No se encontró ese tag de Brawl Stars.', 404);
        }

        $this->link($userId, $tag);

        return ['tag' => '#' . $tag];
    }

    /**
     * @return array<string,mixed>
     */
    public function stats(?int $userId, string $tagQuery): array
    {
        if ($tagQuery !== '') {
            $tag = ltrim(strtoupper(trim($tagQuery)), '#');
        } else {
            if (!$userId) {
                throw new ApiException('No autenticado.', 401);
            }
            $tag = $this->getLinkedIdentifier($userId);
            if (!$tag) {
                throw new ApiException('Todavía no vinculaste tu cuenta de Brawl Stars.', 404);
            }
        }

        $data = $this->fetchProfile($tag);
        $b    = $data['data'] ?? null;
        if (!$b) {
            throw new ApiException('No se encontró ese tag de Brawl Stars.', 404);
        }

        $club = isset($b['club']['name'])
            ? ['nombre' => $b['club']['name'], 'tag' => $b['club']['tag'] ?? '']
            : null;

        return [
            'perfil' => [
                'nombre'        => $b['name']            ?? null,
                'tag'           => $b['tag']              ?? null,
                'nivel'         => $b['expLevel']         ?? null,
                'trofeos'       => $b['trophies']         ?? 0,
                'maxTrofeos'    => $b['highestTrophies']  ?? null,
                'victorias3v3'  => $b['3vs3Victories']    ?? 0,
                'victoriasSolo' => $b['soloVictories']    ?? 0,
                'victoriasDuo'  => $b['duoVictories']     ?? 0,
                'rangoNombre'   => $b['rankedRankName']   ?? null,
                'elo'           => $b['rankedElo']        ?? null,
                'maxElo'        => $b['highestAllTimeRankedElo'] ?? null,
                'club'          => $club,
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function fetchProfile(string $tag): array
    {
        $raw = @file_get_contents(self::API_BASE . $tag);
        if ($raw === false) {
            throw new ApiException('No se pudo contactar la API de Brawl Stars.', 502);
        }

        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
