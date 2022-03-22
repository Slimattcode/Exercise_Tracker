require('dotenv').config({ path: 'sample.env' });
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require("mongoose");
const assert = require('assert')

// connecting to server
mongoose.connect(process.env.MONGO, { useNewUrlParser: true, useUnifiedTopology: true });

// default connection
const db = mongoose.connection;

// notification of connection errors
db.on("error", console.error.bind(console, "mongoBD connection error:"));


// Basic Configuration
const port = process.env.PORT || 3000;


app.use(cors())

app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Schemas
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: String
});


// models
let User = mongoose.model("User", userSchema);
let Exercise = mongoose.model("Exercise", exerciseSchema);

// username and _id post
app.post("/api/users", (req, res) => {
  let user = req.body.username;
  console.log(user);
  User.findOne({ username: user }, function(err, data) {
    if (err) return `error: ${err}`;
    console.log(data);
    if (data === null) {
      user = new User({ username: user });
      user.save(function(err, data) {
        if (err) return `error: ${err}`;
        res.json({ username: data.username, _id: data.id });
      })
    } else {
      res.json({ username: data.username, _id: data.id });
    };
  });
});

app.get("/api/users", (req, res) => {
  User.find({}, function(err, data) {
    if (err) return `error: ${err}`
    res.json(data)
  });
});

app.post("/api/users/:_id/exercises", (req, res) => {
  let id = req.params._id;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = req.body.date;
  const validateDate = (y) => {
    if (new Date(y).toDateString() === "Invalid Date") {
      throw new Error(`ValidationError: Exercises validation failed: date: Cast to date failed for value ${req.body.date} (type ${typeof req.body.date}) at path "date"`);
    }
  }
  try {
    validateDate(date)
  } catch (e) {
    console.error(e)
  }
  if (date === ""|| date === undefined) {
    date = new Date().toDateString();
  } else {
    date = new Date(date).toDateString();
  }
  User.findOne({ _id: id }, function(err, data) {
    if (err) return `error: ${err}`
    console.log(data)
    let exercise = new Exercise({ date: date, duration: duration, description: description, username: data.username })
    exercise.save(function(err, data) {
      console.log(`Save Error: ${err}`)
      if (err) return `error: ${err}`;
    })
    res.json({ username: exercise.username, date: exercise.date, duration: exercise.duration, description: exercise.description, _id: data.id })
  })
});

app.get("/api/users/:_id/logs", (req, res) => {
  let id = req.params._id;
  let from = req.query.from;
  let to = req.query.to;
  let limit = req.query.limit;
  User.findOne({ _id: id }, function(err, data) {
    if (err) return `Error Find User: ${err}`
    let username = data.username
    Exercise.find({ username: username }, "description duration date", function(err, data) {
      console.log(`Find Exercises Error: ${err}`)
      if (err) return `Error: ${err}`
      let count = data.length;
      if (from !== undefined && to === undefined && limit === undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        from = new Date(from);
        let utcFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
        let fromDate = dates.filter((x) => x >= utcFrom);
        res.json({ _id: id, username: username, count: count, log: fromDate.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else if (from === undefined && to !== undefined && limit === undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        to = new Date(to);
        let utcTo = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
        let toDate = dates.filter((y) => y <= utcTo);
        res.json({ _id: id, username: username, count: count, log: toDate.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else if (from === undefined && to === undefined && limit !== undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        if (dates.length <= limit) {
          result = dates;
        } else {
          result = dates.slice(0, limit);
        };
        res.json({ _id: id, username: username, count: count, log: result.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else if (from !== undefined && to !== undefined && limit === undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        from = new Date(from);
        let utcFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
        to = new Date(to);
        let utcTo = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
        limit = Number(limit);
        let fromDate = dates.filter((x) => x >= utcFrom);
        let toDate = fromDate.filter((y) => y <= utcTo);
        res.json({ _id: id, username: username, count: count, log: toDate.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});       
      } else if (from !== undefined && to === undefined && limit !== undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        from = new Date(from);
        let utcFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
        let fromDate = dates.filter((x) => x >= utcFrom);
        if (fromDate.length <= limit) {
          result = fromDate;
        } else {
          result = fromDate.slice(0, limit);
        };
        res.json({ _id: id, username: username, count: count, log: result.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else if (from === undefined && to !== undefined && limit !== undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        to = new Date(to);
        let utcTo = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
        let toDate = dates.filter((y) => y <= utcTo);
        if (toDate.length <= limit) {
          result = toDate;
        } else {
          result = toDate.slice(0, limit);
        };
        res.json({ _id: id, username: username, count: count, log: result.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else if (from !== undefined && to !== undefined && limit !== undefined) {
        let dates = data.map((x) => x.date).map((y) => Date.UTC(new Date(y).getUTCFullYear(), new Date(y).getUTCMonth(), new Date(y).getUTCDate()));
        from = new Date(from);
        let utcFrom = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
        to = new Date(to);
        let utcTo = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
        limit = Number(limit);
        let fromDate = dates.filter((x) => x >= utcFrom);
        let toDate = fromDate.filter((y) => y <= utcTo);
        let result;
        if (toDate.length <= limit) {
          result = toDate;
        } else {
          result = toDate.slice(0, limit);
        };
        res.json({ _id: id, username: username, count: count, log: result.map((x) => data.filter((y) => new Date(x).toDateString() === y.date).flat()).flat()});
      } else {
        res.json({ _id: id, username: username, count: count, log: data });
      }
    });
  });
});

Exercise.deleteMany({ description: "test" }, function(err, data) {
  if (err) return `error: ${err}`
});
Exercise.deleteMany({ date: "Invalid Date" }, function(err, data) {
  if (err) return `error: ${err}`
});
User.deleteMany({ username: /fcc.+/ }, function(err, data) {
  if (err) return `error: ${err}`
});

const listener = app.listen(port, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});