# ai/agent_engine.py

from ai.recommender import recommend_transport_options
from ai.rag_engine import retrieve_context

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
    Professional interactive chatbot logic.
    - Understands greetings, cheapest, from X to Y, safety, book confirmations.
    - Uses your existing recommender + RAG.
    - Returns a markdown-like text that frontend renders nicely.
    """
    if not message:
        return "I didn't receive any message. Could you please type your query again?"

    text = message.strip()
    msg = text.lower()

    USER_MEMORY["last_query"] = text

    # 1) Greetings
    if any(word in msg for word in ["hi", "hello", "hey", "good morning", "good evening"]):
        if USER_MEMORY.get("name"):
            return f"👋 Hello {USER_MEMORY['name']}! How can I assist with your travel today?"
        return (
            "👋 Hello! I'm your Smart Travel Assistant.\n\n"
            "I can help you with:\n"
            "- Finding routes (train / bus / flight / taxi / bike)\n"
            "- Choosing the cheapest or fastest option\n"
            "- Explaining safety & baggage rules\n"
            "- Simulating ticket booking\n\n"
            "Try asking: *Best train from Delhi to Agra*"
        )

    # 2) Capture user's name: "my name is ..."
    if "my name is" in msg:
        name_part = text.split("my name is", 1)[-1].strip()
        if name_part:
            name = name_part.split()[0].title()
            USER_MEMORY["name"] = name
            return f"Nice to meet you, {name} 🙂. How can I help you with your travel today?"
        else:
            return "Nice to meet you 🙂. How can I help you with your travel today?"

    # 3) Ask bot's name
    if "your name" in msg:
        return "You can call me **TRAViA**, your smart travel assistant 🤝."

    # 4) Booking confirmation, if we already suggested something
    if USER_MEMORY.get("last_best_option") and any(
        x in msg for x in ["yes", "book", "confirm", "go ahead", "ok", "okay", "sure"]
    ):
        best = USER_MEMORY["last_best_option"]
        return (
            f"🎟️ Booking simulated — your ticket for **{best['name']} ({best['mode'].upper()})** "
            f"from **{best['origin']}** to **{best['destination']}** is confirmed!\n\n"
            "If you want, I can now suggest a return trip or alternative options."
        )

    # 5) Specific route: "from X to Y"
    if "from" in msg and "to" in msg:
        try:
            # Very simple parsing: "... from ORIGIN to DEST ..."
            after_from = msg.split("from", 1)[1]
            origin_part, dest_part = after_from.split("to", 1)
            origin = origin_part.strip()
            dest = dest_part.strip()

            if not origin or not dest:
                raise ValueError("empty origin/destination")

            matches = [
                r
                for r in routes
                if origin in r.get("origin", "").lower()
                and dest in r.get("destination", "").lower()
            ]

            if not matches:
                return (
                    f"❌ I couldn't find any routes for **{origin} → {dest}** in the current dataset.\n\n"
                    "You can try:\n"
                    "- Checking spelling of city names\n"
                    "- Using a nearby major city\n"
                    "- Changing the transport mode (train / bus / flight / taxi / bike)"
                )

            # Priority: cheapest if user says cheap/lowest/budget; else time if fast; else price.
            if any(w in msg for w in ["cheap", "cheapest", "low", "budget"]):
                priority = "price"
            elif any(w in msg for w in ["fast", "quick", "shortest", "quickest"]):
                priority = "time"
            else:
                priority = "price"

            recs = recommend_transport_options(matches, priority=priority)
            if not recs:
                return "I found some routes, but couldn't rank them properly. Please try again."

            best = recs[0]
            USER_MEMORY["last_best_option"] = best
            return _format_option(best)

        except Exception:
            # Fall through to generic logic
            pass

    # 6) User asks for cheapest option in general
    if any(w in msg for w in ["cheapest", "lowest price", "low budget"]):
        if not routes:
            return "I don't have any route data loaded right now. Please try searching again."
        sorted_routes = sorted(routes, key=lambda r: r.get("price", 1e9))
        best = sorted_routes[0]
        USER_MEMORY["last_best_option"] = best
        return (
            "💸 **Overall cheapest option in the system**\n\n"
            + _format_option(best)
        )

    # 7) Safety / baggage / rules / tips → use RAG from your knowledge_base
    if any(w in msg for w in ["safety", "safe", "baggage", "luggage", "rules", "tips", "guidelines"]):
        ctx = retrieve_context(text, kb_dir)
        if ctx:
            top = ctx[0]
            return (
                f"📘 **{top['title'].replace('_', ' ').title()}**\n\n"
                f"{top['snippet']}\n\n"
                "If you share your route (for example: *train from Mumbai to Delhi*), "
                "I can also suggest the best option for that journey."
            )
        else:
            return (
                "I couldn't find specific rules in the knowledge base, but in general:\n"
                "- Keep valuables with you\n"
                "- Avoid sharing personal details with strangers\n"
                "- Double-check vehicle details before boarding"
            )

    # 8) Thank you
    if "thank" in msg:
        return "You're welcome 😊. If you need help with more routes or bookings, just ask!"

    # 9) Generic fallback help
    return (
        "🤖 I’m here to help with your travel.\n\n"
        "You can ask me things like:\n"
        "- *Best train from Delhi to Agra*\n"
        "- *Cheapest flight from Mumbai to Goa*\n"
        "- *Is night train travel safe?*\n"
        "- *Baggage rules for flights*\n\n"
        "Just describe your trip in natural language, and I’ll do my best to answer."
    )
