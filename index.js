// Create express app
const express = require('express')
const { faker } = require('@faker-js/faker')
const dayjs = require('dayjs')
const cors = require('cors')
const app = express()
const db = require('./database.js')
const md5 = require('md5')

const bodyParser = require('body-parser')

app.use(cors())
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

// Server port
const HTTP_PORT = 8000
// Start server
app.listen(HTTP_PORT, () => {
  console.log('Server running on port %PORT%'.replace('%PORT%', HTTP_PORT))
})
// Root endpoint
app.get('/', (req, res, next) => {
  res.json({ message: 'Ok' })
})

// ENDPOINTS PARA CLIENTES

app.get('/api/Clientes', (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Clientes'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Clientes', (req, res, next) => {
  const errors = []
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (!req.body.rfc) {
    errors.push('No rfc specified')
  }
  if (!req.body.address) {
    errors.push('No address specified')
  }
  if (!req.body.zip) {
    errors.push('No zip specified')
  }
  if (!req.body.phone) {
    errors.push('No phone specified')
  }
  if (!req.body.email) {
    errors.push('No email specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const dataCli = {
    id: req.body.id ?? '',
    phone: req.body.phone ?? '',
    name: req.body.name ?? '',
    address: req.body.address ?? '',
    cliNumber: req.body.cliNumber ?? '',
    zip: req.body.zip ?? '',
    email: req.body.email ?? '',
    rfc: req.body.rfc ?? '',
    active: req.body.active ?? '',
    note: req.body.note ?? ''
  }

  const contacts = req.body.contacts ?? []

  try {
    const insertClient = db.prepare('INSERT INTO Clientes (phone,name,address,cliNumber,zip,email,rfc,active,note) VALUES (@phone,@name,@address,@cliNumber,@zip,@email,@rfc,@active,@note) RETURNING id')

    const stmCli = db.transaction(() => {
      const { lastInsertRowid } = insertClient.run(dataCli)
      if (lastInsertRowid) {
        if (contacts.length) {
          const insertContacts = db.prepare('INSERT INTO Contactos (clientId,phone,name,position,active,note) VALUES (@clientId,@phone,@name,@position,@active,@note)')

          const stmCon = db.transaction((contacts) => {
            for (const contact of contacts) insertContacts.run({ ...contact, clientId: lastInsertRowid })
          })
          stmCon(contacts)
        }
      }
    })
    stmCli()

    const sql = 'SELECT * FROM Clientes'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data: [...data]
    })
  } catch (error) {
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Clientes/:id', (req, res, next) => {
  try {
    const params = [req.params.id]
    const sql = db.prepare('SELECT * FROM Clientes WHERE id = ?').get(params)

    let contactosData = []
    if (sql) {
      const contactos = db.prepare('SELECT * FROM Contactos WHERE clientId = ?')
      const stm = db.transaction(() => {
        contactosData = contactos.all(params)
      })
      stm()
    }

    res.json({
      message: 'success',
      data: { ...sql, contactos: contactosData }
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Clientes/:id', (req, res, next) => {
  try {
    const dataCli = {
      id: req.params.id,
      phone: req.body.phone ?? '',
      name: req.body.name ?? '',
      address: req.body.address ?? '',
      cliNumber: req.body.cliNumber ?? '',
      zip: req.body.zip ?? '',
      email: req.body.email ?? '',
      rfc: req.body.rfc ?? '',
      active: req.body.active ?? '' + 1,
      note: req.body.note ?? ''
    }
    db.prepare(
              `UPDATE Clientes set 
                 phone = COALESCE(@phone,phone), 
                 name = COALESCE(@name,name), 
                 address = COALESCE(@address,address), 
                 cliNumber = COALESCE(@cliNumber,cliNumber), 
                 zip = COALESCE(@zip,zip), 
                 email = COALESCE(@email,email), 
                 rfc = COALESCE(@rfc,rfc), 
                 active = COALESCE(@active,active), 
                 note = COALESCE(@note,note) 
                 WHERE id = @id`).run(dataCli)

    const sql = 'SELECT * FROM Clientes'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data: [...data]
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Clientes/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM Clientes WHERE id = ?')

    let data = []
    const stm = db.transaction(() => {
      const info = sql.run(req.params.id)
      console.log(info)
      data = db.prepare('SELECT * FROM Clientes').all()
    })
    stm()

    res.json({ message: 'deleted', data })
  } catch (error) {
    res.json({ error: error.message })
  }
})

// ENDPOINTS PARA ADMIN

app.get('/api/Admins', (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Admin'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Admins/:id', (req, res, next) => {
  try {
    const params = [req.params.id]
    const sql = db.prepare('SELECT * FROM Admin WHERE id = ?').get(params)

    res.json({
      message: 'success',
      data: sql
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Admins', (req, res, next) => {
  const errors = []
  if (!req.body.password) {
    errors.push('No password specified')
  }
  if (!req.body.email) {
    errors.push('No email specified')
  }
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const data = {
    name: req.body.name,
    email: req.body.email,
    password: md5('' + req.body.password),
    active: '' + 1
  }
  try {
    const params = [data.email, data.name, data.password, data.active]
    const sql = db.prepare('INSERT INTO Admin (email, name, password, active) VALUES (?,?,?,?)')

    const stm = db.transaction(() => {
      sql.run(params)
    })
    stm()

    console.log(sql)

    res.json({
      message: 'success',
      ...data,
      id: this.lastID
    })
  } catch (error) {
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Admins/:id', (req, res, next) => {
  try {
    const data = {
      id: req.params.id,
      name: req.body.name,
      email: req.body.email,
      password: req.body.hasNewPass ? md5(req.body.password) : (req.body.password ?? ''),
      active: req.body.active ?? '' + 1
    }
    const params = [data.email, data.name, data.password, data.active, data.id]
    const sql = db.prepare(
            `UPDATE Admin set 
               email = COALESCE(?,email), 
               name = COALESCE(?,name), 
               password = COALESCE(?,password), 
               active = COALESCE(?,active) 
               WHERE id = ?`).run(params)

    console.log(sql)

    res.json({
      message: 'success',
      ...data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Admins/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM Admin WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({ message: 'deleted', data: info })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// ENDPOINTS PARA CONTACTOS

app.get('/api/Contactos', (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Contactos'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Contactos/:id', (req, res, next) => {
  try {
    const params = [req.params.id]
    const sql = db.prepare('SELECT * FROM Contactos WHERE id = ?').get(params)

    res.json({
      message: 'success',
      data: sql
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Contactos/:id', (req, res, next) => {
  try {
    const data = {
      id: req.params.id,
      clientId: '' + req.body.clientId,
      name: req.body.name,
      phone: req.body.phone,
      position: req.body.position ?? '',
      note: req.body.note ?? '',
      active: req.body.active ?? '' + 1
    }

    const sql = db.prepare(
                `UPDATE Contactos set 
                   clientId = COALESCE(@clientId,clientId), 
                   name = COALESCE(@name,name), 
                   phone = COALESCE(@phone,phone), 
                   position = COALESCE(@position,position), 
                   note = COALESCE(@note,note), 
                   active = COALESCE(@active,active)
                   WHERE id = @id`).run(data)

    console.log(sql)

    res.json({
      message: 'success',
      ...data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// ENDPOINTS PARA USERS

app.get('/api/Users', (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Users'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Users/:id', (req, res, next) => {
  try {
    const params = [req.params.id]
    const sql = db.prepare('SELECT * FROM Users WHERE id = ?').get(params)

    res.json({
      message: 'success',
      data: sql
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Users', (req, res, next) => {
  const errors = []
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (!req.body.email) {
    errors.push('No email specified')
  }
  if (!req.body.password) {
    errors.push('No password specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const data = {
    clientId: '' + req.body.clientId,
    email: req.body.email,
    name: req.body.name,
    password: md5('' + req.body.password),
    active: req.body.active ?? '',
    type: req.body.type ?? '' + 1
  }
  try {
    const sql = db.prepare('INSERT INTO Users (clientId,email,name,password,active,type) VALUES (@clientId,@email,@name,@password,@active,@type)').run(data)

    console.log(sql)

    res.json({
      message: 'success',
      ...data,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Users/:id', (req, res, next) => {
  try {
    const data = {
      id: req.params.id,
      clientId: '' + req.body.clientId,
      email: req.body.email,
      name: req.body.name,
      password: req.body.hasNewPassword ? md5(req.body.password) : (req.body.lastPassword ?? ''),
      active: req.body.active ?? 1,
      type: req.body.type ?? '' + 1
    }
    console.log(data)

    let queryPass = ''
    if (req.body.hasNewPassword) queryPass = ',password = COALESCE(@password,password)'

    const sql = db.prepare(`UPDATE Users set 
    clientId = COALESCE(@clientId,clientId), 
    name = COALESCE(@name,name), 
    active = COALESCE(@active,active), 
    type = COALESCE(@type,type),
    email = COALESCE(@email,email)${queryPass}
    WHERE id = @id`).run(data)

    console.log(sql)

    res.json({
      message: 'success',
      ...data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Users/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM Users WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({ message: 'deleted', data: info })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// ENDPOINTS PARA TERMINALES

app.get('/api/Terminales', (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Terminales'
    const data = db.prepare(sql).all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Terminales/:id', (req, res, next) => {
  try {
    const params = [req.params.id]
    const sql = db.prepare('SELECT * FROM Terminales WHERE id = ?').get(params)

    res.json({
      message: 'success',
      data: sql
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

/*
app.post('/api/Terminal/', (req, res, next) => {
  const errors = []
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (!req.body.email) {
    errors.push('No email specified')
  }
  if (!req.body.password) {
    errors.push('No password specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const data = {
    clientId: '' + req.body.clientId,
    email: req.body.email,
    name: req.body.name,
    password: md5(req.body.password),
    active: req.body.active ?? '',
    type: req.body.type ?? '' + 1
  }
  try {
    const sql = db.prepare('INSERT INTO Users (clientId,email,name,password,active,type) VALUES (@clientId,@email,@name,@password,@active,@type)').run(data)

    console.log(sql)

    res.json({
      message: 'success',
      ...data,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
}) */

app.put('/api/Terminales/:id', (req, res, next) => {
  try {
    const data = {
      id: req.params.id,
      name: req.body.name,
      lat: req.body.lat,
      lng: req.body.lng,
      alias: req.body.alias,
      variable: req.body.variable
    }

    const sql = db.prepare(
                    `UPDATE Terminales set 
                       name = COALESCE(@name,name), 
                       lat = COALESCE(@lat,lat), 
                       lng = COALESCE(@lng,lng), 
                       alias = COALESCE(@alias,alias), 
                       variable = COALESCE(@variable,variable)
                       WHERE id = @id`).run(data)

    console.log(sql)

    res.json({
      message: 'success',
      ...data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Terminales/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM Terminales WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({ message: 'deleted', data: info })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

/** ******* AUTH *********/
app.get('/api/Login', (req, res, next) => {
  try {
    const errors = []
    if (!req.query.email) {
      errors.push('No email specified')
    }
    if (!req.query.password) {
      errors.push('No password specified')
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(',') })
      return
    }
    let data = null
    let isPowerUser = 1

    data = db.prepare('SELECT * FROM Admin WHERE email = ? AND password = ?').get([req.query.email, md5('' + req.query.password)])

    if (!data || !data?.id) {
      data = db.prepare('SELECT * FROM Users WHERE email = ? AND password = ?').get([req.query.email, md5('' + req.query.password)])
      isPowerUser = 0
    }

    console.log(data)

    res.json({
      message: 'success',
      data: { ...data, isPowerUser, type: data?.type ?? 0 } ?? {}
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

/** **** ENDPOINTS CLIENTES WEB *******/

app.get('/api/getClientContactos', (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const data = db.prepare('SELECT * FROM Contactos WHERE clientId = ?').all(req.query.id)

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Contactos', (req, res, next) => {
  const errors = []
  if (!req.body.phone) {
    errors.push('No phone specified')
  }
  if (!req.body.clientId) {
    errors.push('No clientId specified')
  }
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const data = {
    clientId: '' + req.body.clientId,
    name: req.body.name,
    phone: req.body.phone,
    position: req.body.position ?? '',
    note: req.body.note ?? '',
    active: '' + 1
  }
  try {
    const params = [data.clientId, data.phone, data.name, data.position, data.active, data.note]
    db.prepare('INSERT INTO Contactos (clientId,phone,name,position,active,note) VALUES (?,?,?,?,?,?)').run(params)

    res.json({
      message: 'success',
      ...data,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Contactos/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM Contactos WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({ message: 'deleted', data: info })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getClientUser', (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const data = db.prepare('SELECT * FROM Users WHERE clientId = ?').all(req.query.id)

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getClientTerminalesAllCli', (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const data = db.prepare('SELECT t.*, tc.clientId, tc.id AS assignId FROM TerminalesClientes tc JOIN Terminales t ON tc.terminalId = t.id WHERE tc.clientId = ?').all(req.query.id)

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getAsigment', (req, res, next) => {
  try {
    const data = db.prepare('SELECT t.*, c.email, c.name AS clientName, u.email AS fullName, tc.id AS assignId, tu.id AS assignUserId, tc.clientId AS clientId FROM TerminalesClientes tc JOIN Terminales t ON tc.terminalId = t.id JOIN Clientes c ON tc.clientId = c.id JOIN TerminalesUsers tu ON tc.id = tu.assignId JOIN Users u ON tu.userId = u.id').all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getAsigmentUser', (req, res, next) => {
  try {
    if (!req.query.UserId) {
      res.status(400).json({ error: 'No UserId' })
      return
    }

    const data = db.prepare('SELECT t.*, c.email, c.name AS clientName, u.email AS fullName, tc.clientId, tc.id AS assignId, tu.id AS assignUserId FROM TerminalesUsers tu JOIN TerminalesClientes tc ON tu.assignId = tc.id JOIN Terminales t ON tc.terminalId = t.id JOIN Clientes c ON tc.clientId = c.id JOIN Users u ON tu.userId = u.id WHERE tu.userId = ?').all(req.query.UserId)

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Assigns/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM TerminalesUsers WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({
      message: 'success',
      ...info,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/TerminalNotAsigment', (req, res, next) => {
  try {
    const data = db.prepare('SELECT * FROM Terminales WHERE id NOT IN (SELECT terminalId FROM TerminalesClientes)').all()

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Client_TerminalAll', (req, res, next) => {
  const errors = []
  if (!Array.isArray(req.body)) {
    errors.push('No terminals specified')
  } else {
    let allHasData = true
    req.body.forEach(el => {
      const { terminalId, clientId } = el
      if (!terminalId || !clientId) {
        allHasData = false
      }
    })
    if (!allHasData) errors.push('No all data terminals specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  try {
    const sql = db.prepare('INSERT INTO TerminalesClientes (clientId,terminalId) VALUES (@clientId,@terminalId)')
    const stm = db.transaction((terminales) => {
      for (const terminal of terminales) sql.run(terminal)
    })

    stm(req.body)

    res.json({
      message: 'success'
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/ClientTerminals/:id', (req, res, next) => {
  try {
    const sql = db.prepare('DELETE FROM TerminalesClientes WHERE id = ?')
    const info = sql.run(req.params.id)

    res.json({
      message: 'success',
      ...info,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/AssignsALL', (req, res, next) => {
  const errors = []
  if (!Array.isArray(req.body)) {
    errors.push('No info specified')
  } else {
    let allHasData = true
    req.body.forEach(el => {
      const { terminalId, clientId, userId } = el
      if (!terminalId || !clientId || !userId) {
        allHasData = false
      }
    })
    if (!allHasData) errors.push('No all data specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  try {
    // db.prepare('INSERT INTO TerminalesUsers (userId,assignId) VALUES (@userId,@assignId)')
    const sql = db.prepare('SELECT id FROM TerminalesClientes WHERE terminalId = @terminalId AND clientId = @clientId')
    const stm = db.transaction((info) => {
      for (const link of info) {
        const { userId } = link
        const { id } = sql.get(link)
        const insert = db.prepare('INSERT INTO TerminalesUsers (userId,assignId) VALUES (?,?)')
        try {
          const stmInsert = db.transaction(() => {
            insert.run([userId, id])
          })
          stmInsert()
        } catch (error) {}
      }
    })
    stm(req.body)

    res.json({
      message: 'success',
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

// EXTRA DE MOMENTO
app.post('/api/TerminalesClientes', (req, res, next) => {
  const errors = []
  if (!req.body.clientId) {
    errors.push('No clientId specified')
  }
  if (!req.body.terminalId) {
    errors.push('No terminalId specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const data = {
    clientId: '' + req.body.clientId,
    terminalId: '' + req.body.terminalId
  }
  try {
    db.prepare('INSERT INTO TerminalesClientes (clientId,terminalId) VALUES (@clientId,@terminalId)').run(data)

    res.json({
      message: 'success',
      ...data,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Assigns', (req, res, next) => {
  try {
    const sql = db.prepare('SELECT * FROM TerminalesUsers')
    const info = sql.all()

    res.json({
      message: 'success',
      ...info,
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

// REPORTES

app.get('/api/consumeDataTerminal', (req, res, next) => {
  try {
    const errors = []
    if (!req.query.terminal) {
      errors.push('No terminal specified')
    }
    if (!req.query.fecha1) {
      errors.push('No fecha1 specified')
    }
    if (!req.query.fecha2) {
      errors.push('No fecha2 specified')
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(',') })
      return
    }

    const days = dayjs(req.query.fecha2).diff(req.query.fecha1, 'days')

    const data = []
    for (let i = 0; i < days; i++) {
      data.push({
        time: dayjs(req.query.fecha1).add(i, 'day').format('DD-MM-YYYY'),
        value: faker.number.float({ max: 70, fractionDigits: 2 })
      })
    }

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/DisponibilityDataTerminal', (req, res, next) => {
  try {
    const errors = []
    if (!req.query.terminal) {
      errors.push('No terminal specified')
    }
    if (!req.query.fecha1) {
      errors.push('No fecha1 specified')
    }
    if (!req.query.fecha2) {
      errors.push('No fecha2 specified')
    }
    if (errors.length) {
      res.status(400).json({ error: errors.join(',') })
      return
    }

    const days = dayjs(req.query.fecha2).diff(req.query.fecha1, 'days')

    const data = []
    for (let i = 0; i < days; i++) {
      data.push({
        time: dayjs(req.query.fecha1).add(i, 'day').format('DD-MM-YYYY'),
        downlinkThroughput: faker.number.float({ fractionDigits: 18 }),
        obstructionPercentTime: faker.number.float({ fractionDigits: 18 }),
        pingDropRateAvg: faker.number.float({ fractionDigits: 18, min: 0.8 }),
        pingLatencyMsAvg: faker.number.float({ fractionDigits: 18, min: 0.5 }),
        signalQuality: faker.number.float({ fractionDigits: 18, min: 0.7 }),
        uplinkThroughput: faker.number.float({ fractionDigits: 18 })
      })
    }

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// Default response for any other request
app.use(function (req, res) {
  res.status(404)
})
