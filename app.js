const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const path = require('path');
const app = express();

const ip = 'localhost';
const port = 3000;

// Configuración de la conexión a la base de datos (para ambas bases)
const pool = mysql.createPool({
    host: 'calendarioymas.cl4ameyi8vh6.us-east-1.rds.amazonaws.com', // El host sigue siendo el mismo
    user: 'admin',
    password: '15423803salvador',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});

// Configuración de middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Configuración de archivos estáticos
app.use(express.static(path.join(__dirname)));

// Ruta para la página principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'HTML', 'Inicio.html'));
});

// Ruta para el formulario de contacto
app.post('/submit-form', (req, res) => {
    const { nombre, apellidos, celular, gmail, descripcion } = req.body;

    // Cambiar a la base de datos 'consultas'
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error al obtener conexión:', err.stack);
            res.status(500).send('Ocurrió un error al procesar tu consulta.');
            return;
        }

        connection.changeUser({ database: 'consultas' }, (err) => {
            if (err) {
                console.error('Error al cambiar a la base de datos consultas:', err.stack);
                connection.release();
                res.status(500).send('Ocurrió un error al procesar tu consulta.');
                return;
            }

            const query = 'INSERT INTO Contactanos (nombre, apellidos, celular, gmail, descripcion) VALUES (?, ?, ?, ?, ?)';
            connection.query(query, [nombre, apellidos, celular, gmail, descripcion], (err, result) => {
                if (err) {
                    console.error('Error al insertar datos en Contactanos: ' + err.stack);
                    res.status(500).send('Ocurrió un error al procesar tu consulta.');
                } else {
                    // Redirige a la página de inicio después de enviar el formulario
                    res.redirect('/');
                }
                connection.release();
            });
        });
    });
});

// Ruta para obtener los eventos del día (hoy)
app.get('/api/eventos', (req, res) => {
    pool.getConnection((err, connection) => {
        if (err) {
            console.error('Error al obtener conexión:', err.stack);
            res.status(500).send('Ocurrió un error al conectar con la base de datos.');
            return;
        }

        connection.changeUser({ database: 'calendario' }, (err) => {
            if (err) {
                console.error('Error al cambiar a la base de datos calendario:', err.stack);
                connection.release();
                res.status(500).send('Ocurrió un error al cambiar la base de datos.');
                return;
            }

            // Consulta para los eventos de hoy
            const queryHoy = 'SELECT * FROM Calendario WHERE fecha = CURDATE() ORDER BY fecha;';

            connection.query(queryHoy, (err, resultsHoy) => {
                if (err) {
                    console.error('Error al obtener los eventos de hoy:', err.stack);
                    res.status(500).send('Ocurrió un error al obtener los eventos.');
                    connection.release();
                    return;
                }

                // Devuelve los resultados al cliente
                res.json({
                    hoy: resultsHoy || [], // Devolver eventos de hoy o un array vacío
                });

                connection.release();
            });
        });
    });
});

// Inicia el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://${ip}:${port}`);
});
