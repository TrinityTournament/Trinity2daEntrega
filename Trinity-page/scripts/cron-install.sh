#!/bin/bash
# =========================
#  TRINITY — Instalar cron job de backup automático
#  Ejecutalo con sudo, bananin
# =========================

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "✘ Este script debe ejecutarse como root."
    echo "  Usá: sudo bash $0"
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup.sh"

if [[ ! -f "$BACKUP_SCRIPT" ]]; then
    echo "✘ No se encontró backup.sh en $BACKUP_SCRIPT"
    exit 1
fi

# Dar permisos de ejecución
chmod +x "$BACKUP_SCRIPT"

# Línea del cron: todos los días a las 3:00 AM
CRON_LINE="0 3 * * * bash $BACKUP_SCRIPT >> /var/log/trinity-backup.log 2>&1"

# Agregar solo si no existe
CRONTAB_ACTUAL=$(crontab -l 2>/dev/null || true)

if echo "$CRONTAB_ACTUAL" | grep -qF "$BACKUP_SCRIPT"; then
    echo "⚠ El cron job ya está instalado:"
    echo "  $CRON_LINE"
else
    (echo "$CRONTAB_ACTUAL"; echo "$CRON_LINE") | crontab -
    echo "✔ Cron job instalado correctamente:"
    echo "  $CRON_LINE"
fi

echo ""
echo "El backup se ejecutará todos los días a las 3:00 AM."
echo "Logs en: /var/log/trinity-backup.log"
echo "Backups en: /var/backups/trinity/"