const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const req = require('express/lib/request');
require('dotenv').config();

// Middleware
app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({extended: true}));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI);

// User Schema and Model
const userSchema = new mongoose.Schema({
  username: {type: String, required: true },
});

const exerciseSchema = new mongoose.Schema({
  userId: {type: String, required: true},
  description: {type: String, required: true},
  duration: {type: Number, required: true},
  date: {type: Date, required: true}
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Create a new user
app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Unable to create user' });
  }
});

// Get list of all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch users' });
  }
});

// Add an exercise for a user
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const exerciseDate = date ? new Date(date).toDateString() : new Date().toDateString();
    const newExercise = new Exercise({
      userId: _id,
      description,
      duration: parseInt(duration),
      date: exerciseDate,
    });

    await newExercise.save();

    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date,
      _id: user._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to add exercise' });
  }
});

// Get exercise log of a user
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const { _id } = req.params;
    const { from, to, limit } = req.query;

    const user = await User.findById(_id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let filter = { userId: _id };

    // Validate and process the 'from' and 'to' parameters
    if (from || to) {
      filter.date = {}; // Initialize the date filter
      
      if (from) {
        const fromDate = new Date(from);
        if (isNaN(fromDate.getTime())) {
          return res.status(400).json({ error: 'Invalid from date format.' });
        }
        filter.date.$gte = fromDate; // Use Date object directly
      }
    
      if (to) {
        const toDate = new Date(to);
        if (isNaN(toDate.getTime())) {
          return res.status(400).json({ error: 'Invalid to date format.' });
        }
        filter.date.$lte = toDate; // Use Date object directly
      }
    }
    
    const exerciseLimit = limit ? parseInt(limit) : null; 

    // Fetch logs with the specified filters and limit
    let log = await Exercise
      .find(filter)
      .limit(exerciseLimit)
      .select('description duration date -_id');

    // Format the response log
    log = log.map(({ description, duration, date }) => ({
      description,
      duration,
      date: new Date(date).toDateString(),  // Format date as 'Mon Jan 13 2025'
    }));

    res.json({
      username: user.username,
      count: log.length,
      _id: user._id,
      log,
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to fetch logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
