<?php
// ══════════════════════════════════════════════════════════
//  TRINITY — Test de entorno (MySQL)
// ══════════════════════════════════════════════════════════
require_once __DIR__ . '/api/config.php';

echo '<pre style="font-family:monospace;padding:20px;">';
echo '── TRINITY — Diagnóstico del entorno ──' . PHP_EOL . PHP_EOL;

echo 'PHP versión  : ' . phpversion() . PHP_EOL;
echo 'PHP mínimo   : ' . (version_compare(PHP_VERSION, '8.0.0', '>=') ? '✔ OK (8.0+)' : '✘ NECESITA PHP 8.0+') . PHP_EOL;

$ext = [
    'pdo'      => 'PDO',
    'pdo_mysql'=> 'PDO MySQL',
    'curl'     => 'cURL (para Brevo)',
    'json'     => 'JSON',
    'session'  => 'Sesiones',
];

echo PHP_EOL . '── Extensiones ──' . PHP_EOL;
foreach ($ext as $name => $label) {
    $ok = extension_loaded($name);
    echo str_pad($label, 22) . ': ' . ($ok ? '✔ OK' : '✘ FALTA — habilitá ' . $name . ' en php.ini') . PHP_EOL;
}

// Conexión MySQL
echo PHP_EOL . '── Conexión MySQL ──' . PHP_EOL;
try {
    $pdo = db();
    echo 'Conexión        : ✔ OK' . PHP_EOL;

    // Verificar que la tabla existe
    $tables = $pdo->query("SHOW TABLES LIKE 'usuarios'")->fetchAll();
    echo 'Tabla usuarios  : ' . (!empty($tables) ? '✔ Existe' : '✘ No encontrada — ejecutá database.sql') . PHP_EOL;

    // Contar registros
    if (!empty($tables)) {
        $count = $pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
        echo 'Usuarios en DB  : ' . $count . PHP_EOL;
    }
} catch (Throwable $e) {
    echo 'Conexión        : ✘ ERROR' . PHP_EOL;
    echo 'Detalle         : ' . $e->getMessage() . PHP_EOL;
    echo PHP_EOL . 'Revisá DB_HOST, DB_USER, DB_PASS y DB_NAME en api/config.php' . PHP_EOL;
}

// cURL (para Brevo)
echo PHP_EOL . '── Brevo (email) ──' . PHP_EOL;
if (function_exists('curl_init')) {
    $ch = curl_init('https://api.brevo.com');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    curl_exec($ch);
    $err  = curl_error($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    echo 'Acceso a Brevo  : ' . ($err ? '✘ ' . $err : '✔ OK (HTTP ' . $code . ')') . PHP_EOL;
} else {
    echo 'cURL            : ✘ No disponible' . PHP_EOL;
}

echo PHP_EOL . '── Fin del diagnóstico ──' . PHP_EOL;
echo '</pre>';

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
$dotenv->load();

var_dump(getenv('ADMIN_KEY'));
var_dump($_ENV['ADMIN_KEY'] ?? null);