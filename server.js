const express = require('express'); // Import Express, this will give you a lot of flexibitity that was not there in older method. It follows the middleware bases approach.
const BodyParser = require('body-parser'); // Import body-parser this will extract the json object passes by client in request body.
const createError = require('http-errors'); // Import http-errors to trigger different types of errors.
const chalk = require('chalk'); // This will help you to write color full text in console.
const cors = require('cors');
const fs = require('fs'); // File system, this will help us in accessing local file system. We will use it to delete the file if any operation causes error in dataBase (like : saving the data, updating the data etc.)
const path = require('path');

require('dotenv').config(); // To access environmental variables

const usersRoute = require('./Routes/users');
const placeRoutes = require('./Routes/places');
const homeRoutes = require('./Routes/home');



const Port = process.env.PORT; // Define a PORT on which our Server will run.
const app = express(); // Execute method returned by Import statement of Express and create your application

//----Allow CORS----
app.use(cors());
//----Allow CORS----

//----Static files serving middleware----
app.use('/Uploads/images', express.static(path.join('Uploads', 'images'))); // path.join() -> 'Uploads\\images'
//----Static files serving middleware----

//----DataBAse Connection----
const {connectDB} = require('./DB/connection'); // Import and establish MongoDB connection to ATLAS
connectDB();
//----DataBAse Connection----



//----Body-Parser Middleware----
app.use(BodyParser.json()); // BodyParser middleware : This will extract JSON body passes from client and add to "body" property in request.
//----Body-Parser Middleware----



//----Routes----
app.use(homeRoutes);
app.use('/api/users', usersRoute);
app.use('/api/places', placeRoutes);
//----Routes----



//----Error Handling if none of the routes matched----

// This will be executed only when none of the routes sent response to the client. This will create an error and pass to error handling middleware.
app.use((req, res, next)=>{ 
  const error = createError.NotFound('This path does not exist.');
  next(error);
});


// Error handling Middleware (it must get 4 paramerers)
app.use((err, req, res, next)=>{
  if(req.file){ // This will delete a mistakenly saved file, because some error occured during DB operationd (sdd, update, delete etc.)
    fs.unlink(req.file.path, ()=>{})
  }
  res.status(err.status || 200);
  res.send({isSuccessfull : false, status : err.status || 200, errorMessage : err.message || 'Something went wrong.'});
})

//----Error Handling if none of the routes matched----





app.listen(Port, ()=>{console.log(chalk.yellowBright(`Backend server started and listening at PORT : ${Port}`))});