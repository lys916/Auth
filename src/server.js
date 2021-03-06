const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const cors = require('cors');

const User = require('./user');

const STATUS_USER_ERROR = 422;


const server = express();
// to enable parsing of json bodies for post requests
server.use(express.json());
server.use(session({
  secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re',
  saveUninitialized: false,
  resave: true
}));

const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true
};

server.use(cors(corsOptions));

/* Sends the given err, a string or an object, to the client. Sets the status
 * code appropriately. */
const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

const checkUser = (req, res, next) => {
  if (!req.session.user) {
    sendUserError('User is not authorized', res);
  }
  req.user = req.session.user;
  next();
};

const restricted = (req, res, next) => {
  // do something that only apply to restricted route
  if (!req.session.user) {
    sendUserError('User is not authorized', res);
  }
  next();
};

server.use('/restricted', restricted);

server.get('/restricted/users', (req, res) => {
  User.find().then((users) => {
    res.json(users);
  })
  .catch((err) => {
    res.json(err);
  });
});

server.get('/restricted/another', (req, res) => {
  res.json('from another restricted route');
});

// TODO: add local middleware to this route to ensure the user is logged in
server.get('/me', checkUser, (req, res) => {
  // Do NOT modify this route handler in any way.
  res.json(req.user);
});

server.post('/users', (req, res) => {
  const { username, password } = req.body;
  const newUser = new User();
  newUser.username = username;
  newUser.passwordHash = password;
  newUser
    .save()
    .then((savedUser) => {
      res.status(200).json(savedUser);
    })
    .catch((saveError) => {
      sendUserError(saveError, res);
    });
});

server.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!password) {
    sendUserError('Missing Password!', res);
  }
  User.findOne({ username })
    .then((user) => {
      user.checkPassword(password, (messedUp, valid) => {
        if (messedUp) {
          sendUserError(messedUp);
        }
        if (!valid) {
          res.status(422).json({ success: false });
        } else if (valid) {
          req.session.user = user;
          res.status(200).json({ success: true });
        }
      });
      //
      // version 2.0 without callback - it requires that checkPassword
      // be treated like a promise.
      //
      // user.checkPassword(password).then((valid, err) => {
      //   if (err) {
      //     sendUserError(err);
      //   }
      //   if (!valid) {
      //     res.status(422).json({ success: false });
      //   } else if (valid) {
      //     req.session.user = user;
      //     res.status(200).json({ success: true });
      //   }
      // });
    })
    .catch((saveError) => {
      sendUserError(saveError, res);
    });
});

server.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      res.json({ error: 'Unable to log out of session.' });
    }
    res.json({ message: 'bye' });
  });
});

module.exports = { server };
