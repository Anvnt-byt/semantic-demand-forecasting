import pytest
from main import limiter

@pytest.fixture(autouse=True)
def disable_rate_limits():
    """Desactiva rate limiting de SlowAPI durante las pruebas para evitar HTTP 429."""
    limiter.enabled = False
    yield
    limiter.enabled = True
