<?php

namespace Trinity\Services\GameAccounts;

use Trinity\Core\ApiException;
use Trinity\Core\Env;

class FortniteService extends AbstractGameAccountService
{
    protected function gameKey(): string
    {
        return 'fortnite';
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
            throw new ApiException('Ingresá tu nombre de usuario de Epic Games.', 400);
        }

        [$httpCode, $data] = $this->fetchStats($username);

        if ($data === null) {
            throw new ApiException('No se pudo verificar el usuario. Intentá de nuevo.', 422);
        }

        if (($data['status'] ?? 0) !== 200) {
            $msg = $httpCode === 403
                ? 'Este perfil es privado. El jugador debe hacer públicas sus estadísticas en el juego.'
                : 'No se encontró ese usuario de Fortnite. Verificá el nombre exacto (sensible a mayúsculas).';
            throw new ApiException($msg, 422);
        }

        $confirmedName = $data['data']['account']['name'] ?? $username;
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
                throw new ApiException('Todavía no vinculaste tu cuenta de Fortnite.', 404);
            }
        }

        [$httpCode, $data] = $this->fetchStats($username);

        if ($data === null) {
            throw new ApiException('No se pudo contactar la API de Fortnite.', 502);
        }

        if (($data['status'] ?? 0) !== 200) {
            $msg = $httpCode === 403
                ? 'Este perfil de Fortnite es privado. El jugador debe hacer públicas sus estadísticas en el juego.'
                : 'No se encontró ese usuario de Fortnite. Verificá que el nombre sea exacto.';
            throw new ApiException($msg, $httpCode === 403 ? 403 : 404);
        }

        $profile  = $data['data'] ?? [];
        $statsAll = $profile['stats']['all']           ?? [];
        $statsKM  = $profile['stats']['keyboardMouse'] ?? [];
        $statsGP  = $profile['stats']['gamepad']       ?? [];
        $bp       = $profile['battlePass']             ?? [];

        return [
            'perfil' => [
                'nombre'          => $profile['account']['name'] ?? $username,
                'battlePassLevel' => $bp['level']    ?? null,
                'battlePassProg'  => $bp['progress'] ?? null,
                'overall'         => $this->extractMode($statsAll['overall'] ?? null),
                'solo'            => $this->extractMode($statsKM['solo']     ?? null),
                'duo'             => $this->extractMode($statsKM['duo']      ?? null),
                'squad'           => $this->extractMode($statsKM['squad']    ?? null),
                'ltm'             => $this->extractMode($statsKM['ltm']      ?? null),
                'soloGP'          => $this->extractMode($statsGP['solo']     ?? null),
                'duoGP'           => $this->extractMode($statsGP['duo']      ?? null),
                'squadGP'         => $this->extractMode($statsGP['squad']    ?? null),
            ],
        ];
    }

    /**
     * @return array{0:int,1:array<string,mixed>|null}
     */
    private function fetchStats(string $username): array
    {
        $apiKey = Env::get('FNKEY', '');
        $url    = 'https://fortnite-api.com/v2/stats/br/v2?name=' . urlencode($username);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 10,
            CURLOPT_HTTPHEADER     => $apiKey !== '' ? ["Authorization: $apiKey"] : [],
        ]);
        $raw      = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($raw === false || $httpCode === 0) {
            return [$httpCode, null];
        }

        $data = json_decode($raw, true);
        return [$httpCode, is_array($data) ? $data : []];
    }

    /**
     * @param array<string,mixed>|null $m
     * @return array<string,mixed>|null
     */
    private function extractMode(?array $m): ?array
    {
        if (!$m) {
            return null;
        }
        return [
            'matches'       => $m['matches']      ?? 0,
            'wins'          => $m['wins']          ?? 0,
            'kills'         => $m['kills']         ?? 0,
            'deaths'        => $m['deaths']        ?? 0,
            'kd'            => $m['kd']            ?? null,
            'winRate'       => $m['winRate']       ?? null,
            'minutesPlayed' => $m['minutesPlayed'] ?? 0,
        ];
    }
}
