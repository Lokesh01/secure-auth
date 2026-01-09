import { add } from 'date-fns';

export const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

export const thirtyDaysFromNow = (): Date =>
  new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
export const fortyFiveMinutesFromNow = (): Date => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 45);
  return now;
};

export const tenMinutesAgo = (): Date => new Date(Date.now() - 10 * 60 * 1000);

export const threeMinutesAgo = (): Date => new Date(Date.now() - 3 * 60 * 1000);

export const anHourFromNow = (): Date => new Date(Date.now() + 60 * 60 * 1000);

export const calculateExpirationDate = (expiresIn: string = '15m'): Date => {
  // Match number + unit (m = minutes, h = hours, d = days)
  const match = expiresIn.match(/^(\d+)([mhd])$/);
  if (!match) throw Error('Invalid format. Use "15m", "1h", or "2d".');

  const [, value, unit] = match; //match = ['15m', '15', 'm']; => value='15', unit='m'
  const expirationDate = new Date();

  //check the unit and apply accordingly
  switch (unit) {
    case 'm':
      return add(expirationDate, { minutes: parseInt(value) });
    case 'h':
      return add(expirationDate, { hours: parseInt(value) });
    case 'd':
      return add(expirationDate, { days: parseInt(value) });
    default:
      throw Error('Invalid time unit. Use "m", "h", or "d".');
  }
};
