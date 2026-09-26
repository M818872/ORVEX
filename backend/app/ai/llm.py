"""ACTIONOS LLM Client — OpenAI with structured output and fallback."""
import json
import logging
import os
import re
from typing import Any, Optional

logger = logging.getLogger("actionos")

_client = None


def get_client():
    global _client
    if _client is None:
        try:
            from openai import OpenAI
            api_key = os.getenv("OPENAI_API_KEY", "")
            if api_key and not api_key.startswith("REPLACE"):
                _client = OpenAI(api_key=api_key)
                logger.info("OpenAI client initialized")
        except ImportError:
            logger.warning("openai package not installed")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")
    return _client


def call_llm(
    system_prompt: str,
    user_prompt: str,
    max_tokens: int = 4096,
    temperature: float = 0.2,
    expect_json: bool = True,
) -> Optional[dict | str]:
    """
    Call LLM and return parsed JSON or raw string.
    Returns None if LLM unavailable (caller must handle gracefully).
    """
    client = get_client()
    if client is None:
        logger.warning("LLM unavailable — no API key configured")
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]

    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            response_format={"type": "json_object"} if expect_json else None,
        )
        
        content = response.choices[0].message.content
        
        if expect_json:
            return parse_json_safely(content)
        return content
        
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return None


def parse_json_safely(text: str) -> Optional[dict]:
    """Parse JSON from LLM output, handling common formatting issues."""
    if not text:
        return None
    
    # Try direct parse
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Try extracting JSON from markdown code blocks
    match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass
    
    # Try finding first { ... } block
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    
    logger.error(f"Failed to parse LLM JSON output: {text[:200]}")
    return None


def call_llm_json(prompt: str) -> Optional[dict]:
    """Convenience helper to call LLM and return parsed JSON dict."""
    return call_llm(
        system_prompt="You are ACTIONOS Manufacturing Disruption & Recovery AI. Respond only in valid JSON.",
        user_prompt=prompt,
        expect_json=True
    )


def is_llm_available() -> bool:
    """Check if LLM is configured and available."""
    api_key = os.getenv("OPENAI_API_KEY", "")
    return bool(api_key and not api_key.startswith("REPLACE") and len(api_key) > 10)
