import sys
from loguru import logger
from app.core.config import settings


def configure_logging() -> None:
    logger.remove()
    logger.add(
        sys.stdout,
        level=settings.log_level,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | "
               "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
        backtrace=True,
        diagnose=settings.environment != "production",
    )
    logger.add(
        "logs/civicai.log",
        level="INFO",
        rotation="10 MB",
        retention="14 days",
        compression="zip",
        enqueue=True,
    )


__all__ = ["logger", "configure_logging"]
