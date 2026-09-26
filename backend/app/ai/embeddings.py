"""Embedding generation and vector similarity search.

Primary: OpenAI text-embedding-3-small
Fallback: Simple TF-IDF-style keyword similarity when API unavailable
"""
import json
import logging
import math
import os
import re
from typing import List, Optional, Tuple

logger = logging.getLogger("actionos")

_openai_client = None


def _get_openai_client():
    global _openai_client
    if _openai_client is None:
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY", "")
            if api_key and not api_key.startswith("REPLACE"):
                _openai_client = OpenAI(api_key=api_key)
        except ImportError:
            logger.warning("openai package not installed — using fallback embeddings")
    return _openai_client


def embed_text(text: str) -> List[float]:
    """Generate embedding for text. Falls back to keyword vector if API unavailable."""
    client = _get_openai_client()
    if client:
        try:
            model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
            response = client.embeddings.create(
                model=model,
                input=text[:8000],
            )
            return response.data[0].embedding
        except Exception as e:
            logger.warning(f"OpenAI embedding failed: {e} — using fallback")

    return _fallback_embedding(text)


def embed_texts_batch(texts: List[str]) -> List[List[float]]:
    """Embed multiple texts. Uses batch API when possible."""
    client = _get_openai_client()
    if client:
        try:
            model = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
            truncated = [t[:8000] for t in texts]
            response = client.embeddings.create(model=model, input=truncated)
            return [item.embedding for item in response.data]
        except Exception as e:
            logger.warning(f"OpenAI batch embedding failed: {e} — using fallback")

    return [_fallback_embedding(t) for t in texts]


def _fallback_embedding(text: str) -> List[float]:
    """Simple keyword-frequency embedding for offline/fallback mode.
    Produces a 512-dim vector based on word frequency normalization.
    """
    # Build a vocabulary of the top 512 most common enterprise keywords
    _VOCAB = _get_vocab()
    text_lower = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
    words = text_lower.split()
    word_freq: dict = {}
    for w in words:
        if w in _VOCAB:
            word_freq[w] = word_freq.get(w, 0) + 1

    vec = [0.0] * len(_VOCAB)
    for i, word in enumerate(_VOCAB):
        if word in word_freq:
            # TF: normalized by total words
            vec[i] = word_freq[word] / max(len(words), 1)

    # L2 normalize
    magnitude = math.sqrt(sum(x * x for x in vec))
    if magnitude > 0:
        vec = [x / magnitude for x in vec]

    return vec


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Cosine similarity between two vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(x * x for x in vec_a))
    mag_b = math.sqrt(sum(x * x for x in vec_b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def retrieve_chunks(
    query: str,
    chunks_with_embeddings: List[Tuple[str, str, List[float]]],
    top_k: int = 8,
    threshold: float = 0.0,
) -> List[Tuple[str, str, float]]:
    """
    Retrieve most relevant chunks using cosine similarity.
    
    Args:
        query: Search query
        chunks_with_embeddings: List of (content, section, embedding)
        top_k: Number of results to return
        threshold: Minimum similarity score

    Returns:
        List of (content, section, score)
    """
    query_embedding = embed_text(query)
    scored = []

    for content, section, embedding in chunks_with_embeddings:
        if not embedding:
            continue
        score = cosine_similarity(query_embedding, embedding)
        if score >= threshold:
            scored.append((content, section, score))

    scored.sort(key=lambda x: x[2], reverse=True)
    return scored[:top_k]


def _get_vocab() -> List[str]:
    """Enterprise keyword vocabulary for fallback embeddings."""
    return [
        # Launch / Project
        "launch", "date", "deadline", "project", "milestone", "release",
        "schedule", "timeline", "target", "plan", "phase", "completed",
        "october", "september", "november", "week", "month", "day",
        # People / Roles
        "engineering", "procurement", "finance", "operations", "product",
        "manager", "director", "team", "lead", "officer", "vendor",
        # Actions / States
        "approve", "approval", "approved", "reject", "pending", "confirm",
        "blocked", "resolved", "unresolved", "complete", "incomplete",
        "required", "required", "follow", "notify", "communicate", "escalate",
        # Risk / Policy
        "risk", "policy", "conflict", "issue", "concern", "compliance",
        "notice", "requirement", "violation", "governance", "audit",
        "exception", "waiver", "authorization",
        # Technical
        "api", "integration", "vendor", "specification", "authentication",
        "dependency", "module", "billing", "payment", "enterprise",
        # Business
        "customer", "revenue", "contract", "cost", "budget", "impact",
        "commitment", "decision", "action", "task", "priority",
        # Evidence markers
        "therefore", "because", "since", "however", "although", "stated",
        "confirmed", "proposed", "indicated", "mentioned", "noted",
        # Meridian specific
        "meridian", "apex", "novacore", "platform", "v3", "v2", "oauth",
        "hmac", "authentication", "documentation", "corrected", "error",
        # Status
        "amber", "red", "green", "high", "medium", "low", "critical",
        # Communication
        "email", "meeting", "transcript", "report", "document", "call",
        # Financial
        "million", "cost", "additional", "charge", "fee", "expense",
        # Operations
        "fourteen", "fourteen-day", "fourteen-calendar", "fourteen-days",
        "production", "external", "internal", "stakeholder", "committee",
        # Dependencies
        "depends", "dependent", "dependency", "blocked", "waiting", "pending",
        # Misc
        "one", "two", "three", "four", "five", "six", "seven", "eight",
        "formal", "written", "verbal", "documentation", "record", "log",
        "standard", "process", "procedure", "workflow", "system",
    ]
