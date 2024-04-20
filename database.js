// const sqlite3 = require('sqlite3').verbose()
// const md5 = require('md5')
/* const db = require('better-sqlite3')('db_anthemLinkApp.sqlite', { verbose: console.log })

db.pragma('journal_mode = WAL')

db.pragma('foreign_keys = ON') */

const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER
})

pool.connect((err) => {
  if (err) throw err
  console.log('Connected to the SQLite database.')
})

module.exports = pool
