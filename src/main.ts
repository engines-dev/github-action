import { appendFile } from 'node:fs/promises';
import { getExecOutput } from '@actions/exec';
import * as core from '@actions/core';
import { readFirstLine } from './util.js';

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const filePath = core.getInput('file_path');
    core.info(`Reading file at ${filePath} at ${core.getInput('pr_sha')}...`);
    const firstLine = await readFirstLine(filePath);
    core.info(`First line of file: ${firstLine}`);
    core.setOutput('file_path', filePath);

    const testRunCmd = core.getInput('test_run_cmd');
    core.info('Now, we verify that the tests currently run and pass');
    core.info(`Executing command: ${testRunCmd}`);
    try {
      const res = await getExecOutput(testRunCmd);
      core.info(`Test run output: ${res.stdout}`);
      core.info(`Test run error output: ${res.stderr}`);
    } catch (error) {
      // swallow error for now
      if (error instanceof Error) {
        core.warning(`Tests failed to run: ${error.message}`);
      }
    }

    core.info('We will now make an edit to the code');
    const edit = `This edit was made on ${new Date().toISOString()}.`;
    await appendFile(filePath, `\n${edit}`);
    core.setOutput('edit', edit);

    core.info('We will now verify the tests still pass after the edit');
    try {
      const res = await getExecOutput(testRunCmd);
      core.info(`Test run output: ${res.stdout}`);
      core.info(`Test run error output: ${res.stderr}`);
    } catch (error) {
      // swallow error for now
      if (error instanceof Error) {
        core.warning(`Tests failed to run: ${error.message}`);
      }
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message);
  }
}
