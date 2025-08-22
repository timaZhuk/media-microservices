#use the official node.js 18 image with linux as the base image
FROM node:18-alpine

#working directory
WORKDIR /use/src/app

#copy package*.json to WORKDIR
COPY package*.json ./

#install only production depeps
RUN npm ci --only=production

# copy rest an application code
COPY . .

EXPOSE 4000

CMD ["node", "src/server.js"]