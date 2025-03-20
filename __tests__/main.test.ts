/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * To mock dependencies in ESM, you can create fixtures that export mock
 * functions and objects. For example, the core module is mocked in this test,
 * so that the actual '@actions/core' module is not imported.
 */
import { jest } from '@jest/globals';
import * as core from '../__fixtures__/core.js';
import * as exec from '../__fixtures__/exec.js';
import * as fsPromises from '../__fixtures__/fs-promises.js';

// Mocks should be declared before the module being tested is imported.
jest.unstable_mockModule('@actions/core', () => core);
jest.unstable_mockModule('@actions/exec', () => exec);
jest.unstable_mockModule('node:fs/promises', () => fsPromises);

// Mock the util module
const mockUtil = {
  readFirstLine: jest
    .fn<(filePath: string) => Promise<string>>()
    .mockResolvedValue('First line of test file'),
};
jest.unstable_mockModule('../src/util.js', () => mockUtil);

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

    // Set the exec output mock value
    exec.getExecOutput.mockResolvedValue({
      stdout: 'Test succeeded',
      stderr: '',
      exitCode: 0,
    });

    // Reset date to a known value
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('Processes file, runs tests, makes edit, and runs tests again', async () => {
    await run();

    expect(core.setOutput).toHaveBeenCalledWith('file_path', 'test-file.txt');
    expect(mockUtil.readFirstLine).toHaveBeenCalledWith('test-file.txt');
    expect(exec.getExecOutput).toHaveBeenNthCalledWith(1, 'npm test');

    const expectedEdit = 'This edit was made on 2025-01-01T00:00:00.000Z.';
    expect(fsPromises.appendFile).toHaveBeenCalledWith(
      'test-file.txt',
      `\n${expectedEdit}`,
    );
    expect(core.setOutput).toHaveBeenCalledWith('edit', expectedEdit);

    expect(exec.getExecOutput).toHaveBeenCalledTimes(2);
    expect(exec.getExecOutput).toHaveBeenNthCalledWith(2, 'npm test');
  });

  it('Sets a failed status if an error occurs', async () => {
    // Make readFirstLine throw an error
    mockUtil.readFirstLine.mockRejectedValueOnce(new Error('File not found'));

    await run();

    expect(core.setFailed).toHaveBeenCalledWith('File not found');
  });

  it('Displays warning when first test execution fails', async () => {
    // Make first test execution throw an error
    exec.getExecOutput.mockRejectedValueOnce(new Error('Test command failed'));

    await run();

    expect(core.warning).toHaveBeenCalledWith(
      'Tests failed to run: Test command failed',
    );

    const expectedEdit = 'This edit was made on 2025-01-01T00:00:00.000Z.';
    expect(fsPromises.appendFile).toHaveBeenCalledWith(
      'test-file.txt',
      `\n${expectedEdit}`,
    );

    expect(exec.getExecOutput).toHaveBeenCalledTimes(2);
  });

  it('Displays warning when second test execution fails', async () => {
    // Make second test execution throw an error
    exec.getExecOutput
      .mockResolvedValueOnce({
        stdout: 'Test succeeded',
        stderr: '',
        exitCode: 0,
      })
      .mockRejectedValueOnce(new Error('Test command failed after edit'));

    await run();

    expect(core.warning).toHaveBeenCalledWith(
      'Tests failed to run: Test command failed after edit',
    );

    const expectedEdit = 'This edit was made on 2025-01-01T00:00:00.000Z.';
    expect(fsPromises.appendFile).toHaveBeenCalledWith(
      'test-file.txt',
      `\n${expectedEdit}`,
    );
  });
});
