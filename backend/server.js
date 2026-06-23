const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost/studiopro'
});

app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_me';

// AUTH - REGISTER
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ error: 'Email già registrata' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, hashedPassword, name]
        );
        const token = jwt.sign({ id: result.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ user: result.rows[0], token });
    } catch (err) {
        res.status(500).json({ error: 'Errore registrazione' });
    }
});

// AUTH - LOGIN
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length === 0) {
            return res.status(401).json({ error: 'Email non trovata' });
        }
        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Password non valida' });
        }
        const token = jwt.sign({ id: user.rows[0].id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ user: { id: user.rows[0].id, email: user.rows[0].email, name: user.rows[0].name }, token });
    } catch (err) {
        res.status(500).json({ error: 'Errore login' });
    }
});

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token non fornito' });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Token non valido' });
    }
};

// CLIENTS
app.get('/api/clients', verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

app.post('/api/clients', verifyToken, async (req, res) => {
    try {
        const { name, email, phone } = req.body;
        const result = await pool.query(
            'INSERT INTO clients (user_id, name, email, phone, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.userId, name, email, phone, 'active']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

// APPOINTMENTS
app.get('/api/appointments', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT a.*, c.name as client_name FROM appointments a JOIN clients c ON a.client_id = c.id WHERE a.user_id = $1 ORDER BY a.date DESC',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

app.post('/api/appointments', verifyToken, async (req, res) => {
    try {
        const { client_id, title, date, time } = req.body;
        const result = await pool.query(
            'INSERT INTO appointments (user_id, client_id, title, date, time, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [req.userId, client_id, title, date, time, 'scheduled']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

// DOCUMENTS
app.get('/api/documents', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT d.*, c.name as client_name FROM documents d JOIN clients c ON d.client_id = c.id WHERE d.user_id = $1',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

app.post('/api/documents', verifyToken, async (req, res) => {
    try {
        const { client_id, name, size } = req.body;
        const result = await pool.query(
            'INSERT INTO documents (user_id, client_id, name, size) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.userId, client_id, name, size]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

// INVOICES
app.get('/api/invoices', verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT i.*, c.name as client_name FROM invoices i JOIN clients c ON i.client_id = c.id WHERE i.user_id = $1',
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

app.post('/api/invoices', verifyToken, async (req, res) => {
    try {
        const { client_id, amount, description } = req.body;
        const result = await pool.query(
            'INSERT INTO invoices (user_id, client_id, amount, description, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [req.userId, client_id, amount, description, 'pending']
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

// STATS
app.get('/api/stats', verifyToken, async (req, res) => {
    try {
        const clientsCount = await pool.query('SELECT COUNT(*) FROM clients WHERE user_id = $1', [req.userId]);
        const appointmentsCount = await pool.query('SELECT COUNT(*) FROM appointments WHERE user_id = $1 AND status = $2', [req.userId, 'scheduled']);
        const invoicesSum = await pool.query('SELECT SUM(amount) FROM invoices WHERE user_id = $1', [req.userId]);
        const paidSum = await pool.query('SELECT SUM(amount) FROM invoices WHERE user_id = $1 AND status = $2', [req.userId, 'paid']);

        res.json({
            clients: parseInt(clientsCount.rows[0].count),
            appointments: parseInt(appointmentsCount.rows[0].count),
            totalRevenue: invoicesSum.rows[0].sum || 0,
            paidRevenue: paidSum.rows[0].sum || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Errore' });
    }
});

// DATABASE INIT
const initDB = async () => {
    try {
        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS clients (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(20),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        client_id INTEGER REFERENCES clients(id),
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        time TIME NOT NULL,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        client_id INTEGER REFERENCES clients(id),
        name VARCHAR(255) NOT NULL,
        size VARCHAR(50),
        upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        client_id INTEGER REFERENCES clients(id),
        amount DECIMAL(10, 2) NOT NULL,
        description VARCHAR(500),
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Database initialized');
    } catch (err) {
        console.error('⚠️ DB error:', err.message);
    }
};

const PORT = process.env.PORT || 5000;
initDB();

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;