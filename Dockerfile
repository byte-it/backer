FROM node:14

RUN apt-get update \
    && apt-get install -y mysql-client ccrypt

RUN mkdir /data
VOLUME /data

RUN mkdir -p /var/tmp/backer && mkdir -p /var/opt/backer/local

RUN echo '#!/bin/bash\n/usr/app/cli/bin/run $@' > /usr/bin/backer && \
    chmod +x /usr/bin/backer

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run-script build

EXPOSE 8080

CMD ["node", "dist/index.js"]
