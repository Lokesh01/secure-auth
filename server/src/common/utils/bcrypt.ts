import bcrypt from 'bcrypt';

export const hashValue = async (
  value: string,
  saltRounds: number = 10
): Promise<string> => await bcrypt.hash(value, saltRounds);

export const comparePassword = async (
  value: string,
  hashedValue: string
): Promise<boolean> => await bcrypt.compare(value, hashedValue);
