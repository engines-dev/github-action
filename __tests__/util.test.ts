/**
 * Unit tests for utility functions, src/util.ts
 */
import { jest } from '@jest/globals';

// Mock the node:fs and node:readline modules
const mockReadStream = {
  on: jest.fn(),
};

const mockFs = {
  createReadStream: jest.fn().mockReturnValue(mockReadStream),
};

// Mock implementation for readline's createInterface
let mockLines: string[] = [];

const mockInterface = {
  [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
    yield* mockLines;
  }),
};

const mockReadline = {
  createInterface: jest.fn().mockReturnValue(mockInterface),
};

jest.unstable_mockModule('node:fs', () => mockFs);
jest.unstable_mockModule('node:readline', () => mockReadline);

// Import the module after mocks are set up
const { readFirstLine } = await import('../src/util.js');

describe('util.ts', () => {
  beforeEach(() => {
    // Default implementation returns one line
    mockLines = ['First line of test file'];
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reads the first line of a file', async () => {
    const result = await readFirstLine('test-file.txt');

    // Verify file is opened correctly
    expect(mockFs.createReadStream).toHaveBeenCalledWith('test-file.txt');
    expect(mockReadline.createInterface).toHaveBeenCalledWith({
      input: mockReadStream,
      crlfDelay: Infinity,
    });

    // Verify result is the first line
    expect(result).toBe('First line of test file');
  });

  it('returns empty string for empty file', async () => {
    // Setup mock to simulate an empty file
    mockLines = [];

    const result = await readFirstLine('empty-file.txt');

    // Verify file is opened correctly
    expect(mockFs.createReadStream).toHaveBeenCalledWith('empty-file.txt');

    // Verify result is empty string
    expect(result).toBe('');
  });

  it('returns only the first line for multi-line files', async () => {
    // Setup mock to simulate a multi-line file
    mockLines = [
      'First line of test file',
      'Second line that should be ignored',
      'Third line that should be ignored',
    ];

    const result = await readFirstLine('multi-line-file.txt');

    // Verify result is only the first line
    expect(result).toBe('First line of test file');
  });

  it('throws error if file cannot be read', async () => {
    // Setup mock to throw an error
    mockFs.createReadStream.mockImplementationOnce(() => {
      throw new Error('Cannot read file');
    });

    // Verify function throws the error
    await expect(readFirstLine('invalid-file.txt')).rejects.toThrow(
      'Cannot read file',
    );
  });
});
