const express = require('express')
const morgan = require('morgan');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const app = express();
const chalk= require('chalk')




// DB CONNECTION
mongoose.connect(process.env.DATABASE_CLOUD, { useNewUrlParser: true, 
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true})
.then( () => console.log(chalk.inverse.green('MongoDB Connected...')))
.catch( (err) => console.log(err))




// ROUTE IMPORTS
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const propertyRoutes = require('./controllers/Propertyroute')



// APP MIDDLEWARES
app.use(morgan('dev'));
app.use(express.json({ extended: false }))
// app.use(bodyParser.json());
// app.use(cors());
app.use(cors({ origin: process.env.CLIENT_URL }));

app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api/property',propertyRoutes);



// PORT ALLOCATION FOR SERVER
const PORT = process.env.PORT || 7000;

// APP LISTENER
app.listen(PORT, 
    () => 
    console.log
    (chalk.inverse.blue
        (`Server is running on Port ${PORT}`)
    )
)