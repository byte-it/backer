FROM node:14

RUN apt-get update \
    && apt-get install -y mysql-client

WORKDIR /usr/app

COPY . .

RUN npm install

CMD ["npm", "start"]
