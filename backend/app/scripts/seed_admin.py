"""
Idempotent admin-user seed script.

Reads credentials from environment variables (never hardcoded), hashes the
password with the app's real bcrypt context, and inserts one admin/staff
user row — but only if a user with that email doesn't already exist.

Safe to run on every startup (called from main.py's lifespan) or manually:
    python -m app.scripts.seed_admin

Required env vars:
    SEED_ADMIN_EMAIL
    SEED_ADMIN_PASSWORD
Optional:
    SEED_ADMIN_NAME        (default: "Admin")
    SEED_ADMIN_ROLE        (default: "staff")
"""
import os

from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.logging_config import logger
from app.core.security import hash_password
from app.models.db_models import User


async def seed_admin_if_needed() -> None:
    email = os.environ.get("SEED_ADMIN_EMAIL")
    password = os.environ.get("SEED_ADMIN_PASSWORD")

    if not email or not password:
        logger.info("SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set — skipping admin seed")
        return

    full_name = os.environ.get("SEED_ADMIN_NAME", "Admin")
    role = os.environ.get("SEED_ADMIN_ROLE", "staff")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        existing = result.scalar_one_or_none()

        if existing:
            logger.info(f"Admin seed skipped — user '{email}' already exists")
            return

        user = User(
            full_name=full_name,
            email=email,
            hashed_password=hash_password(password),
            role=role,
            is_active=True,
        )
        session.add(user)
        await session.commit()
        logger.info(f"Admin user '{email}' created with role='{role}'")


if __name__ == "__main__":
    import asyncio

    asyncio.run(seed_admin_if_needed())
