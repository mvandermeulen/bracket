from heliclockter import datetime_utc
from pydantic import Field

from bracket.models.db.shared import BaseModelORM


class Tournament(BaseModelORM):
    id: int | None = None
    club_id: int
    name: str
    created: datetime_utc
    start_time: datetime_utc
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)
    dashboard_public: bool
    dashboard_endpoint: str | None
    logo_path: str | None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool


class TournamentUpdateBody(BaseModelORM):
    start_time: datetime_utc
    name: str
    dashboard_public: bool
    dashboard_endpoint: str | None
    players_can_be_in_multiple_teams: bool
    auto_assign_courts: bool
    duration_minutes: int = Field(..., ge=1)
    margin_minutes: int = Field(..., ge=0)


class TournamentBody(TournamentUpdateBody):
    club_id: int


class TournamentToInsert(TournamentBody):
    created: datetime_utc
