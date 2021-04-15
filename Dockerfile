FROM node:14

RUN apt-get update \
    && apt-get install -y mysql-client ccrypt

RUN mkdir -p /var/tmp/backer && mkdir -p /var/opt/backer/local

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run-script build

CMD ["npm", "start"]
