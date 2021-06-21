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

COPY cli/package*.json ./cli/

RUN npm install && cd cli && npm install && cd ..

COPY . .

RUN npm run-script build && cd cli && npm run-script prepack && cd ..

EXPOSE 8080

CMD ["node", "dist/index.js"]
