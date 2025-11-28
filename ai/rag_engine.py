"""
Simple file-based RAG: keyword scoring for travel tips / rules.
"""
from pathlib import Path
from typing import List, Dict


def load_kb_files(kb_dir: Path) -> List[Dict]:
    docs = []
    for path in kb_dir.glob("*.txt"):
        try:
            text = path.read_text(encoding="utf-8")
            docs.append({"title": path.stem, "content": text})
        except Exception:
            continue
    return docs


def score_doc(question: str, doc: Dict) -> float:
    q_words = question.lower().split()
    text = (doc["title"] + " " + doc["content"]).lower()
    score = 0
    for w in q_words:
        if w in text:
            score += 1
    return score


def retrieve_context(question: str, kb_dir: Path, top_k: int = 3) -> List[Dict]:
    docs = load_kb_files(kb_dir)
    scored = []
    for d in docs:
        s = score_doc(question, d)
        if s > 0:
            scored.append({"title": d["title"], "score": s, "snippet": d["content"][:400]})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]
