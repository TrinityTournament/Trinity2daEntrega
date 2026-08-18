<?php
// Archivo temporal de diagnóstico — BORRAR después de usar
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Leer .env manualmente
$env = parse_ini_file(__DIR__ . '/.env');

$host = $env['DB_HOST'] ?? 'NO DEFINIDO';
$name = $env['DB_NAME'] ?? 'NO DEFINIDO';
$user = $env['DB_USER'] ?? 'NO DEFINIDO';
$pass = $env['DB_PASS'] ?? 'NO DEFINIDO';

echo "<pre>";
echo "DB_HOST : $host\n";
echo "DB_NAME : $name\n";
echo "DB_USER : $user\n";
echo "DB_PASS : $pass\n\n";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$name;charset=utf8mb4",
        $user,
        $pass,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "✔ Conexión exitosa\n";

    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    echo "Tablas encontradas: " . implode(', ', $tables) . "\n";
} catch (PDOException $e) {
    echo "✘ ERROR: " . $e->getMessage() . "\n";
}
echo "</pre>";