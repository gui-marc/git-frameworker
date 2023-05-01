//!/usr/bin/env node

import chalk from 'chalk';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { createSpinner } from 'nanospinner';
import fs from 'fs';
import { promisify } from 'util';
import figlet from 'figlet';
import gradient from 'gradient-string';

const execAsync = promisify(exec);
const rmAsync = promisify(fs.rm);
const mkdirAsync = promisify(fs.mkdir);
const cpAsync = promisify(fs.cp);

let projectName = 'new-project';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const clean = async (removeProject = false) => {
  const spinner = createSpinner('Cleaning up...').start();

  try {
    await rmAsync('.git-repo-temp', { recursive: true });

    if (removeProject) {
      await rmAsync(projectName, { recursive: true, force: true });
    }
  } catch (e) {
    spinner.error({ text: `Error cleaning up\n${e}` });
    process.exit(1);
  }

  spinner.success({ text: 'Cleaned up successfully' });
};

const greetings = async () => {
  console.clear();
  figlet('Git Frameworker', (err, data) => {
    console.log(gradient.cristal.multiline(data));
  });

  await sleep(300);

  console.log(chalk.cyan('  Easy way to create a project from a git repo\n'));

  await sleep(300);
};

const getRepo = async () => {
  const { repo } = await inquirer.prompt({
    name: 'repo',
    type: 'input',
    message: 'Enter the repo url (ssh or https): '
  });

  const spinner = createSpinner(
    'Clonning repo to your local machine...'
  ).start();

  try {
    await execAsync(`git clone --depth=1 --branch=main ${repo} .git-repo-temp`);
  } catch (err) {
    spinner.error({ text: `Error cloning repo\n${err}` });
    process.exit(1);
  }

  await sleep(1000); // Just to make it look cool

  try {
    await rmAsync('.git-repo-temp/.git', { recursive: true });
  } catch (e) {
    spinner.error({ text: `Error removing .git\n${e}` });
    process.exit(1);
  }

  spinner.success({ text: 'Repo cloned successfully' });
};

const createProject = async () => {
  const { name } = await inquirer.prompt({
    name: 'name',
    type: 'input',
    message: 'Enter the project name: ',
    default() {
      return projectName;
    }
  });

  projectName = name;

  const spinner = createSpinner('Creating project...').start();

  await sleep(1000);

  try {
    await mkdirAsync(projectName);
    await cpAsync(
      process.cwd() + '/.git-repo-temp',
      process.cwd() + '/' + projectName,
      { recursive: true }
    );
  } catch (err) {
    spinner.error({ text: `Error creating project\n${err}` });
    process.exit(1);
  }

  spinner.success({
    text: `Project ${chalk.cyan(projectName)} created successfully`
  });
};

await greetings();
await getRepo();
await createProject();
await clean(process.argv[2] === '--clean');
