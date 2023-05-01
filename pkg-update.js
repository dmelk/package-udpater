import fetch from 'node-fetch';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import yargs from "yargs/yargs";
import { hideBin } from 'yargs/helpers';
import { randomUUID } from 'crypto';

const argv = yargs(hideBin(process.argv)).argv;

const clearDir = async (dir) => {
  try {
    await promisify(exec)(`rm -rf ${dir}`);
  } catch (e) {
    console.error(`Failed to remove repository directory: ${e.message}`);
  }
}

(async () => {

  // Check if all required arguments are passed
  const requiredParams = ['repo', 'pkgName', 'pkgVersion', 'token'];
  let allParamsPassed = true;
  for (const param of requiredParams) {
    if (typeof argv[param] === 'undefined') {
      console.error(`Argument ${param} is required`);
      allParamsPassed = false;
    }
  }
  if (!allParamsPassed) {
    return;
  }

  // First clear destination directory and clone repository
  const dir = 'repo';
  await clearDir(dir);

  try {
    await promisify(exec)(`git clone git@bitbucket.org:${argv.repo}.git ${dir}`);
  } catch (e) {
    console.error(`Git cloning is failed: ${e.message}`);
    return;
  }

  // Check if package.json file is exists, if yes read it, if no create new one with empty dependencies
  let pkg = {
    dependencies: {}
  }, fileExists = true;
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

  if (pkg.dependencies[argv.pkgName] === argv.pkgVersion) {
    console.log(`Package ${argv.pkgName} with version ${argv.pkgVersion} already exists in package.json`);
    await clearDir(dir);
    return;
  }

  pkg.dependencies[argv.pkgName] = argv.pkgVersion;
  fs.writeFileSync(`${dir}/package.json`, JSON.stringify(pkg, null, 2));

  const id = randomUUID().replace(/-/g, ''),
    pkgVersion = argv.pkgVersion.replace(/\./g, '-').replace(/[^0-9\-]/g, ''),
    branchName = `pkg-add-${argv.pkgName}-${pkgVersion}-${id}`,
    commitMessage = `Package added ${argv.pkgName} ${argv.pkgVersion}`;

  try {
    await promisify(exec)(`cd ${dir} && git checkout -b ${branchName} && git add . && git commit -m "${commitMessage}" && git push origin ${branchName}`);
  } catch (e) {
    console.error(`Git branching and pushing is failed: ${e.message}`);
    await clearDir(dir);
    return;
  }

  fetch(
    `https://api.bitbucket.org/2.0/repositories/${argv.repo}/pullrequests`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${argv.token}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        title: commitMessage,
        description: `Package ${argv.pkgName} ${argv.pkgVersion} added`,
        source: {
          branch: {
            name: branchName,
          }
        },
      }),
    }
  ).then(async (response) => {
    await clearDir(dir);
    console.log('Everything is done!');
  }).catch(async (e) => {
    await clearDir(dir);
    console.error(`Pull request creation failed: ${e.message}`);
  });

})();
