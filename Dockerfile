#USE LAST VERSION OF Node.js FROM https://hub.docker.com/_/node
FROM node:latest

#UPDATE OS
RUN apt-get update && \
    apt-get dist-upgrade -y && \
    rm -rf /var/lib/apt/lists/*

#BUILD APPLICATION
RUN git clone https://github.com/LAB-MI/attestation-deplacement-derogatoire-covid-19.git && \
    cd attestation-deplacement-derogatoire-covid-19 && \
    pwd && \
    npm i && \
    npm run build:dev

#INSTALL NPX SERVER
RUN yarn global add serve

ENTRYPOINT ["/usr/local/bin/npx", "serve", "/attestation-deplacement-derogatoire-covid-19/dist"]

