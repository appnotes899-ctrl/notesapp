const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// In-memory storage for notes (in production, use a database)
let notes = [
  {
    id: uuidv4(),
    title: 'Grocery List',
    content: 'Milk, Eggs, Bread, Coffee beans, Almond milk, Greek yogurt, Berries',
    tags: ['shopping'],
    color: 'default',
    pinned: true,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
  },
  {
    id: uuidv4(),
    title: 'App Ideas 2024',
    content: 'Fitness tracker with social features, Plant watering reminder with AI detection...',
    tags: ['ideas'],
    color: 'default',
    pinned: true,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
  },
  {
    id: uuidv4(),
    title: 'Meeting Notes: Q3 Roadmap',
    content: 'Attendees: Sarah, Mike, Jessica. Action items: Define MVP scope...',
    tags: ['work', 'meeting'],
    color: 'default',
    pinned: false,
    createdAt: new Date('2023-10-24'),
    updatedAt: new Date('2023-10-24')
  },
  {
    id: uuidv4(),
    title: 'Book Recommendations',
    content: 'The Pragmatic Programmer, Clean Code, Atomic Habits, Deep Work',
    tags: ['books'],
    color: 'default',
    pinned: false,
    createdAt: new Date('2023-10-22'),
    updatedAt: new Date('2023-10-22')
  },
  {
    id: uuidv4(),
    title: 'Workout Plan',
    content: 'Mon: Chest/Tri, Tue: Back/Bi, Wed: Legs, Thu: Rest, Fri: Shoulders',
    tags: ['fitness'],
    color: 'default',
    pinned: false,
    createdAt: new Date('2023-10-20'),
    updatedAt: new Date('2023-10-20')
  },
  {
    id: uuidv4(),
    title: 'Gift Ideas',
    content: 'Mom: Scarf, Dad: Drill set, Sis: Gift card',
    tags: ['personal'],
    color: 'default',
    pinned: false,
    createdAt: new Date('2023-10-15'),
    updatedAt: new Date('2023-10-15')
  }
];

// Server-side date formatter for EJS templates
function formatDate(date) {
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `Edited ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Edited yesterday';
  if (days < 7) return `Edited ${days} days ago`;
  return d.toLocaleDateString();
}

app.locals.formatDate = formatDate;

// Routes
app.get('/', (req, res) => {
  const pinnedNotes = notes.filter(note => note.pinned);
  const recentNotes = notes.filter(note => !note.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
  res.render('index', { pinnedNotes, recentNotes });
});

app.get('/note/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    res.render('editor', { note });
  } else {
    res.status(404).send('Note not found');
  }
});

app.get('/new', (req, res) => {
  res.render('editor', { note: null });
});

app.get('/empty', (req, res) => {
  res.render('empty');
});

// API routes
app.get('/api/notes', (req, res) => {
  res.json(notes);
});

app.get('/api/notes/:id', (req, res) => {
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    res.json(note);
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.post('/api/notes', (req, res) => {
  const { title, content, tags, color, pinned, createdAt, updatedAt } = req.body;
  const newNote = {
    id: uuidv4(),
    title: title || 'Untitled',
    content: content || '',
    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(',').map(tag => tag.trim()).filter(Boolean) : []),
    color: color || 'default',
    pinned: pinned === 'true' || pinned === true,
    createdAt: createdAt ? new Date(createdAt) : new Date(),
    updatedAt: updatedAt ? new Date(updatedAt) : new Date()
  };
  notes.push(newNote);
  console.log('Created note:', { id: newNote.id, title: newNote.title, pinned: newNote.pinned });
  console.log('Total notes:', notes.length);
  res.json(newNote);
});

app.put('/api/notes/:id', (req, res) => {
  console.log('PUT /api/notes/:id body:', req.body);
  const note = notes.find(n => n.id === req.params.id);
  if (note) {
    const { title, content, tags, color, pinned, createdAt, updatedAt } = req.body;
    note.title = title || note.title;
    note.content = content || note.content;
    note.tags = tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : note.tags;
    note.color = color || note.color;
    note.pinned = pinned !== undefined ? (pinned === 'true' || pinned === true) : note.pinned;
    note.updatedAt = new Date();
    console.log('Updated note:', { id: note.id, title: note.title, pinned: note.pinned });
    res.json(note);
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

app.delete('/api/notes/:id', (req, res) => {
  const index = notes.findIndex(n => n.id === req.params.id);
  if (index !== -1) {
    notes.splice(index, 1);
    console.log('Deleted note:', req.params.id);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Note not found' });
  }
});

// Bulk delete (accepts JSON body { ids: [...]} or { all: true })
app.delete('/api/notes', (req, res) => {
  const { ids, all } = req.body || {};
  if (all) {
    const count = notes.length;
    notes = [];
    console.log('Deleted all notes');
    return res.json({ success: true, deleted: count });
  }
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids array required' });
  }
  let deleted = 0;
  ids.forEach(id => {
    const idx = notes.findIndex(n => n.id === id);
    if (idx !== -1) {
      notes.splice(idx, 1);
      deleted++;
    }
  });
  console.log('Bulk deleted', deleted, 'notes');
  res.json({ success: true, deleted });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});