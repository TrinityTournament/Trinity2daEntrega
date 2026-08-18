#!/bin/bash

# ==============
# Trinity - Monitor del servidor
# ==============

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"

# ==-> Colores
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
C='\033[0;36m'; B='\033[1m'; RE='\033[0m'

sep() { echo -e "${R}──────────────────────────────────────────────────${RE}"; }

titulo() { echo -e "\n${B}${C}  $*${RE}"; sep; }

estado_servicio() {
    local nombre=$1
    local servicio=$2
    if systemctl is-active --quiet "$servicio" 2>/dev/null; then
        echo -e "  ${nombre}: ${G}● activo${RE}"
    else
        echo -e "  ${nombre}: ${R}○ inactivo${RE}"
    fi
}

# ==-> Leer .env
get_env() {
    grep -E "^${1}=" "$ENV_FILE" 2>/dev/null | cut -d '=' -f2- | tr -d '"' | tr -d "'"
}

DB_HOST="${DB_HOST:-$(get_env DB_HOST)}"; DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-$(get_env DB_NAME)}"; DB_NAME="${DB_NAME:-trinity}"
DB_USER="${DB_USER:-$(get_env DB_USER)}"; DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-$(get_env DB_PASS)}"

MYSQL_ARGS="-h$DB_HOST -u$DB_USER --silent"
if [[ -n "$DB_PASS" ]]; then MYSQL_ARGS="$MYSQL_ARGS -p$DB_PASS"; fi

clear
echo -e "\n${B}${R}  TRINITY — Estado del servidor${RE}"
echo -e "  $(date '+%A %d de %B de %Y, %H:%M:%S')"

# ==-> CPU 
titulo "CPU"
CPU_LOAD=$(uptime | awk -F'load average:' '{print $2}' | sed 's/^ //')
CPU_CORES=$(nproc)
echo -e "  Carga promedio : ${Y}$CPU_LOAD${RE}"
echo -e "  Núcleos        : $CPU_CORES"

TOP_PROC=$(ps aux --sort=-%cpu | awk 'NR==2 {printf "%s (%.1f%%)", $11, $3}')
echo -e "  Proceso top    : $TOP_PROC"

# ==-> RAM 
titulo "RAM"
RAM_INFO=$(free -h | awk '/^Mem:/ {print $2, $3, $4, $7}')
RAM_TOT=$(echo $RAM_INFO | awk '{print $1}')
RAM_USO=$(echo $RAM_INFO | awk '{print $2}')
RAM_LIB=$(echo $RAM_INFO | awk '{print $3}')
RAM_DIS=$(echo $RAM_INFO | awk '{print $4}')
RAM_PCT=$(free | awk '/^Mem:/ {printf "%.1f", $3/$2*100}')

echo -e "  Total     : $RAM_TOT"
echo -e "  En uso    : ${Y}$RAM_USO (${RAM_PCT}%)${RE}"
echo -e "  Libre     : $RAM_LIB"
echo -e "  Disponible: $RAM_DIS"

# ── DISCO 
titulo "Disco"
df -h | awk 'NR==1 || /^\// {
    if (NR==1) printf "  %-25s %8s %8s %8s %6s\n", "Sistema de archivos", "Tamaño", "Usado", "Libre", "Uso%"
    else       printf "  %-25s %8s %8s %8s %6s\n", $1, $2, $3, $4, $5
}'

# ==->  SERVICIOS 
titulo "Servicios"
estado_servicio "Apache" "apache2"
estado_servicio "MySQL"  "mysql"

# Verificar conexión real a la BD
if mysql $MYSQL_ARGS -e "SELECT 1;" "$DB_NAME" &>/dev/null; then
    echo -e "  BD Trinity: ${G}✔ conexión OK${RE}"
else
    echo -e "  BD Trinity: ${R}✘ sin conexión${RE}"
fi

# ==->  CONSULTAS LENTAS 
titulo "Últimas 5 consultas lentas de MySQL"
SLOW_LOG=$(mysql $MYSQL_ARGS -e "SHOW VARIABLES LIKE 'slow_query_log_file';" "$DB_NAME" 2>/dev/null \
    | awk 'NR==2 {print $2}')

if [[ -n "$SLOW_LOG" && -f "$SLOW_LOG" ]]; then
    SLOW_ENABLED=$(mysql $MYSQL_ARGS -e "SHOW VARIABLES LIKE 'slow_query_log';" "$DB_NAME" 2>/dev/null \
        | awk 'NR==2 {print $2}')
    if [[ "$SLOW_ENABLED" == "ON" ]]; then
        grep -A3 "^# Query_time" "$SLOW_LOG" 2>/dev/null \
            | tail -20 \
            | sed 's/^/  /' \
            || echo -e "  ${Y}Sin consultas lentas registradas.${RE}"
    else
        echo -e "  ${Y}El log de consultas lentas está desactivado.${RE}"
        echo -e "  Para activarlo: SET GLOBAL slow_query_log = 'ON';"
    fi
else
    echo -e "  ${Y}Log de consultas lentas no disponible.${RE}"
fi

# ==->  ÚLTIMAS NOTIFICACIONES 
titulo "Últimas 10 notificaciones (tabla notificaciones)"
QUERY="SELECT
    n.id,
    u.usuario,
    n.tipo,
    SUBSTRING(n.titulo, 1, 35) AS titulo,
    IF(n.leido, 'Leída', 'No leída') AS estado,
    DATE_FORMAT(n.creado_en, '%d/%m %H:%i') AS fecha
FROM notificaciones n
JOIN usuarios u ON u.id = n.usuario_id
ORDER BY n.creado_en DESC
LIMIT 10;"

RESULT=$(mysql $MYSQL_ARGS -t -e "$QUERY" "$DB_NAME" 2>/dev/null)

if [[ -n "$RESULT" ]]; then
    echo "$RESULT" | sed 's/^/  /'
else
    echo -e "  ${Y}Sin notificaciones o sin acceso a la BD.${RE}"
fi

echo -e "\n"
sep
echo -e "  Monitor ejecutado: $(date '+%H:%M:%S')"
sep
echo