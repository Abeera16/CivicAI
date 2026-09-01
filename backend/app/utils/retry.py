import functools
from typing import Callable, TypeVar

from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.logging_config import logger

F = TypeVar("F", bound=Callable)


def with_retry(max_attempts: int = 3, min_wait: float = 1, max_wait: float = 8):
    """Decorator adding exponential-backoff retries to async/sync tool calls."""

    def decorator(func: F) -> F:
        retrying = retry(
            reraise=True,
            stop=stop_after_attempt(max_attempts),
            wait=wait_exponential(multiplier=min_wait, max=max_wait),
            retry=retry_if_exception_type(Exception),
            before_sleep=lambda rs: logger.warning(
                f"Retrying {func.__name__} (attempt {rs.attempt_number}) after error: {rs.outcome.exception()}"
            ),
        )

        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            return await retrying(func)(*args, **kwargs)

        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            return retrying(func)(*args, **kwargs)

        import asyncio

        return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper

    return decorator
