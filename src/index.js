//!/usr/bin/env node

import chalk from 'chalk';
import chalkAnimations from 'chalk-animation';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import { createSpinner } from 'nanospinner';
import fs from 'fs';
import { promisify } from 'util';
import figlet from 'figlet';
import gradient from 'gradient-string';
import { readdir } from 'fs/promises';

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

const greetings = async (
  name = 'Git Frameworker',
  description = 'Easy way to create a project from a git repo\n'
) => {
  console.clear();
  figlet(name, (err, data) => {
    console.log(gradient.cristal.multiline(data));
  });

  await sleep(300);

  console.log(chalk.cyan(`  ${description}`));

  await sleep(300);
};

const finalMessage = () => {
  chalkAnimations
    .rainbow(`\nProject '${projectName}' created successfully\n`)
    .start();

  console.log(
    `To start working on your project run:
      ${chalk.cyan(`cd ${projectName}`)}\n`
  );
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
  } catch (err) {
    spinner.error({ text: `Error creating project\n${err}` });
    process.exit(1);
  }

  spinner.success({
    text: `Project ${chalk.cyan(projectName)} created successfully`
  });
};

const repoHasFrameworkConfig = async () => {
  const spinner = createSpinner(
    'Checking if repo has framework config...'
  ).start();

  try {
    const files = await readdir('.git-repo-temp');
    const result = files.includes('framework.json');

    if (result) {
      spinner.success({ text: 'Found framework config' });
    } else {
      spinner.warn({ text: 'Repo does not have framework config' });
    }

    return result;
  } catch (e) {
    spinner.error({
      text: `Error checking if repo has framework config\n${e}`
    });
    process.exit(1);
  }
};

const parseConfig = async () => {
  const spinner = createSpinner('Parsing framework config...').start();

  try {
    await sleep(300);

    const configContent = await fs.promises.readFile(
      '.git-repo-temp/framework.json',
      'utf-8'
    );

    const config = JSON.parse(configContent);
    spinner.success({ text: 'Parsed framework config' });
    return config;
  } catch (e) {
    spinner.error({ text: `Error parsing framework config\n${e}` });
    process.exit(1);
  }
};

const inquiryCli = async (config) => {
  const { frameworkName, frameworkDescription, questions } = config;

  console.clear();
  await greetings(frameworkName, frameworkDescription);
  console.log('');

  let answers = [];

  for (let question of questions) {
    const { name, type, message, choices, isPartial } = question;

    const answer = await inquirer.prompt({
      name,
      type,
      message,
      choices
    });

    answers.push({ name, answer: answer[name], type, isPartial });
  }

  const partials = answers.filter((answer) => answer.isPartial);
  const fulls = answers.filter((answer) => !answer.isPartial);

  const templateDir = fulls
    .filter((f) => f.type !== 'input')
    .map((f) => f.name + ':' + f.answer.toString())
    .join('_')
    .toLowerCase();

  return { partials, templateDir };
};

const buildProject = async (config) => {
  const { partials, templateDir } = await inquiryCli(config);

  const spinner = createSpinner('Building project...').start();
  try {
    await cpAsync('.git-repo-temp/templates/' + templateDir, projectName, {
      recursive: true
    });

    for (let partial of partials) {
      if (partial.type === 'list' || partial.type === 'confirm') {
        if (partial.type === 'confirm' && partial.answer) {
          await cpAsync(
            '.git-repo-temp/partials/' + partial.name,
            projectName,
            {
              recursive: true
            }
          );
        } else if (partial.type === 'list') {
          await cpAsync(
            '.git-repo-temp/partials/' +
              partial.name +
              ':' +
              partial.answer.toString().toLowerCase(),
            projectName,
            {
              recursive: true
            }
          );
        }
      }
    }

    spinner.success({ text: 'Project built successfully' });
  } catch (e) {
    spinner.error({ text: `Error building project\n${e}` });
    process.exit(1);
  }
};

async function main() {
  await greetings();
  await getRepo();
  await createProject();

  let hasFrameworkConfig = await repoHasFrameworkConfig();
  if (hasFrameworkConfig) {
    const config = await parseConfig();
    await buildProject(config);
  } else {
    await cpAsync('.git-repo-temp', projectName, { recursive: true });
  }

  await clean(process.argv[2] === '--clean');
  finalMessage();
}

await main();
