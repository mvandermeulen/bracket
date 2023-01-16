import {
  Badge,
  Center,
  Grid,
  Tooltip,
  UnstyledButton,
  createStyles,
  useMantineTheme,
} from '@mantine/core';
import { Property } from 'csstype';
import React, { useState } from 'react';
import { SWRResponse } from 'swr';

import { MatchInterface } from '../../interfaces/match';
import { TournamentMinimal } from '../../interfaces/tournament';
import MatchModal from '../modals/match_modal';

import Visibility = Property.Visibility;

const useStyles = createStyles((theme) => ({
  root: {
    width: '100%',
    marginTop: '30px',
  },
  divider: {
    backgroundColor: 'darkgray',
    height: '1px',
  },
  top: {
    // subscribe to color scheme changes right in your styles
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2],
    padding: '8px 8px 8px 15px',
    borderRadius: '8px 8px 0px 0px',
  },
  bottom: {
    // subscribe to color scheme changes right in your styles
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[2],
    padding: '8px 8px 8px 15px',
    borderRadius: '0px 0px 8px 8px',
  },
}));

function MatchBadge({ match }: { match: MatchInterface }) {
  const visibility: Visibility = match.label === '' ? 'hidden' : 'visible';
  return (
    <Center style={{ transform: 'translateY(50%)', visibility }}>
      <Badge size="lg" variant="filled">
        {match.label}
      </Badge>
    </Center>
  );
}

export default function Match({
  swrRoundsResponse,
  swrUpcomingMatchesResponse,
  tournamentData,
  match,
  readOnly,
}: {
  swrRoundsResponse: SWRResponse;
  swrUpcomingMatchesResponse: SWRResponse | null;
  tournamentData: TournamentMinimal;
  match: MatchInterface;
  readOnly: boolean;
}) {
  const { classes } = useStyles();
  const theme = useMantineTheme();
  const winner_style = {
    backgroundColor: theme.colorScheme === 'dark' ? theme.colors.green[9] : theme.colors.green[4],
  };
  const team1_style = match.team1_score > match.team2_score ? winner_style : {};
  const team2_style = match.team1_score < match.team2_score ? winner_style : {};

  const team1_players = match.team1.players.map((player) => player.name).join(', ');
  const team2_players = match.team2.players.map((player) => player.name).join(', ');

  const team1_players_label = team1_players === '' ? 'No players' : team1_players;
  const team2_players_label = team2_players === '' ? 'No players' : team2_players;

  const [opened, setOpened] = useState(false);

  const bracket = (
    <>
      <MatchBadge match={match} />
      <div className={classes.top} style={team1_style}>
        <Tooltip label={team1_players_label} withArrow color="blue">
          <Grid grow>
            <Grid.Col span={10}>{match.team1.name}</Grid.Col>
            <Grid.Col span={2}>{match.team1_score}</Grid.Col>
          </Grid>
        </Tooltip>
      </div>
      <div className={classes.divider} />
      <div className={classes.bottom} style={team2_style}>
        <Tooltip label={team2_players_label} position="bottom" withArrow color="blue">
          <Grid grow>
            <Grid.Col span={10}>{match.team2.name}</Grid.Col>
            <Grid.Col span={2}>{match.team2_score}</Grid.Col>
          </Grid>
        </Tooltip>
      </div>
      <MatchModal
        swrRoundsResponse={swrRoundsResponse}
        swrUpcomingMatchesResponse={swrUpcomingMatchesResponse}
        tournamentData={tournamentData}
        match={match}
        opened={opened}
        setOpened={setOpened}
      />
    </>
  );

  if (readOnly) {
    return <div className={classes.root}>{bracket}</div>;
  }

  return (
    <UnstyledButton className={classes.root} onClick={() => setOpened(!opened)}>
      {bracket}
    </UnstyledButton>
  );
}