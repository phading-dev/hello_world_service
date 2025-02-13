FROM node:20.12.1

WORKDIR /app
COPY . .
RUN npm install
RUN npx tsc

EXPOSE 8080 8081
CMD ["node", "main"]
