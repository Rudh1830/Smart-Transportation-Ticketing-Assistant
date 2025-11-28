from flask import Blueprint, request, jsonify, g
import sqlite3
from pathlib import Path
import json

bp = Blueprint("transport", __name__, url_prefix="")

BASE_DIR = Path(__file__).resolve().parent.parent
DB_PATH = BASE_DIR / "database.db"
KB_DIR = BASE_DIR / "knowledge_base"


# ------- DB Helpers -------
def get_db():
    if "_database" not in g:
        g._database = sqlite3.connect(DB_PATH)
        g._database.row_factory = sqlite3.Row
    return g._database


@bp.teardown_app_request
def close_connection(exception):
    db = g.pop("_database", None)
    if db is not None:
        db.close()


# ------- SEARCH ROUTE -------
@bp.route("/search", methods=["POST"])
def search():
    data = request.get_json(force=True)
    origin = data.get("origin", "").strip().lower()
    destination = data.get("destination", "").strip().lower()
    mode = data.get("mode", "").strip().lower()

    db = get_db()
    query = "SELECT * FROM transports WHERE 1=1"
    params = []

    if origin:
        query += " AND lower(origin) LIKE ?"
        params.append(f"%{origin}%")

    if destination:
        query += " AND lower(destination) LIKE ?"
        params.append(f"%{destination}%")

    if mode:
        query += " AND lower(mode)=?"
        params.append(mode)

    result = db.execute(query, params).fetchall()
    results = [dict(row) for row in result]

    return jsonify({"count": len(results), "results": results})


# ------- CHATBOT ROUTE -------
@bp.route("/chat", methods=["POST"])
def chat():
    from ai.agent_engine import respond_intelligently
    from ai.recommender import recommend_transport_options

    message = request.json.get("message", "")

    db = get_db()
    rows = db.execute("SELECT * FROM transports").fetchall()
    all_transports = [dict(r) for r in rows]

    reply = respond_intelligently(message, all_transports, KB_DIR)

    return jsonify({"reply": reply})


# ------- WEBSITE PRICE COMPARISON ROUTE -------
@bp.route("/compare_websites", methods=["POST"])
def compare_websites():
    from ai.recommender import WEBSITE_PROVIDERS, simulate_website_offers, best_website_offer

    data = request.get_json(force=True)
    origin = data.get("origin", "").lower()
    destination = data.get("destination", "").lower()
    mode = data.get("mode", "").lower()

    db = get_db()
    q = "SELECT * FROM transports WHERE 1=1"
    params = []

    if origin:
        q += " AND lower(origin) LIKE ?"
        params.append(f"%{origin}%")

    if destination:
        q += " AND lower(destination) LIKE ?"
        params.append(f"%{destination}%")

    if mode:
        q += " AND lower(mode)=?"
        params.append(mode)

    cur = db.execute(q, params).fetchall()
    routes = [dict(r) for r in cur]

    results = []
    for r in routes:
        r["mode"] = r.get("mode", mode)
        offers = simulate_website_offers(r)
        best = best_website_offer(offers)

        results.append({
            "transport": r,
            "offers": offers,
            "best_offer": best
        })

    return jsonify({"count": len(results), "matches": results})
