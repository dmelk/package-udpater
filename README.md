# Package updater
Simple NodeJS script that add repositories to the package json

## Installation

### Standalone

Simply clone repository and run `npm install`.


### With docker-compose

If you have docker and docker-compose you can use `./insall.sh` script to install all dependencies.

## How to use

Before runnning make sure that your git is configured correctly and you provide all git config variables.

Run 

```
node run pkg-update -- --repo=<Repository Path> --pkgName=<Package Name> --pkgVersion=<Package Version> --token=<Access Token>
```

Where:

Repository Path - path to the repository in bitbucket which package.json file you want to update. It should have next
format: `my-workspace/my-repository`. Script is accessing bitbucket via the ssh link, so make sure that your ssh key
is added to the bitbucket account.

Package Name - name of the package that you want to add to the package.json file.

Package Version - version of the package that you want to add to the package.json file.

Access Token - access token that you can generate in the bitbucket account. It should have write access to the
repository and pull requests.

## Using with docker-compose

Just simply run:

```
./pkg-update.sh
```

Also you can access docker container bash by running 

```
./run_bash.sh
```

And proceed from the container.

Note that in that case you need manually setup git email and name. For example you can do it like this:

```
git config --global user.email "your@email"
git config --global user.name "Your Name"
```
