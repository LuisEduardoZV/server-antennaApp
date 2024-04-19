// const sqlite3 = require('sqlite3').verbose()
// const md5 = require('md5')
const db = require('better-sqlite3')('db_anthemLinkApp.sqlite', { verbose: console.log })

db.pragma('journal_mode = WAL')

console.log('Connected to the SQLite database.')

db.pragma('foreign_keys = ON')

const createAdmin = db.prepare(`CREATE TABLE IF NOT EXISTS Admin (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email text UNIQUE,
      name text,
      password text,
      active number,
      CONSTRAINT email_unique UNIQUE (email)
      )`)
const stmCreateAdmin = db.transaction(() => {
  createAdmin.run()
  const firstAdmin = {
    name: 'DEMO',
    email: 'demo@demo.com',
    password: 'd0970714757783e6cf17b26fb8e2298f',
    active: '' + 1
  }

  const sql = db.prepare('INSERT INTO Admin (email,name,password,active) VALUES (@email,@name,@password,@active)')

  const stm = db.transaction(() => {
    sql.run(firstAdmin)
  })
  stm()
})
stmCreateAdmin()

db.prepare(`CREATE TABLE IF NOT EXISTS Clientes (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          phone text,
          name text,
          address text,
          cliNumber text,
          zip number,
          email text UNIQUE,
          rfc text,
          active number,
          note text,
          CONSTRAINT email_unique UNIQUE (email)
          )`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS Contactos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      phone text,
      name text,
      position text,
      active number,
      note text,
      FOREIGN KEY(clientId) REFERENCES Clientes(id)
      )`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS Users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      email text UNIQUE,
      name text,
      password text,
      active number,
      type number,
      FOREIGN KEY (clientId) REFERENCES Clientes (id)
      )`).run()

const createTerminales = db.prepare(`CREATE TABLE IF NOT EXISTS Terminales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kit text,
            serial text,
            service text,
            name text,
            lat number,
            lng number,
            alias text,
            number text,
            active number,
            variable number
            )`)
const stmCreate = db.transaction(() => {
  createTerminales.run()
  const ejemplos = []
  for (let i = 1; i <= 30; i++) {
    const objeto = {
      kit: `TKMX00${Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000}`, // Usamos un prefijo y números aleatorios
      serial: `${Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000}XB0${Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000}`, // Números aleatorios para el serial
      service: `FG${Math.floor(Math.random() * (99 - 10 + 1)) + 10}H-${Math.floor(Math.random() * (999999999 - 100000000 + 1)) + 100000000}`, // Prefijo y números aleatorios
      name: `DEMO ${i + 1}`, // Incrementamos el número en el nombre
      lat: 16.8600000000 + (Math.random() - 0.5) * 0.5, // Valor aleatorio cercano al ejemplo
      lng: -99.8884000000 + (Math.random() - 0.5) * 0.5, // Valor aleatorio cercano al ejemplo
      alias: `TERMINAL ${i + 1}`, // Incrementamos el número en el alias
      number: `TRF-J${Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000}`, // Prefijo y números aleatorios
      active: Math.random() < 0.5 ? 0 : 1, // Valor aleatorio de 0 o 1
      variable: Math.random() < 0.5 ? 0 : 1 // Valor aleatorio de 0 o 1
    }
    ejemplos.push(objeto)
  }

  const sql = db.prepare('INSERT INTO Terminales (kit,serial,service,name,lat,lng,alias,number,active,variable) VALUES (@kit,@serial,@service,@name,@lat,@lng,@alias,@number,@active,@variable)')

  const stm = db.transaction((terminales) => {
    for (const terminal of terminales) {
      const info2 = sql.run(terminal)
      console.log(info2)
    }
  })
  stm(ejemplos)
})
stmCreate()

db.prepare(`CREATE TABLE IF NOT EXISTS TerminalesClientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clientId INTEGER NOT NULL,
      terminalId INTEGER NOT NULL,
      FOREIGN KEY (clientId) REFERENCES Clientes (id),
      FOREIGN KEY (terminalId) REFERENCES Terminales (id),
      UNIQUE (clientId, terminalId)
      )`).run()

db.prepare(`CREATE TABLE IF NOT EXISTS TerminalesUsers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      assignId INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES Users (id),
      FOREIGN KEY (assignId) REFERENCES TerminalesClientes (id),
      UNIQUE (userId, assignId)
      )`).run()

module.exports = db
