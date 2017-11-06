FROM node:8.4.0-onbuild


# add node

WORKDIR /usr/src/app
COPY . /usr/src/app


# add mongo