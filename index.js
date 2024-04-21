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

// Root endpoint
app.get('/', (req, res, next) => {
  res.json({ message: 'Ok' })
})

// Start server
app.listen(process.env.PORT, () => {
  console.log('Server running on port %PORT%'.replace('%PORT%', process.env.PORT))
})

// ENDPOINTS PARA CLIENTES

app.get('/api/Clientes', async (req, res, next) => {
  try {
    const sql = 'SELECT * FROM Clientes'
    const { rows: data } = await db.query(sql)

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Clientes', async (req, res, next) => {
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
  const { phone, name, address, clinumber, zip, email, rfc, active, note, contacts } = req.body

  const contactos = contacts ?? []

  try {
    const sql = 'INSERT INTO Clientes (phone,name,address,clinumber,zip,email,rfc,active,note) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *'

    const { rows } = await db.query(sql, [phone, name, address, clinumber, zip, email, rfc, active, note ?? ''])

    if (contactos.length && rows && rows[0]?.id) {
      const sql2 = 'INSERT INTO Contactos (clientid,phone,name,position,active,note) VALUES ($1,$2,$3,$4,$5,$6)'

      for (let i = 0; i < contactos.length; i++) {
        const { phone: cphone, name: cname, position: cposition, active: cactive, note: cnote } = contactos[i]
        await db.query(sql2, [rows[0]?.id, cphone, cname, cposition, cactive, cnote])
      }
    }

    const { rows: data } = await db.query('SELECT * FROM Clientes')

    res.json({
      message: 'success',
      data: [...data]
    })
  } catch (error) {
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Clientes/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT * FROM Clientes WHERE id = $1', [req.params.id])

    let contactos = []
    if (rows) {
      const { rows: data } = await db.query('SELECT * FROM Contactos WHERE clientid = $1', [req.params.id])
      contactos = data
    }

    res.json({
      message: 'success',
      data: { ...rows[0], contactos }
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Clientes/:id', async (req, res, next) => {
  try {
    const { phone, name, address, clinumber, zip, email, rfc, active, note } = req.body
    const sql = `UPDATE Clientes set
    phone = $1,
    name = $2,
    address = $3,
    clinumber = $4,
    zip = $5,
    email = $6,
    rfc = $7,
    active = $8,
    note = $9
    WHERE id = $10 RETURNING *`
    await db.query(sql, [phone, name, address, clinumber, zip, email, rfc, active, note, req.params.id])

    const { rows: data } = await db.query('SELECT * FROM Clientes')

    res.json({
      message: 'success',
      data: [...data]
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Clientes/:id', async (req, res, next) => {
  try {
    const sql = 'DELETE FROM Clientes WHERE id = $1 RETURNING *'
    const { rows } = await db.query(sql, [req.params.id])

    let data = []
    if (rows && rows[0]) {
      const { rows: info } = await db.query('SELECT * FROM Clientes')
      data = info
    }

    res.json({ message: 'deleted', data })
  } catch (error) {
    res.json({ error: error.message })
  }
})

// ENDPOINTS PARA ADMIN

app.get('/api/Admins', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Admin')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Admins/:id', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Admin WHERE id = $1', [req.params.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Admins', async (req, res, next) => {
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
  const {
    name,
    email,
    password
  } = req.body
  try {
    const sql = 'INSERT INTO Admin (email, name, password, active) VALUES ($1,$2,$3,$4) RETURNING *'

    const { rows } = await db.query(sql, [[email, name, md5(password), '' + 1]])

    res.json({
      message: 'success',
      ...rows[0],
      id: this.lastID
    })
  } catch (error) {
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Admins/:id', async (req, res, next) => {
  try {
    const {
      id,
      name,
      email
    } = req.body
    const password = req.body.hasNewPass ? md5(req.body.password) : (req.body.password ?? '')
    const active = req.body.active ?? '' + 1

    const sql = `UPDATE Admin set
    email = $1,
    name = $2,
    password = $3,
    active = $4,
    WHERE id = $5 RETURNING *`

    const { rows: data } = await db.query(sql, [email, name, password, active, id])

    res.json({
      message: 'success',
      ...data[0]
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Admins/:id', async (req, res, next) => {
  try {
    const sql = 'DELETE FROM Admin WHERE id = $1 RETURNING *'
    const { rows } = await db.query(sql, [req.params.id])

    res.json({ message: 'deleted', data: rows[0] })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// ENDPOINTS PARA CONTACTOS

app.get('/api/Contactos', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Contactos')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Contactos/:id', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Contactos WHERE id = $1', [req.params.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Contactos/:id', async (req, res, next) => {
  try {
    const {
      clientid,
      name,
      phone
    } = req.body

    const position = req.body.position ?? ''
    const note = req.body.note ?? ''
    const active = req.body.active ?? '' + 1

    const sql = `UPDATE Contactos set
    clientid = $1,
    name = $2,
    phone = $3,
    position = $4,
    note = $5,
    active = $6
    WHERE id = $7 RETURNING *`

    const { rows: data } = await db.query(sql, [clientid, name, phone, position, note, active, req.params.id])

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

app.get('/api/Users', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Users')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Users/:id', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Users WHERE id = $1', [req.params.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Users', async (req, res, next) => {
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
  const {
    clientid,
    email,
    name
  } = req.body

  const password = md5('' + req.body.password)
  const active = req.body.active ?? ''
  const type = req.body.type ?? '' + 1
  try {
    const sql = 'INSERT INTO Users (clientid,email,name,password,active,type) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *'

    const { rows: data } = await db.query(sql, [clientid, email, name, password, active, type])

    res.json({
      message: 'success',
      ...data[0],
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Users/:id', async (req, res, next) => {
  try {
    const {
      clientid,
      email,
      name
    } = req.body

    const password = md5('' + req.body.password)
    const active = req.body.active ?? ''
    const type = req.body.type ?? '' + 1

    let queryPass = ''
    const params = [clientid, name, active, type, email]
    if (req.body.hasNewPassword) {
      queryPass = ',password = $6'
      params.push(password)
    }

    const sql = `UPDATE Users set
    clientid = $1,
    name = $2,
    active = $3,
    type = $4,
    email = $5${queryPass}
    WHERE id = ${req.body.hasNewPassword ? '$7' : '$6'} RETURNING *`

    const { rows: data } = await db.query(sql, params)

    res.json({
      message: 'success',
      ...data[0]
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Users/:id', async (req, res, next) => {
  try {
    const sql = 'DELETE FROM Users WHERE id = $1 RETURNING *'

    const { rows } = await db.query(sql, [req.params.id])

    res.json({ message: 'deleted', data: rows[0] })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

// ENDPOINTS PARA TERMINALES

app.get('/api/Terminales', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Terminales')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Terminales/:id', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Terminales WHERE id = $1', [req.params.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.put('/api/Terminales/:id', async (req, res, next) => {
  try {
    const {
      name,
      lat,
      lng,
      alias,
      variable
    } = req.body
    const id = req.params.id

    const sql = `UPDATE Terminales set
                       name = $1,
                       lat = $2,
                       lng = $3,
                       alias = $4,
                       variable = $5
                       WHERE id = $6 RETURNING *`

    const { rows } = await db.query(sql, [name, lat, lng, alias, variable, id])

    res.json({
      message: 'success',
      ...rows[0]
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Terminales/:id', async (req, res, next) => {
  try {
    const sql = 'DELETE FROM Terminales WHERE id = ? RETURNING *'
    const { rows } = await db.query(sql, [req.params.id])

    res.json({ message: 'deleted', data: rows[0] })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

//* * ******* AUTH *********
app.get('/api/Login', async (req, res, next) => {
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

    const { rows } = await db.query('SELECT * FROM Admin WHERE email = $1 AND password = $2', [req.query.email, md5('' + req.query.password)])
    data = rows[0]

    if (!data || !data?.id) {
      const { rows: user } = await db.query('SELECT * FROM Users WHERE email = $1 AND password = $2', [req.query.email, md5('' + req.query.password)])
      isPowerUser = 0
      data = user[0]
    }

    res.json({
      message: 'success',
      data: { ...data, isPowerUser, type: data?.type ?? 0 } ?? {}
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

//* * **** ENDPOINTS CLIENTES WEB *******

app.get('/api/getClientContactos', async (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const { rows: data } = await db.query('SELECT * FROM Contactos WHERE clientid = $1', [req.query.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Contactos', async (req, res, next) => {
  const errors = []
  if (!req.body.phone) {
    errors.push('No phone specified')
  }
  if (!req.body.clientid) {
    errors.push('No clientid specified')
  }
  if (!req.body.name) {
    errors.push('No name specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  const {
    clientid,
    name,
    phone
  } = req.body

  const position = req.body.position ?? ''
  const note = req.body.note ?? ''
  const active = req.body.active ?? '' + 1
  try {
    const params = [clientid, phone, name, position, active, note]
    const sql = 'INSERT INTO Contactos (clientid,phone,name,position,active,note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *'
    const { rows: data } = await db.query(sql, params)

    res.json({
      message: 'success',
      ...data[0],
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Contactos/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM Contactos WHERE id = $1 RETURNING *', [req.params.id])

    res.json({ message: 'deleted', data: rows })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getClientUser', async (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const { rows: data } = await db.query('SELECT * FROM Users WHERE clientid = $1', [req.query.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getClientTerminalesAllCli', async (req, res, next) => {
  try {
    if (!req.query.id) {
      res.status(400).json({ error: 'No id' })
      return
    }

    const { rows: data } = await db.query('SELECT t.*, tc.clientid, tc.id AS assignid FROM TerminalesClientes tc JOIN Terminales t ON tc.terminalId = t.id WHERE tc.clientid = $1', [req.query.id])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getAsigment', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT t.*, c.email, c.name AS clientName, u.email AS fullName, tc.id AS assignid, tu.id AS assignuserid, tc.clientid AS clientid FROM TerminalesClientes tc JOIN Terminales t ON tc.terminalId = t.id JOIN Clientes c ON tc.clientid = c.id JOIN TerminalesUsers tu ON tc.id = tu.assignid JOIN Users u ON tu.userId = u.id')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/getAsigmentUser', async (req, res, next) => {
  try {
    if (!req.query.UserId) {
      res.status(400).json({ error: 'No UserId' })
      return
    }

    const { rows: data } = await db.query('SELECT t.*, c.email, c.name AS clientName, u.email AS fullName, tc.clientid, tc.id AS assignid, tu.id AS assignuserid FROM TerminalesUsers tu JOIN TerminalesClientes tc ON tu.assignid = tc.id JOIN Terminales t ON tc.terminalId = t.id JOIN Clientes c ON tc.clientid = c.id JOIN Users u ON tu.userId = u.id WHERE tu.userId = $1', [req.query.UserId])

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/Assigns/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM TerminalesUsers WHERE id = $1 RETURNING *', [req.params.id])

    res.json({
      message: 'success',
      ...rows[0],
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/TerminalNotAsigment', async (req, res, next) => {
  try {
    const { rows: data } = await db.query('SELECT * FROM Terminales WHERE id NOT IN (SELECT terminalId FROM TerminalesClientes)')

    res.json({
      message: 'success',
      data
    })
  } catch (error) {
    console.log(error)
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/Client_TerminalAll', async (req, res, next) => {
  const errors = []
  if (!Array.isArray(req.body)) {
    errors.push('No terminals specified')
  } else {
    let allHasData = true
    req.body.forEach(el => {
      const { terminalId, clientid } = el
      if (!terminalId || !clientid) {
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
    const sql = 'INSERT INTO TerminalesClientes (clientid,terminalId) VALUES ($1,$2)'

    const terminales = req.body

    for (let i = 0; i < terminales.length; i++) {
      const { clientid, terminalId } = terminales[i]
      await db.query(sql, [clientid, terminalId])
    }

    res.json({
      message: 'success'
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.delete('/api/ClientTerminals/:id', async (req, res, next) => {
  try {
    const { rows } = await db.query('DELETE FROM TerminalesClientes WHERE id = $1 RETURNING *', [req.params.id])

    res.json({
      message: 'success',
      ...rows[0],
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.post('/api/AssignsALL', async (req, res, next) => {
  const errors = []
  if (!Array.isArray(req.body)) {
    errors.push('No info specified')
  } else {
    let allHasData = true
    req.body.forEach(el => {
      const { terminalId, clientid, userId } = el
      if (!terminalId || !clientid || !userId) {
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
    const assign = req.body

    const sql = 'SELECT id FROM TerminalesClientes WHERE terminalId = $1 AND clientid = $2'

    for (let i = 0; i < assign.length; i++) {
      const { userId, terminalId, clientid } = assign[i]

      const { rows } = await db.query(sql, [terminalId, clientid])
      const { id } = rows[0]
      try {
        await db.query('INSERT INTO TerminalesUsers (userId,assignid) VALUES ($1,$2) RETURNING *', [userId, id])
      } catch (error) {}
    }

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
app.post('/api/TerminalesClientes', async (req, res, next) => {
  const errors = []
  if (!req.body.clientid) {
    errors.push('No clientid specified')
  }
  if (!req.body.terminalId) {
    errors.push('No terminalId specified')
  }
  if (errors.length) {
    res.status(400).json({ error: errors.join(',') })
    return
  }
  try {
    const sql = 'INSERT INTO TerminalesClientes (clientid,terminalId) VALUES ($1,$2) RETURNING *'

    const { rows } = await db.query(sql, ['' + req.body.clientid, '' + req.body.terminalId])

    res.json({
      message: 'success',
      ...rows[0],
      id: this.lastID
    })
  } catch (error) {
    console.log(error)
    // SQLITE_CONSTRAINT error cuando se repite correo
    res.status(400).json({ error: error.message })
  }
})

app.get('/api/Assigns', async (req, res, next) => {
  try {
    const { rows: info } = await db.query('SELECT * FROM TerminalesUsers')

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
