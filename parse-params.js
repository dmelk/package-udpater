import readlineSync from "readline-sync";
import {promisify} from "util";
import {exec} from "child_process";
import {hideBin} from "yargs/helpers";
import yargs from "yargs";

const checkParamValues = (params, paramNames) => {
  for (const param in paramNames) {
    while (params[param] === '') {
      const value = readlineSync.question(`Enter ${paramNames[param]}: `);
      if (value == '') {
        console.error('Value can\'t be empty');
      } else {
        params[param] = value;
      }
    }
  }
}

const parseParams = async () => {
  const params = {
    repo: '',
    pkgName: '',
    pkgVersion: '',
    token: '',
    username: '',
    password: '',
    gitEmail: '',
    gitName: '',
  };

  // Getting git config
  try {
    const res = await promisify(exec)(`git config --global --get user.name`);
    params.gitName = res.stdout.replace(/\n/g, '')
  } catch (e) {
    // do nothing
  }
  try {
    const res = await promisify(exec)(`git config --global --get user.email`);
    params.gitEmail = res.stdout.replace(/\n/g, '');
  } catch (e) {
    // do nothing
  }

  const argv = yargs(hideBin(process.argv)).argv;

  // Check if arguments are passed
  const requiredParams = ['repo', 'pkgName', 'pkgVersion', 'token'];
  for (const param of requiredParams) {
    if (typeof argv[param] !== 'undefined') {
      params[param] = argv[param];
    }
  }

  // If not, ask user to enter them
  const gitArgs = {
    gitEmail: {
      label: 'git user email',
      name: 'user.email',
    },
    gitName: {
      label: 'git user name',
      name: 'user.name',
    },
  };
  for (const param in gitArgs) {
    while (params[param] === '') {
      const value = readlineSync.question(`Enter ${gitArgs[param].label}: `);
      if (value == '') {
        console.error('Value can\'t be empty');
      } else {
        params[param] = value;
      }
    }
    try {
      await promisify(exec)(`git config --global ${gitArgs[param].name} "${params[param]}"`);
    } catch (e) {
      console.error(`Failed to set ${gitArgs[param].name}: ${e.message}`);
    }
  }

  // Repository and package args
  const repoArgs = {
    repo: 'bitbucket repository in format my-workspace/my-repository',
    pkgName: 'package name',
    pkgVersion: 'package version',
  };
  checkParamValues(params, repoArgs);

  // Auth credentials
  let useToken = params.token !== '';
  if (params.token === '' && readlineSync.keyInYN('Do you want to use token for authentication? (y/n): ')) {
    useToken = true;
  }
  if (useToken) {
    while (params.token === '') {
      const value = readlineSync.question('Enter authentication token: ');
      if (value == '') {
        console.error('Value can\'t be empty');
      } else {
        params.token = value;
      }
    }
  } else {
    const authArgs = {
      username: 'bitbucket login',
      password: 'bitbucket password',
    };
    checkParamValues(params, authArgs);
  }

  return params;
}

export default parseParams;
