# ai/agent_engine.py

from ai.recommender import recommend_transport_options
from ai.rag_engine import retrieve_context
from rapidfuzz import fuzz, process
import random
import re

# Simple in-memory context (resets when server restarts)
USER_MEMORY = {
    "last_query": None,
    "last_best_option": None,
    "name": None,
}


def _format_option(opt: dict) -> str:
    """Pretty formatting for best option."""
    return (
        "💡 **Best Option Found**\n\n"
        f"🚍 Mode: **{opt.get('mode', '').upper()}**\n"
        f"🛣 Route: {opt.get('origin')} → {opt.get('destination')}\n"
        f"💰 Price: ₹{opt.get('price')}\n"
        f"⭐ Rating: {opt.get('rating', 'N/A')}\n"
        f"⏱ Duration: {opt.get('duration_mins', 'N/A')} mins\n\n"
        "Would you like me to book this option for you?"
    )


def respond_intelligently(message: str, routes: list[dict], kb_dir) -> str:
    """
    FINAL Natural Language Conversational Travel Assistant Engine.
    Handles:
    - Fuzzy city matching
    - Unstructured travel queries
    - Best mode detection (fastest/cheapest/preferred)
    - Website booking guidance
    - Seasonal rush planning
    - General travel preparation
    """

    if not message or not message.strip():
        return "🙂 I didn't receive anything. Try asking *'Best way from Delhi to Agra?'*"

    msg = message.lower().strip()
    USER_MEMORY["last_query"] = message

    # ----------------------------------------
    # 1️⃣ Greeting / Identity Handling
    # ----------------------------------------
    greetings = ["hi", "hello", "hey", "namaste", "good morning", "good evening"]

    if any(g in msg for g in greetings):
        return random.choice([
            "👋 Hey! Where are you planning to travel?",
            "Hello 😊 tell me your travel route and I’ll guide you!",
            "Hi! You can ask: *best train from Delhi to Jaipur*"
        ])

    if "my name is" in msg:
        name = msg.split("my name is")[-1].strip().split(" ")[0].title()
        USER_MEMORY["name"] = name
        return f"Nice to meet you, {name}! Tell me your travel query 😊."

    if "your name" in msg:
        return "You can call me **TRAVIAAI** 🤖 — your intelligent travel assistant."

    # ----------------------------------------
    # 2️⃣ Extract Cities Using Fuzzy Matching
    # ----------------------------------------
    cities = list({r['origin'] for r in routes} | {r['destination'] for r in routes})
    extracted = process.extract(msg, cities, limit=5, scorer=fuzz.partial_ratio)
    extracted = [c for c in extracted if c[1] > 60]

    origin = extracted[0][0] if len(extracted) > 0 else None
    destination = extracted[1][0] if len(extracted) > 1 else None

    # ----------------------------------------
    # 3️⃣ Seasonal Rush / Holiday Travel Guidance
    # ----------------------------------------
    rush_keywords = ["holiday", "crowd", "festival", "rush", "peak", "long weekend"]
    if any(word in msg for word in rush_keywords):
        return (
            "📌 **Peak Travel Advisory**:\n"
            "Travel tends to be crowded during:\n"
            "- 🚂 Long weekends\n"
            "- 🎉 National holidays (Diwali, Christmas, Onam, Eid, Pongal)\n"
            "- 💼 Summer vacations\n\n"
            "**Smart Tips:**\n"
            "✔ Book 20–45 days early\n"
            "✔ Avoid Friday evenings\n"
            "✔ Compare prices on MakeMyTrip, IRCTC, Redbus, IXIGO\n"
            "✔ Keep digital documents & buffer time\n\n"
            "Want me to search best options for your route now?"
        )

    # ----------------------------------------
    # 4️⃣ Website Recommendation Intent
    # ----------------------------------------
    if any(x in msg for x in ["where to book", "website", "app", "online booking"]):
        return (
            "🛒 **Best Platforms to Book:**\n"
            "- 🚆 Train → **IRCTC, IXIGO, MakeMyTrip**\n"
            "- 🚌 Bus → **RedBus, AbhiBus, Goibibo**\n"
            "- ✈️ Flights → **Cleartrip, IXIGO, MakeMyTrip**\n"
            "- 🚕 Cab → **Uber, Ola, Rapido**\n\n"
            "Tell me your route and I'll compare estimated prices."
        )

    # ----------------------------------------
    # 5️⃣ Planning / Packing Help
    # ----------------------------------------
    if any(word in msg for word in ["prepare", "packing", "checklist", "travel tips"]):
        return (
            "🧳 **Travel Preparation Guide:**\n"
            "• Keep ID, tickets, hotel booking copies\n"
            "• Carry powerbank, water, medicines\n"
            "• Reach station/airport early (Train: 30 min / Flight: 2 hrs)\n"
            "• Download offline maps\n"
            "• Share live location during solo travel\n\n"
            "Want safety rules or booking suggestions?"
        )

    # ----------------------------------------
    # 6️⃣ If Route Identified → Recommend Best Option
    # ----------------------------------------
    if origin and destination:
        matches = [
            r for r in routes
            if fuzz.partial_ratio(r['origin'], origin) > 65
            and fuzz.partial_ratio(r['destination'], destination) > 65
        ]

        if not matches:
            return f"❌ I found **{origin} → {destination}**, but no exact transport. Try nearby cities?"

        # Decide user intent: cheap vs fast vs comfort
        priority = "price"
        if "fast" in msg or "quick" in msg: priority = "time"
        elif "comfortable" in msg or "luxury" in msg: priority = "comfort"

        recs = recommend_transport_options(matches, priority)
        best = recs[0]
        USER_MEMORY["last_best_option"] = best

        return (
            f"📍 Found a match for **{origin} → {destination}**\n"
            f"🔍 Filter applied: **{'Cheapest' if priority=='price' else 'Fastest'} travel option**\n\n"
            f"🚗 **Best Mode: {best['mode'].upper()}**\n"
            f"🏁 Route: {best['origin']} → {best['destination']}\n"
            f"💰 Fare: ₹{best['price']}\n"
            f"⭐ Rating: {best['rating']}/5\n"
            f"🕒 Travel Time: {best['duration_mins']} mins\n\n"
            "Would you like:\n"
            "👉 price comparison websites?\n"
            "👉 alternative routes?\n"
            "👉 safety / baggage rules?"
        )

    # ----------------------------------------
    # 7️⃣ Knowledge Base Queries (Safety, Baggage)
    # ----------------------------------------
    if any(word in msg for word in ["safety", "baggage", "rules", "luggage"]):
        ctx = retrieve_context(message, kb_dir)
        if ctx:
            top = ctx[0]
            return f"📘 **{top['title'].replace('_', ' ').title()}**\n\n{top['snippet']}..."

    # ----------------------------------------
    # 8️⃣ Generic fallback
    # ----------------------------------------
    return (
        "🤖 I can help with:\n"
        "• Best routes & modes (train/bus/flight/cab)\n"
        "• Cheapest/fastest travel\n"
        "• Festival rush guidance\n"
        "• Safety & baggage rules\n"
        "• Website booking suggestions\n\n"
        "Try typing: *cheapest delhi to agra* or *best flight mumbai to goa* ✈️"
    )