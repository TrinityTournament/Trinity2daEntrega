<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Diagnóstico de Brevo (TEMPORAL)
//
//  Entrá a esto desde el navegador:
//      https://tu-sitio.com/api/debug-brevo.php
//
//  Hace 2 chequeos SIN mandar ningún email real:
//   1) GET /v3/account — confirma si la BREVO_KEY es válida.
//   2) Si es válida, lista los remitentes verificados en tu
//      cuenta, para confirmar que trinitysupportteam@gmail.com
//      esté ahí.
//
//  ⚠️ BORRAR ESTE ARCHIVO CUANDO TERMINES DE DIAGNOSTICAR.
//  Aunque no expone la key completa, es un endpoint sin
//  autenticación que no debería quedar en producción.
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/config.php';

use Trinity\Core\Env;

header('Content-Type: text/plain; charset=utf-8');

function brevoRequest(string $method, string $path, string $apiKey): array
{
    $ch = curl_init('https://api.brevo.com/v3' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST  => $method,
        CURLOPT_HTTPHEADER     => [
            'Accept: application/json',
            'api-key: ' . $apiKey,
        ],
        CURLOPT_TIMEOUT => 10,
    ]);
    $raw  = curl_exec($ch);
    $errno = curl_errno($ch);
    $err   = curl_error($ch);
    $code  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return compact('raw', 'errno', 'err', 'code');
}

$apiKey = Env::get('BREVO_KEY', '');

echo "══ 1) BREVO_KEY cargada desde .env ══\n";
if (!$apiKey) {
    echo "❌ NO SE CARGÓ NINGÚN VALOR. Env::get('BREVO_KEY') devolvió vacío.\n";
    echo "   Revisá que el .env esté en la raíz del proyecto (mismo nivel que index.html)\n";
    echo "   y que la línea sea exactamente: BREVO_KEY=xxxxx (sin comillas, sin espacios).\n";
    exit;
}
$masked = substr($apiKey, 0, 4) . str_repeat('*', max(0, strlen($apiKey) - 8)) . substr($apiKey, -4);
echo "✅ Se cargó un valor: {$masked} (largo: " . strlen($apiKey) . " caracteres)\n\n";

echo "══ 2) ¿La key es válida para Brevo? (GET /v3/account) ══\n";
$res = brevoRequest('GET', '/account', $apiKey);

if ($res['errno'] !== 0) {
    echo "❌ Error de conexión (curl_errno={$res['errno']}): {$res['err']}\n";
    echo "   Esto sería un problema de red/DNS del servidor hacia api.brevo.com, no de la key.\n";
    exit;
}

echo "HTTP {$res['code']}\n";
echo "Respuesta cruda:\n{$res['raw']}\n\n";

if ($res['code'] !== 200) {
    echo "❌ Brevo rechazó la key (HTTP {$res['code']}). Revisá el mensaje de arriba —\n";
    echo "   lo más común es 'unauthorized' (key inválida, revocada, o de otra cuenta).\n";
    exit;
}

echo "✅ La key es válida.\n\n";

echo "══ 3) Remitentes verificados en tu cuenta (GET /v3/senders) ══\n";
$res2 = brevoRequest('GET', '/senders', $apiKey);
echo "HTTP {$res2['code']}\n";
echo "Respuesta cruda:\n{$res2['raw']}\n\n";

if ($res2['code'] === 200) {
    $data = json_decode($res2['raw'], true);
    $found = false;
    foreach (($data['senders'] ?? []) as $s) {
        if (strcasecmp($s['email'] ?? '', 'trinitysupportteam@gmail.com') === 0) {
            $found = true;
            echo "→ trinitysupportteam@gmail.com está en la lista. active=" . json_encode($s['active'] ?? null) . "\n";
        }
    }
    if (!$found) {
        echo "❌ trinitysupportteam@gmail.com NO aparece en tus remitentes verificados.\n";
        echo "   Ese es probablemente el motivo: Brevo rechaza silenciosamente (en el log del\n";
        echo "   lado de Mailer.php) los envíos desde remitentes no verificados.\n";
    }
}
