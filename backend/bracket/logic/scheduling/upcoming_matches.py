from fastapi import HTTPException

from bracket.logic.scheduling.ladder_teams import get_possible_upcoming_matches_for_swiss
from bracket.models.db.match import MatchFilter, SuggestedMatch
from bracket.models.db.round import Round
from bracket.models.db.stage_item import StageType
from bracket.sql.rounds import get_rounds_for_stage_item
from bracket.sql.stages import get_full_tournament_details
from bracket.sql.teams import get_teams_with_members
from bracket.utils.types import assert_some


async def get_upcoming_matches_for_swiss_round(
    match_filter: MatchFilter, round_: Round, tournament_id: int
) -> list[SuggestedMatch]:
    [stage] = await get_full_tournament_details(tournament_id, stage_item_id=round_.stage_item_id)
    assert len(stage.stage_items) == 1
    [stage_item] = stage.stage_items

    if stage_item.type is not StageType.SWISS:
        raise HTTPException(400, 'There is no draft round, so no matches can be scheduled.')

    rounds = await get_rounds_for_stage_item(tournament_id, assert_some(stage_item.id))
    teams = await get_teams_with_members(tournament_id, only_active_teams=True)

    return get_possible_upcoming_matches_for_swiss(match_filter, rounds, teams)
