import express from 'express';
import compression from 'compression';
import * as websocket from "./websocket.js";
import { port, buildPath } from './config.js';
import ldap from 'ldapjs';
import basicAuth from 'express-basic-auth';
import * as watcher from './watcher.js';
import router from './router.js';
import bodyParser from 'body-parser';

const app = express();
app.use(compression());

app.use('/', express.static(buildPath, { index: false }));

websocket.start(app);

app.use(basicAuth({
  challenge: true,
  realm: 'ASF Board Agenda tool',
  authorizeAsync: true,
  authorizer: (username, password, callback) => {
    let client = ldap.createClient({
      url: 'ldaps://ldap-us-ro.apache.org:636',
      tlsOptions: { rejectUnauthorized: false }
    });

    let dn = `uid=${username},ou=people,dc=apache,dc=org`;
    client.bind(dn, password, (error) => {
      callback(null, !error);
      client.destroy();
    });
  }
}));

app.use('/', (request, response, next) => {
  if (!watcher.active) watcher.start(request);
  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

router(app).then(() => {
  app.listen(port, () => {
    console.log(`Whimsy board agenda app listening on port ${port}`);
  })
});

