FROM node:19-alpine

RUN apk update && apk upgrade && apk add --no-cache bash git openssh openssh-client

WORKDIR /var/cli
