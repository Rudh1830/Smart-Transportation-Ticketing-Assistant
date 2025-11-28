"""
Simple recommendation engine + helper for website price simulations.
"""
from typing import List, Dict, Optional
import random

# MCP-style simple context
USER_CONTEXT = {
    "budget": None,
    "last_origin": None,
    "last_destination": None,
    "preferred_mode": None,
    "history": []
}

# Website providers mapping
WEBSITE_PROVIDERS = {
    "bike": ["Rapido", "Uber Moto", "Ola Bike", "QuickRide"],
    "taxi": ["Uber", "Ola Cabs", "Meru Cabs", "MegaTaxi"],
    "bus": ["RedBus", "AbhiBus", "MakeMyTrip Bus", "Goibibo Bus"],
    "train": ["IRCTC", "MakeMyTrip Train", "Goibibo Train", "PayTM Rail"],
    "flight": ["MakeMyTrip", "Goibibo", "ClearTrip", "IXIGO"]
}

random.seed(42)


def store_history_entry(db, origin, destination, mode, priority):
    USER_CONTEXT["last_origin"] = origin
    USER_CONTEXT["last_destination"] = destination
    USER_CONTEXT["preferred_mode"] = mode
    USER_CONTEXT["history"].append({
        "origin": origin,
        "destination": destination,
        "mode": mode,
        "priority": priority
    })
    try:
        db.execute("""
            INSERT INTO user_history(origin, destination, mode, priority)
            VALUES (?, ?, ?, ?)
        """, (origin, destination, mode, priority))
        db.commit()
    except Exception:
        pass


def recommend_transport_options(options: List[Dict], priority: str = "price",
                                max_budget: Optional[float] = None) -> List[Dict]:
    """
    Basic heuristic scorer:
    - lower price is better
    - shorter duration is better
    - more seats is better
    - higher rating is better
    priority: "price", "time", "comfort", "eco"
    """
    scored = []
    for opt in options:
        price = float(opt.get("price", 0) or 0)
        duration = float(opt.get("duration_mins", 60) or 60)
        seats = float(opt.get("seats_available", 1) or 1)
        rating = float(opt.get("rating", 4.0) or 4.0)

        if max_budget is not None and price > max_budget:
            continue

        score = 0.0
        if priority == "price":
            score = 1000 / (price + 1) + rating * 5 + seats * 0.5
        elif priority == "time":
            score = 2000 / (duration + 1) + rating * 5
        elif priority == "comfort":
            score = rating * 20 + seats * 0.2
        elif priority == "eco":
            mode = opt.get("mode", "").lower()
            eco_factor = 1.0
            if mode in ["train", "bus"]:
                eco_factor = 1.5
            elif mode in ["flight"]:
                eco_factor = 0.7
            score = eco_factor * 1000 / (price + 1) + rating * 3
        else:
            score = rating * 10

        new_opt = dict(opt)
        new_opt["score"] = round(score, 3)
        scored.append(new_opt)

    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored


# ---------- website comparison helpers ----------

def _get_base_price(option: Dict) -> float:
    try:
        return float(option.get("price", 0) or 0)
    except Exception:
        return 0.0


def simulate_website_offers(option: Dict, max_sites: int = 4) -> List[Dict]:
    """
    Given a route (transport row), simulate multiple website price options.
    """
    mode = (option.get("mode") or "").lower()
    base_price = _get_base_price(option)
    providers = WEBSITE_PROVIDERS.get(mode, ["TravelNow", "BookMyRide", "EasyTrip"])
    selected = providers[:max_sites]
    offers = []

    if base_price <= 0:
        base_price = 500.0

    for site in selected:
        variation_pct = random.uniform(-0.15, 0.25)
        list_price = round(base_price * (1 + variation_pct), 2)
        discount_pct = random.choice([0, 5, 10, 15])
        final_price = round(list_price * (1 - discount_pct / 100.0), 2)
        offers.append({
            "site": site,
            "list_price": list_price,
            "discount": discount_pct,
            "final_price": final_price,
            "cta_text": f"Book on {site}"
        })
    offers.sort(key=lambda x: x["final_price"])
    return offers


def best_website_offer(offers: List[Dict]) -> Dict:
    if not offers:
        return {}
    return sorted(offers, key=lambda x: x["final_price"])[0]
    