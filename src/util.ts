import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';

/**
 * Reads the first line of a file.
 *
 * @param filePath The path to the file to read
 * @returns The first line of the file, or an empty string if the file is empty
 */
export async function readFirstLine(filePath: string): Promise<string> {
  const fileStream = createReadStream(filePath);

  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    return line;
  }

  // Default return in case the file is empty
  return '';
}
