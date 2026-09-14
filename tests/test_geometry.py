import math

from geometry import (
    geometric_bet_fraction,
    geometric_bet_percent,
    spr_from_pot_stack,
    street_schedule,
)


def test_known_two_street_anchors():
    assert geometric_bet_percent(1.5, 2) == 50.0
    assert geometric_bet_percent(4.0, 2) == 100.0


def test_known_three_street_anchor():
    assert math.isclose(
        geometric_bet_percent(4.0, 3),
        54.004191152595205,
        rel_tol=1e-6,
    )


def test_schedule_ends_with_zero_stack():
    for streets in (2, 3):
        steps = street_schedule(10.0, 40.0, streets)
        assert math.isclose(steps[-1].stack_remaining, 0.0, abs_tol=1e-8)


def test_schedule_conserves_contributions():
    steps = street_schedule(10.0, 40.0, 3)
    assert math.isclose(sum(s.bet for s in steps), 40.0, abs_tol=1e-8)
    assert math.isclose(steps[-1].pot_after_call, 90.0, abs_tol=1e-8)


def test_spr():
    assert spr_from_pot_stack(8, 32) == 4


def test_invalid_inputs():
    import pytest

    with pytest.raises(ValueError):
        geometric_bet_fraction(-1, 2)
    with pytest.raises(ValueError):
        geometric_bet_fraction(1, 0)
    with pytest.raises(ValueError):
        spr_from_pot_stack(0, 10)
