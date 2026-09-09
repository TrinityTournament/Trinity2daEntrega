<?php

namespace Trinity\Services\GameAccounts;

use RuntimeException;
use Trinity\Core\ApiException;

/**
 * Porteado de ClashRoyaleAPI/helpers.php a una clase de servicio.
 * Preserva exactamente la lógica original (arena, evolución de cartas,
 * llamada a la API pública sprclll.vercel.app).
 */
class ClashRoyaleService extends AbstractGameAccountService
{
    private const API_BASE = 'https://sprclll.vercel.app/royale/players/';

    protected function gameKey(): string
    {
        return 'clashroyale';
    }

    /**
     * @return array<string,mixed>
     */
    public function save(int $userId, string $tagCrudo): array
    {
        if ($tagCrudo === '') {
            throw new ApiException('Ingresá tu tag de Clash Royale.', 400);
        }

        $tag = $this->normalizarTag($tagCrudo);
        if ($tag === null) {
            throw new ApiException('El tag no tiene un formato válido. Ejemplo: #GPP2J0UL8', 400);
        }

        try {
            $perfil = $this->fetchProfile($tag);
        } catch (RuntimeException $e) {
            throw new ApiException($e->getMessage(), 422);
        }

        $this->link($userId, $tag);

        return ['tag' => '#' . $tag, 'perfil' => $this->buildStatsPayload($perfil)];
    }

    /**
     * @return array<string,mixed>
     */
    public function stats(?int $userId, string $tagQuery): array
    {
        if ($tagQuery !== '') {
            $tag = $this->normalizarTag($tagQuery);
            if ($tag === null) {
                throw new ApiException('El tag no tiene un formato válido.', 400);
            }
        } else {
            if (!$userId) {
                throw new ApiException('No autenticado.', 401);
            }
            $tag = $this->getLinkedIdentifier($userId);
            if (!$tag) {
                throw new ApiException('Todavía no vinculaste tu cuenta de Clash Royale.', 404);
            }
        }

        try {
            $perfil = $this->fetchProfile($tag);
        } catch (RuntimeException $e) {
            throw new ApiException($e->getMessage(), 422);
        }

        return ['perfil' => $this->buildStatsPayload($perfil)];
    }

    public function getAccount(int $userId): array
    {
        $tag = $this->getLinkedIdentifier($userId);
        return ['tag' => $tag ? '#' . $tag : null];
    }

    private function normalizarTag(string $tagCrudo): ?string
    {
        $tag = strtoupper(trim($tagCrudo));
        $tag = ltrim($tag, '#');
        $tag = preg_replace('/\s+/', '', $tag);

        if (!preg_match('/^[A-Z0-9]{3,14}$/', $tag)) {
            return null;
        }
        return $tag;
    }

    /**
     * @return array<string,mixed>
     */
    private function fetchProfile(string $tag): array
    {
        $url = self::API_BASE . rawurlencode($tag);

        $ctx = stream_context_create([
            'http' => [
                'method'        => 'GET',
                'timeout'       => 10,
                'ignore_errors' => true,
                'header'        => "Accept: application/json\r\n",
            ],
        ]);

        $body = @file_get_contents($url, false, $ctx);

        $statusLine = $http_response_header[0] ?? '';
        preg_match('/\s(\d{3})\s/', $statusLine, $m);
        $status = isset($m[1]) ? (int) $m[1] : 0;

        if ($body === false) {
            throw new RuntimeException('No se pudo conectar con la API de Clash Royale.');
        }
        if ($status === 404) {
            throw new RuntimeException('No se encontró ningún jugador con ese tag.');
        }
        if ($status < 200 || $status >= 300) {
            throw new RuntimeException('La API de Clash Royale no respondió correctamente. Intentá de nuevo en unos minutos.');
        }

        $json = json_decode($body, true);
        if (!is_array($json) || !isset($json['data'])) {
            throw new RuntimeException('Respuesta inesperada de la API de Clash Royale.');
        }

        return $json['data'];
    }

    /**
     * @param array<string,mixed> $profile
     * @return array<string,mixed>
     */
    private function buildStatsPayload(array $profile): array
    {
        $deck = [];
        foreach (($profile['currentDeck'] ?? []) as $i => $card) {
            $deck[] = [
                'name'           => $card['name'] ?? '—',
                'level'          => $card['level'] ?? null,
                'maxLevel'       => $card['maxLevel'] ?? null,
                'elixirCost'     => $card['elixirCost'] ?? null,
                'rarity'         => $card['rarity'] ?? null,
                'evolutionLevel' => $card['evolutionLevel'] ?? 0,
                'evolutionLabel' => $this->evolutionLabel($card['evolutionLevel'] ?? 0),
                'image'          => $this->cardImage($card, $i),
            ];
        }

        $torre     = $profile['currentDeckSupportCards'][0] ?? null;
        $arenaInfo = $this->arenaInfo($profile['arena']['rawName'] ?? 'Arena_1');

        return [
            'nombre'       => $profile['name'] ?? '—',
            'tag'          => $profile['tag'] ?? '',
            'nivelExp'     => $profile['expLevel'] ?? null,
            'trofeos'      => $profile['trophies'] ?? 0,
            'mejorTrofeos' => $profile['bestTrophies'] ?? 0,
            'victorias'    => $profile['wins'] ?? 0,
            'derrotas'     => $profile['losses'] ?? 0,
            'donaciones'   => $profile['donations'] ?? 0,
            'clan'         => $profile['clan']['name'] ?? null,
            'arena'        => [
                'nombre' => $profile['arena']['name'] ?? '—',
                'numero' => $arenaInfo['numero'],
                'imagen' => $arenaInfo['imagen'],
            ],
            'torre' => $torre ? [
                'nombre' => $torre['name']  ?? '—',
                'nivel'  => $torre['level'] ?? null,
                'imagen' => $torre['iconUrls']['medium'] ?? null,
            ] : null,
            'mazo' => $deck,
        ];
    }

    /** @return array{numero:int,imagen:string} */
    private function arenaInfo(string $arenaRawName): array
    {
        $partes = explode('_', $arenaRawName);
        $arena  = $partes[1] ?? '1';

        if (str_starts_with($arena, 'L')) {
            $numero = (int) substr($arena, 1) + 13;
        } else {
            $numero = (int) $arena;
        }

        $ext = ($numero == 11 || $numero == 25) ? 'webp' : 'png';

        return [
            'numero' => $numero,
            'imagen' => "/assets/ArenasCR/Arena{$numero}.{$ext}",
        ];
    }

    private function evolutionLabel(int $evolutionLevel): string
    {
        if ($evolutionLevel > 2) {
            return 'HEROE_EVO';
        }
        if ($evolutionLevel > 1) {
            return 'HEROE';
        }
        if ($evolutionLevel > 0) {
            return 'EVO';
        }
        return '';
    }

    /** @param array<string,mixed> $card */
    private function cardImage(array $card, int $index): string
    {
        $evo  = $card['evolutionLevel'] ?? 0;
        $urls = $card['iconUrls'] ?? [];

        if ($index < 3) {
            if ($evo >= 3 && !empty($urls['heroMedium'])) {
                return $urls['heroMedium'];
            }
            if ($evo >= 1 && !empty($urls['evolutionMedium'])) {
                return $urls['evolutionMedium'];
            }
        }
        return $urls['medium'] ?? '';
    }
}
