from typing import Literal, cast

from bracket.database import database
from bracket.models.db.round import StageWithRounds
from bracket.models.db.stage import Stage, StageCreateBody
from bracket.utils.types import dict_without_none


async def get_stages_with_rounds_and_matches(
    tournament_id: int,
    round_id: int | None = None,
    stage_id: int | None = None,
    *,
    no_draft_rounds: bool = False,
) -> list[StageWithRounds]:
    draft_filter = 'AND rounds.is_draft IS FALSE' if no_draft_rounds else ''
    round_filter = 'AND rounds.id = :round_id' if round_id is not None else ''
    stage_filter = 'AND stages.id = :stage_id' if stage_id is not None else ''
    query = f'''
        WITH teams_with_players AS (
            SELECT DISTINCT ON (teams.id)
                teams.*,
                to_json(array_remove(array_agg(p), NULL)) as players,
                (
                    SELECT COALESCE(avg(swiss_score), 0.0)
                    FROM players
                ) AS swiss_score,
                (
                    SELECT COALESCE(avg(elo_score), 0.0)
                    FROM players
                ) AS elo_score
            FROM teams
            LEFT JOIN players_x_teams pt on pt.team_id = teams.id
            LEFT JOIN players p on pt.player_id = p.id
            WHERE teams.tournament_id = :tournament_id
            GROUP BY teams.id
        ), matches_with_teams AS (
            SELECT DISTINCT ON (matches.id)
                matches.*,
                to_json(t1) as team1,
                to_json(t2) as team2,
                to_json(c) as court
            FROM matches
            LEFT JOIN teams_with_players t1 on t1.id = matches.team1_id
            LEFT JOIN teams_with_players t2 on t2.id = matches.team2_id
            LEFT JOIN rounds r on matches.round_id = r.id
            LEFT JOIN stages s2 on r.stage_id = s2.id
            LEFT JOIN courts c on matches.court_id = c.id
            WHERE s2.tournament_id = :tournament_id
        ), rounds_with_matches AS (
            SELECT DISTINCT ON (rounds.id)
                rounds.*,
                to_json(array_agg(m.*)) AS matches
            FROM rounds
            LEFT JOIN matches_with_teams m on m.round_id = rounds.id
            LEFT JOIN stages s2 on rounds.stage_id = s2.id
            WHERE s2.tournament_id = :tournament_id
            {draft_filter}
            {round_filter}
            GROUP BY rounds.id
        )
        SELECT stages.*, to_json(array_agg(r.*)) AS rounds FROM stages
        LEFT JOIN rounds_with_matches r on stages.id = r.stage_id
        WHERE stages.tournament_id = :tournament_id
        {stage_filter}
        GROUP BY stages.id
    '''
    values = dict_without_none(
        {'tournament_id': tournament_id, 'round_id': round_id, 'stage_id': stage_id}
    )
    result = await database.fetch_all(query=query, values=values)
    return [StageWithRounds.parse_obj(x._mapping) for x in result]


async def sql_delete_stage(tournament_id: int, stage_id: int) -> None:
    query = '''
        DELETE FROM stages
        WHERE stages.id = :stage_id
        AND stages.tournament_id = :tournament_id
        '''
    await database.fetch_one(
        query=query, values={'stage_id': stage_id, 'tournament_id': tournament_id}
    )


async def sql_create_stage(stage: StageCreateBody, tournament_id: int) -> Stage:
    async with database.transaction():
        query = '''
            INSERT INTO stages (type, created, is_active, tournament_id)
            VALUES (:stage_type, NOW(), false, :tournament_id)
            RETURNING *
            '''
        result = await database.fetch_one(
            query=query, values={'stage_type': stage.type.value, 'tournament_id': tournament_id}
        )

    if result is None:
        raise ValueError('Could not create stage')

    return Stage.parse_obj(result._mapping)


async def get_next_stage_in_tournament(
    tournament_id: int, direction: Literal['next', 'previous']
) -> int | None:
    select_query = '''
        SELECT id
        FROM stages
        WHERE
            CASE WHEN :direction='next'
            THEN (
                id > COALESCE(
                    (
                        SELECT id FROM stages AS t
                        WHERE is_active IS TRUE
                        AND stages.tournament_id = :tournament_id
                        ORDER BY id ASC
                        LIMIT 1
                    ),
                    10000000000000
                )
            )
            ELSE (
                id < COALESCE(
                    (
                        SELECT id FROM stages AS t
                        WHERE is_active IS TRUE
                        AND stages.tournament_id = :tournament_id
                        ORDER BY id DESC
                        LIMIT 1
                    ),
                    -1
                )
            )
            END
        AND stages.tournament_id = :tournament_id
        AND is_active IS FALSE
    '''
    return cast(
        int | None,
        await database.execute(
            query=select_query,
            values={'tournament_id': tournament_id, 'direction': direction},
        ),
    )


async def sql_activate_next_stage(new_active_stage_id: int, tournament_id: int) -> None:
    update_query = '''
        UPDATE stages
        SET is_active = (stages.id = :new_active_stage_id)
        WHERE stages.tournament_id = :tournament_id

    '''
    await database.execute(
        query=update_query,
        values={'tournament_id': tournament_id, 'new_active_stage_id': new_active_stage_id},
    )
