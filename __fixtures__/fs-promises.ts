import { jest } from '@jest/globals';

export const appendFile = jest
  .fn<(path: string, data: string) => Promise<void>>()
  .mockResolvedValue(undefined);
