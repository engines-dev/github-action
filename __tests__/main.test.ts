/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core.js';

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core);

// Mock node:fs and node:readline modules
const mockReadStream = {
  on: jest.fn(),
};

const mockInterface = {
  [Symbol.asyncIterator]: jest.fn().mockImplementation(function* () {
    yield 'First line of test file';
  }),
};

const mockFs = {
  createReadStream: jest.fn().mockReturnValue(mockReadStream),
};

const mockReadline = {
  createInterface: jest.fn().mockReturnValue(mockInterface),
};

jest.unstable_mockModule('node:fs', () => mockFs);
jest.unstable_mockModule('node:readline', () => mockReadline);

// Mock @actions/exec module
const mockExecOutput = {
  stdout: 'Test succeeded',
  stderr: '',
  exitCode: 0,
};

const mockExec = {
  exec: jest.fn<() => Promise<number>>().mockResolvedValue(0),
  getExecOutput: jest
    .fn<() => Promise<typeof mockExecOutput>>()
    .mockResolvedValue(mockExecOutput),
};

jest.unstable_mockModule('@actions/exec', () => mockExec);

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js');

describe('main.ts', () => {
  beforeEach(() => {
    // Set the action's inputs as return values from core.getInput()
    core.getInput.mockImplementation((name) => {
      if (name === 'file_path') return 'test-file.txt';
      if (name === 'pr_sha') return 'test-sha-123';
      if (name === 'test_run_cmd') return 'npm test';
      return '';
    });

    // Reset date to a known value
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.useRealTimers();
  });

  it('Processes file and runs tests', async () => {
    await run();

    // Verify file_path output was set
    expect(core.setOutput).toHaveBeenCalledWith('file_path', 'test-file.txt');

    // Verify reading first line
    expect(mockFs.createReadStream).toHaveBeenCalledWith('test-file.txt');
    expect(mockReadline.createInterface).toHaveBeenCalled();

    // Verify test commands executed
    expect(mockExec.getExecOutput).toHaveBeenCalledWith('npm test');

    // Verify file edit
    const expectedEdit = 'This edit was made on 2025-01-01T00:00:00.000Z.';
    expect(mockExec.exec).toHaveBeenCalledWith(
      `echo '${expectedEdit}' >> test-file.txt`,
    );
    expect(core.setOutput).toHaveBeenCalledWith('edit', expectedEdit);
  });

  it('Sets a failed status if an error occurs', async () => {
    // Make the createReadStream throw an error
    const mockError = new Error('File not found');
    mockFs.createReadStream.mockImplementationOnce(() => {
      throw mockError;
    });

    await run();

    // Verify that the action was marked as failed
    expect(core.setFailed).toHaveBeenCalledWith('File not found');
  });
});
