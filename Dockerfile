FROM node:boron

MAINTAINER Reekoh

RUN apt-get update && apt-get install -y build-essential

RUN mkdir -p /home/node/sigfox-device-integration
COPY . /home/node/sigfox-device-integration

WORKDIR /home/node/sigfox-device-integration

# Install dependencies
RUN npm install pm2 yarn -g
RUN yarn install

CMD ["pm2-docker", "--json", "app.yml"]