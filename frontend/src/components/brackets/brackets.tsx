import { Alert, Button, Container, Grid, Group, Skeleton } from '@mantine/core';
import { GoPlus } from '@react-icons/all-files/go/GoPlus';
import { IconAlertCircle } from '@tabler/icons-react';
import React from 'react';
import { SWRResponse } from 'swr';

import { BracketDisplaySettings } from '../../interfaces/brackets';
import { RoundInterface } from '../../interfaces/round';
import { StageWithStageItems } from '../../interfaces/stage';
import { StageItemWithRounds, stageItemIsHandledAutomatically } from '../../interfaces/stage_item';
import { TournamentMinimal } from '../../interfaces/tournament';
import { createRound } from '../../services/round';
import ActivateNextRoundModal from '../modals/activate_next_round_modal';
import { responseIsValid } from '../utils/util';
import Round from './round';

function getRoundsGridCols(
  stageItem: StageItemWithRounds,
  tournamentData: TournamentMinimal,
  swrStagesResponse: SWRResponse,
  swrUpcomingMatchesResponse: SWRResponse | null,
  readOnly: boolean,
  displaySettings: BracketDisplaySettings
) {
  let rounds: React.JSX.Element[] | React.JSX.Element = stageItem.rounds
    .sort((r1: any, r2: any) => (r1.name > r2.name ? 1 : -1))
    .map((round: RoundInterface) => (
      <Round
        key={round.id}
        tournamentData={tournamentData}
        round={round}
        swrStagesResponse={swrStagesResponse}
        swrUpcomingMatchesResponse={swrUpcomingMatchesResponse}
        readOnly={readOnly}
        dynamicSchedule={!stageItemIsHandledAutomatically(stageItem)}
        displaySettings={displaySettings}
      />
    ));

  if (rounds.length < 1) {
    rounds = (
      <Alert icon={<IconAlertCircle size={16} />} title="No rounds" color="blue" radius="lg">
        There are no rounds in this stage item yet
      </Alert>
    );
  }

  const hideAddRoundButton =
    tournamentData == null || readOnly || stageItemIsHandledAutomatically(stageItem);

  return (
    <React.Fragment key={stageItem.id}>
      <div style={{ width: '100%' }}>
        <Grid grow>
          <Grid.Col span={6}>
            <h2>{stageItem.name}</h2>
          </Grid.Col>
          <Grid.Col span={6}>
            <Group justify="right">
              {hideAddRoundButton ? null : (
                <Button
                  color="green"
                  size="md"
                  leftSection={<GoPlus size={24} />}
                  variant="outline"
                  onClick={async () => {
                    await createRound(tournamentData.id, stageItem.id);
                    await swrStagesResponse.mutate();
                  }}
                >
                  Add Round
                </Button>
              )}
              {hideAddRoundButton ? null : (
                <ActivateNextRoundModal
                  tournamentId={tournamentData.id}
                  swrStagesResponse={swrStagesResponse}
                  stageItem={stageItem}
                />
              )}
            </Group>
          </Grid.Col>
        </Grid>
      </div>
      <Group>{rounds}</Group>
    </React.Fragment>
  );
}

function NoRoundsAlert({ readOnly }: { readOnly: boolean }) {
  if (readOnly) {
    return (
      <Alert icon={<IconAlertCircle size={16} />} title="No rounds found" color="blue" radius="lg">
        Please wait for the organiser to add them.
      </Alert>
    );
  }
  return (
    <Container>
      <Alert icon={<IconAlertCircle size={16} />} title="No rounds found" color="blue" radius="lg">
        There are no rounds in this stage yet
      </Alert>
    </Container>
  );
}

function NotStartedAlert() {
  return (
    <Container>
      <Alert
        icon={<IconAlertCircle size={16} />}
        title="Tournament has not started yet"
        color="blue"
        radius="lg"
      >
        Please wait for the tournament to start.
      </Alert>
    </Container>
  );
}

function LoadingSkeleton() {
  return (
    <Group>
      <div style={{ width: '400px', marginLeft: '1rem' }}>
        <Skeleton height={500} mb="xl" radius="xl" />
      </div>
      <div style={{ width: '400px', marginLeft: '1rem' }}>
        <Skeleton height={500} mb="xl" radius="xl" />
      </div>
    </Group>
  );
}

export default function Brackets({
  tournamentData,
  swrStagesResponse,
  swrUpcomingMatchesResponse,
  readOnly,
  selectedStageId,
  displaySettings,
}: {
  tournamentData: TournamentMinimal;
  swrStagesResponse: SWRResponse;
  swrUpcomingMatchesResponse: SWRResponse | null;
  readOnly: boolean;
  selectedStageId: string | null;
  displaySettings: BracketDisplaySettings;
}) {
  if (swrStagesResponse.isLoading) {
    return <LoadingSkeleton />;
  }
  if (selectedStageId == null) {
    return <NotStartedAlert />;
  }
  if (
    selectedStageId == null ||
    (!swrStagesResponse.isLoading && !responseIsValid(swrStagesResponse))
  ) {
    return <NoRoundsAlert readOnly={readOnly} />;
  }

  if (swrStagesResponse.isLoading) {
    return <LoadingSkeleton />;
  }

  const stages_map = Object.fromEntries(
    swrStagesResponse.data.data.map((x: StageWithStageItems) => [x.id, x])
  );
  const rounds = stages_map[selectedStageId].stage_items
    .sort((i1: StageItemWithRounds, i2: StageItemWithRounds) => (i1.name > i2.name ? 1 : -1))
    .map((stageItem: StageItemWithRounds) =>
      getRoundsGridCols(
        stageItem,
        tournamentData,
        swrStagesResponse,
        swrUpcomingMatchesResponse,
        readOnly,
        displaySettings
      )
    );

  if (rounds.length < 1) {
    return <NoRoundsAlert readOnly={readOnly} />;
  }

  return <div>{rounds}</div>;
}
