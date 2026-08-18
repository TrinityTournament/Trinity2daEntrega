#!/bin/bash
# =================================
#  TRINITY — Backup automático de la base de datos
# =================================

set -euo pipefail

# ==-> Configuración 
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
BACKUP_DIR="/var/backups/trinity"
LOG_FILE="/var/log/trinity-backup.log"
MAX_BACKUPS=7

# ==->  Logger 
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# ==->  Leer .env 
if [[ ! -f "$ENV_FILE" ]]; then
    log "ERROR: No se encontró el archivo .env en $ENV_FILE"
    exit 1
fi

get_env() {
    grep -E "^${1}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'"
}

DB_HOST="${DB_HOST:-$(get_env DB_HOST)}"
DB_NAME="${DB_NAME:-$(get_env DB_NAME)}"
DB_USER="${DB_USER:-$(get_env DB_USER)}"
DB_PASS="${DB_PASS:-$(get_env DB_PASS)}"

# Fallbacks si el .env no tiene variables de BD (instalación local)
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-trinity}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"

# ==->  Crear directorios si no existen 
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

log "════════════════════════════════════════"
log "Iniciando backup de Trinity"
log "Base de datos : $DB_NAME en $DB_HOST"

# ==->  Nombre del archivo 
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M')
BACKUP_FILE="$BACKUP_DIR/trinity_${TIMESTAMP}.sql.gz"

# ==->  Ejecutar mysqldump 
MYSQL_ARGS="-h$DB_HOST -u$DB_USER"
if [[ -n "$DB_PASS" ]]; then
    MYSQL_ARGS="$MYSQL_ARGS -p$DB_PASS"
fi

if mysqldump $MYSQL_ARGS \
    --single-transaction \
    --routines \
    --triggers \
    --set-gtid-purged=OFF \
    "$DB_NAME" 2>>"$LOG_FILE" | gzip > "$BACKUP_FILE"; then

    SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
    log "✔ Backup creado: $BACKUP_FILE ($SIZE)"
else
    log "ERROR: Falló el backup de la base de datos"
    rm -f "$BACKUP_FILE"
    exit 1
fi

# ==->  Limpiar backups viejos (conservar últimos MAX_BACKUPS)
TOTAL=$(find "$BACKUP_DIR" -name "trinity_*.sql.gz" | wc -l)
if [[ $TOTAL -gt $MAX_BACKUPS ]]; then
    EXCESO=$((TOTAL - MAX_BACKUPS))
    BORRADOS=$(find "$BACKUP_DIR" -name "trinity_*.sql.gz" \
        | sort | head -n "$EXCESO")
    echo "$BORRADOS" | xargs rm -f
    log "🗑  Eliminados $EXCESO backup(s) antiguo(s)"
fi

log "✔ Backup finalizado. Backups guardados: $(find "$BACKUP_DIR" -name "trinity_*.sql.gz" | wc -l)/$MAX_BACKUPS"
log "════════════════════════════════════════"