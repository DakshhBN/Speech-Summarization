from functools import lru_cache

from langchain_groq import ChatGroq

from app.config import get_settings

settings = get_settings()

SUMMARY_PROMPT = """You are summarizing a transcribed audio note. Write a concise summary \
(3-6 sentences) covering the main points, any decisions made, and action items if present. \
Do not add information that isn't in the transcript.

Transcript:
{transcript}
"""


@lru_cache
def get_llm() -> ChatGroq:
    return ChatGroq(model=settings.summarizer_model, api_key=settings.groq_api_key, reasoning_effort="low")


async def summarize(transcript: str) -> str:
    llm = get_llm()
    result = await llm.ainvoke(SUMMARY_PROMPT.format(transcript=transcript))
    return result.content
