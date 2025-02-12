import { useRouter } from 'next/router';
import { SWRResponse } from 'swr';

export function getItemColor(theme: any) {
  const darkTheme = theme.colorScheme === 'dark';
  return darkTheme ? theme.colors.dark[4] : theme.colors.gray[2];
}

function getTodayAtMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function getDefaultTimeRange(selectMultipleDates: boolean) {
  const maxDate = getTodayAtMidnight();
  const minDate = getTodayAtMidnight();

  let offset = 1;
  if (minDate.getDay() === 0) {
    offset = 2;
  } else if (minDate.getDay() === 1) {
    offset = 3;
  }

  minDate.setDate(minDate.getDate() - offset);

  if (!selectMultipleDates) {
    maxDate.setDate(minDate.getDate());
  }

  return [minDate, maxDate];
}

export function onlyUnique(value: any, index: number, self: any) {
  return self.indexOf(value) === index;
}

export function getTournamentIdFromRouter() {
  const router = useRouter();
  const { id: idString }: any = router.query;
  const id = parseInt(idString, 10);
  const tournamentData = { id };
  return { id, tournamentData };
}

export function getTournamentEndpointFromRouter() {
  const router = useRouter();
  const { id }: any = router.query;
  return id;
}

export function responseIsValid(response: SWRResponse | null) {
  return response != null && response.data != null && response.data.data != null;
}

export function getBaseURL() {
  return typeof window !== 'undefined' && window.location.origin ? window.location.origin : '';
}

export const groupBy = (keys: any) => (array: any) =>
  array.reduce((objectsByKeyValue: any, obj: any) => {
    const value = keys.map((key: any) => obj[key]).join('-');
    // eslint-disable-next-line no-param-reassign
    objectsByKeyValue[value] = (objectsByKeyValue[value] || []).concat(obj);
    return objectsByKeyValue;
  }, {});

export function truncateString(input: string, length: number) {
  if (input.length > length + 3) {
    return `${input.slice(0, length)}...`;
  }
  return input;
}
