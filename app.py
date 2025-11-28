from flask import Flask, render_template, send_from_directory
from routes.transport import bp as transport_bp
import os
from pathlib import Path
import sqlite3
import json

app = Flask(__name__, static_folder="static")

# Serve data folder JSON files
@app.route('/data/<path:filename>')
def serve_data(filename):
    return send_from_directory(os.path.join(os.getcwd(), "data"), filename)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "database.db"
DATA_DIR = BASE_DIR / "data"


def init_db():
    if DB_PATH.exists():
        return
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    c.execute("""
        CREATE TABLE transports(
            id TEXT PRIMARY KEY,
            mode TEXT,
            name TEXT,
            origin TEXT,
            destination TEXT,
            departure TEXT,
            arrival TEXT,
            duration_mins INTEGER,
            price REAL,
            seats_available INTEGER,
            rating REAL,
            extra_json TEXT
        )
    """)

    c.execute("""
        CREATE TABLE user_history(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origin TEXT,
            destination TEXT,
            mode TEXT,
            priority TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()

    def load_and_insert(filename, mode):
        path = DATA_DIR / filename
        if not path.exists():
            return
        with open(path, "r", encoding="utf-8") as f:
            rows = json.load(f)
        for row in rows:
            rid = row.get("id") or f"{mode}_{row.get('code', row.get('name','unk'))}"
            extra = json.dumps(row)
            c.execute("""
                INSERT INTO transports(id, mode, name, origin, destination,
                    departure, arrival, duration_mins, price,
                    seats_available, rating, extra_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                rid, mode, row.get("name"), row.get("origin"), row.get("destination"),
                row.get("departure"), row.get("arrival"), row.get("duration_mins", 0),
                row.get("price", 0), row.get("seats_available", 0), row.get("rating", 4.0), extra
            ))
        conn.commit()

    load_and_insert("trains.json", "train")
    load_and_insert("flights.json", "flight")
    load_and_insert("buses.json", "bus")
    load_and_insert("taxis.json", "taxi")
    load_and_insert("bikes.json", "bike")

    conn.close()


def create_app():
    global app  # <<< IMPORTANT FIX
    app.register_blueprint(transport_bp)

    @app.route("/")
    def home():
        return render_template("index.html")

    return app


if __name__ == "__main__":
    os.makedirs(DATA_DIR, exist_ok=True)
    init_db()
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
