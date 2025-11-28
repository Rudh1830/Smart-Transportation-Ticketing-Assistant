# Smart Transportation Ticketing Assistant

Beginner-friendly full-stack AI-ish project.

## Features

- Search simulated transports:
  - Train, Flight, Bus, Taxi, Bike Taxi
- Compare routes by:
  - Price, time, comfort (simple heuristics)
- Agentic AI:
  - Picks best option from recommended list
- RAG:
  - Answers travel questions using local text files
- Website price comparison:
  - Simulates multiple "websites" like Uber, Rapido, RedBus, MakeMyTrip
  - Shows 2–4 offers per transport with different prices & discounts
- Admin:
  - Add new routes
  - View recent user history
  - See route counts by mode (Chart.js bar chart)

## Tech Stack

- Backend: Python, Flask, SQLite
- Frontend: HTML, CSS, Vanilla JS, Chart.js
- AI Logic:
  - Simple rule-based recommender
  - Very small RAG using local text files