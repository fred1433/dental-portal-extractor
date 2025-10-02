#!/bin/bash

echo "🦷 Dental Portal Demo Launcher"
echo "=============================="
echo ""

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "❌ Virtual environment not found!"
    echo "   Creating .venv..."
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
else
    source .venv/bin/activate
fi

# Paths
DDINS_DIR="ddins"
ROSTER_DB="$DDINS_DIR/ddins_roster.db"
RECORDS_DB="$DDINS_DIR/ddins_full_records.db"

# Check if database exists
if [ ! -f "$ROSTER_DB" ]; then
    echo "❌ Roster database not found!"
    echo "   Please run: python ddins/sync_full_roster.py --test"
    exit 1
fi

if [ ! -f "$RECORDS_DB" ]; then
    echo "⚠️  Warning: detailed records database missing (ddins_full_records.db)."
    echo "   Eligibility details may be unavailable."
fi

# Show database stats
echo "📊 Database Statistics:"
sqlite3 "$ROSTER_DB" "
    SELECT
        'Total Patients: ' || COUNT(*) || ' (' ||
        SUM(CASE WHEN json_extracted=1 THEN 1 ELSE 0 END) || ' with full data)'
    FROM patient_roster;
"

echo ""
echo "🚀 Starting Flask API server..."
echo "   Access the portal at: http://127.0.0.1:5001"
echo "   Press Ctrl+C to stop"
echo ""

# Start the Flask server
python ddins/ddins_portal_api.py
