import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import { randomUUID } from 'crypto';
import parseParams from './parse-params.js';
import * as bitbucketModule from 'bitbucket';
import { simpleGit } from 'simple-git';

const clearDir = async (dir) => {
  try {
    await promisify(exec)(`rm -rf ${dir}`);
  } catch (e) {
    console.error(`Failed to remove repository directory: ${e.message}`);
  }
}

const initGit = (path) => {
  const options = {
    baseDir: path,
    binary: 'git',
    maxConcurrentProcesses: 6,
    trimmed: false,
  };
  return simpleGit(options);
}

const main = async () => {

  const params = await parseParams();

  // First clear destination directory and clone repository
  const dir = 'repo';
  await clearDir(dir);

  try {
    await initGit(process.cwd()).clone(`git@bitbucket.org:${params.repo}.git`, dir);
  } catch (e) {
    console.error(`Git cloning is failed: ${e.message}`);
    await clearDir(dir);
    return;
  }

  // Check if package.json file is exists, if yes read it, if no create new one with empty dependencies
  let pkg = {
      dependencies: {}
    },
    fileExists = true;
  try {
    await promisify(fs.access)(`${dir}/package.json`);
  } catch (e) {
    fileExists = false;
  }
  if (fileExists) {
    try {
      const json = (await promisify(fs.readFile)(`${dir}/package.json`)).toString();
      pkg = JSON.parse(json);
    } catch (e) {
      console.error(`package.json file can't be read or contains bad json: ${e.message}`);
      await clearDir(dir);
      return;
    }
  }

  if (pkg.dependencies[params.pkgName] === params.pkgVersion) {
    console.log(`Package ${params.pkgName} with version ${params.pkgVersion} already exists in package.json`);
    await clearDir(dir);
    return;
  }

  pkg.dependencies[params.pkgName] = params.pkgVersion;
  fs.writeFileSync(`${dir}/package.json`, JSON.stringify(pkg, null, 2));

  // Create unique branch name, commit and push changes
  try {
    const id = randomUUID().replace(/-/g, ''),
      pkgVersion = params.pkgVersion.replace(/\./g, '-').replace(/[^0-9\-]/g, ''),
      branchName = `pkg-add-${params.pkgName}-${pkgVersion}-${id}`,
      commitMessage = `Package added ${params.pkgName} ${params.pkgVersion}`,
      git = initGit(`${process.cwd()}/${dir}`);

    await git.checkoutLocalBranch(branchName)
      .add('./*')
      .commit(commitMessage)
      .push('origin', branchName);
  } catch (e) {
    console.error(`Git branching and pushing is failed: ${e.message}`);
    await clearDir(dir);
    return;
  }

  // Creating pull request in bitbucket
  const clientOptions = {
    auth: {}
  };
  if (params.token) {
    clientOptions.auth.token = params.token;
  } else {
    clientOptions.auth.username = params.username;
    clientOptions.auth.password = params.password;
  }

  const bitbucket = new bitbucketModule.default.Bitbucket(clientOptions),
    repositoryData = params.repo.split('/');

  try {
    await bitbucket.pullrequests.create({
      _body: {
        title: commitMessage,
        description: `Package ${params.pkgName} ${params.pkgVersion} added`,
        source: {
          branch: {
            name: branchName,
          }
        },
      },
      repo_slug: repositoryData[1],
      workspace: repositoryData[0],
    })
    console.log('Everything is done!');
  } catch (e) {
    console.error(`Pull request creation failed: ${e.message}`);
  }
  await clearDir(dir);

}

main();
