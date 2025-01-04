const {Client, Databases, Query, ID, Users, Account} = require('node-appwrite');
const client = new Client();
const databases = new Databases(client);

client
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_SECRET_KEY)
;

const account = new Account(client);
const users = new Users(client);

module.exports = { databases, Query, ID, users, account };
