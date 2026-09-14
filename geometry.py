from __future__ import annotations

from dataclasses import dataclass
from math import pow
from typing import Iterable


@dataclass(frozen=True)
class StreetStep:
    street_index: int
    pot_before: float
    bet: float
    pot_after_call: float
    stack_remaining: float


def geometric_bet_fraction(spr: float, streets: float) -> float:
    """Return the constant fraction of pot that stacks off in `streets` bets.

    Assumes heads-up bet/call action with no raises. `spr` is effective stack / pot
    before the first bet.
    """
    if spr < 0:
        raise ValueError("SPR must be non-negative")
    if streets < 1:
        raise ValueError("streets must be >= 1")
    return (pow(1.0 + 2.0 * spr, 1.0 / streets) - 1.0) / 2.0


def geometric_bet_percent(spr: float, streets: float) -> float:
    return 100.0 * geometric_bet_fraction(spr, streets)


def spr_from_pot_stack(pot: float, effective_stack: float) -> float:
    if pot <= 0:
        raise ValueError("pot must be > 0")
    if effective_stack < 0:
        raise ValueError("effective_stack must be >= 0")
    return effective_stack / pot


def street_schedule(pot: float, effective_stack: float, streets: int) -> list[StreetStep]:
    """Build the constant-% geometric bet/call schedule."""
    spr = spr_from_pot_stack(pot, effective_stack)
    frac = geometric_bet_fraction(spr, streets)
    p = float(pot)
    remaining = float(effective_stack)
    out: list[StreetStep] = []
    for i in range(1, streets + 1):
        bet = min(remaining, frac * p)
        if i == streets and abs(bet - remaining) < 1e-8:
            bet = remaining
        remaining = max(0.0, remaining - bet)
        p_after = p + 2.0 * bet
        out.append(StreetStep(i, p, bet, p_after, remaining))
        p = p_after
    return out


def nearest_anchor(spr: float, streets: int) -> tuple[float, float]:
    anchors = {
        2: (1.0, 1.5, 2.0, 3.0, 4.0),
        3: (2.0, 3.0, 4.0, 5.0, 6.0),
    }
    pool: Iterable[float] = anchors.get(streets, ())
    vals = list(pool)
    if not vals:
        raise ValueError("anchors are defined only for 2 or 3 streets")
    a = min(vals, key=lambda x: abs(x - spr))
    return a, geometric_bet_percent(a, streets)
