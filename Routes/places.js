const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
// const { v4: uuid } = require('uuid'); // This will generate random unique ID
const createError = require('http-errors'); // You can create error and pass it to next() middleware, thi will force to trigger the ErrorHandling middleware which have 4 parameters.
const {check, validationResult} = require('express-validator'); // Validate all the fields comming in request.

//Middleware
const FileUploadMiddleWare = require('../middleWares/fileUpload');
const Authenticate = require('../middleWares/authenticate');

// Models
const Place = require('../Models/place');
const User = require('../Models/user');

// Express Router
const Router = express.Router();

// Default response
const defaultResponse = {isSuccessfull : true};


// This will return all the places
Router.get('/', async (req,res,next)=>{
    try{
        const places = await Place.find().populate('userId').exec();

        const filalPlacesListWithoutUserPassword = places.map(place => {
            const placeWithGetter = place.toObject({getters : true});
            placeWithGetter.userId.password = "";
            return placeWithGetter;
        });

        const finalResponse = {...defaultResponse, places : filalPlacesListWithoutUserPassword}; // '{getters : true}' will convert '_id' to 'id'
        res.send(finalResponse);
    } catch(err){
        res.status(200);
        res.send({isSuccessfull : false, error : err});
    }
});


// This will return a single place which matches the 'placeId'.
Router.get('/:placeId', async (req,res,next)=>{
    const {placeId} = req.params;
    try{
        const place = await Place.findById(placeId).exec();
        if(place){
            const finalResponse = {...defaultResponse, place : place.toObject({getters : true})};
            res.send(finalResponse);
        } else {
            const error = createError.NotFound('No place found for this placeId.');
            next(error);
        }
    } catch(err){
        res.status(200);
        res.send({isSuccessfull : false, error : err});
    }
});


// This will return the list of all the places whose creater is user having user Id of 'userId'.
Router.get('/placesOfUser/:userId', async (req,res,next)=>{
    const {userId} = req.params;
    try{
        const places = await Place.find({userId : userId}).exec();
        const finalResponse = {...defaultResponse, places : places.map(place => place.toObject({getters : true}))};
        res.status(200);
        res.send(finalResponse);
    } catch(err){
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : 'Unable to retrive places.', error : err});
    }
})


// This will add new Place to database.
const AddNewPlaceFieldValidator = [
    check('userId').not().isEmpty().withMessage('User Id is Madatory.'),
    check('title').not().isEmpty().withMessage('Title is Madatory.'),
    check('description').not().isEmpty().withMessage('Description is Madatory.'),
    check('description').isLength({min : 10}).withMessage('Description must contain at least 10 characters.'),
    check('address').not().isEmpty().withMessage('Address is Madatory.')
];
Router.post('/', Authenticate, FileUploadMiddleWare.single('image'), AddNewPlaceFieldValidator, async (req,res,next)=>{

    const {userId, title, description, address} = req.body;

    if(req.authenticatedUserId == userId){
        if(validationResult(req).errors.length === 0){ // Check if all the inputs are valid. Verify that Error array is empty.
            try{
                const existingUser = await User.findById(userId).exec(); // Get user with 'userId'
                           
                if(existingUser){ // Check if user exist.
                    const createdPlace = new Place({
                        userId,
                        title,
                        description,
                        address,
                        // imageURL : `https://picsum.photos/id/${Math.round(Math.random() * 100)}/500`,
                        imageURL : req.file.path.replace(/\\/g,'/'),
                        coordinates : {
                            lat : Math.round((Math.random()) * 10000) / 100,
                            lng : Math.round((Math.random()) * 10000) / 100
                        }
                    });
    
                    // Now we will save this place and along with this we will create a connection between existing 'user' and this new 'place'.
                    // As we are doing 2 operations on database, so we must do them in a session.
                    // If any of the operation fails then mongoose will rollback the changes. (if any one is completed)
                    const session = await mongoose.startSession(); // Create a session
                    session.startTransaction(); // Start a transaction
                    
                    await createdPlace.save({session : session}); // Save new place, (Temprerly under session)
    
                    existingUser.places.push(createdPlace); // Establish the connection between newly created place and existing user.
                    await existingUser.save({session : session}); // Save the user (Temprerly under session)
    
                    await session.commitTransaction();  // Finaly if every thing goes well then save changes permanently.
    
                    res.status(201);
                    res.send({...defaultResponse, place : createdPlace});
    
                } else {
                    const error = createError.NotFound('Unable to save place because provided user Id does not belongs to any user.');
                    next(error);
                }
                
            } catch(err) {
                res.status(200);
                res.send({isSuccessfull : false, error : err});
            }
        } else {
            res.status(200);
            res.send({isSuccessfull : false, errors : [...validationResult(req).errors]});
        }
    } else {
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : "Unauthorised Access, It seems that you are not the owner of this place."});
    }
    
    
})


// This will update a place with new data
const EditPlaceFieldValidator = [
    check('placeId').not().isEmpty().withMessage('Place Id is Madatory.'),
    check('title').not().isEmpty().withMessage('Title is Madatory.'),
    check('description').not().isEmpty().withMessage('Description is Madatory.'),
    check('description').isLength({min : 10}).withMessage('Description must contain at least 10 characters.'),
    check('address').not().isEmpty().withMessage('Address is Madatory.')
];
Router.patch('/', Authenticate, EditPlaceFieldValidator, async (req,res,next)=>{
    const {placeId, title, description, address} = req.body;
    if(validationResult(req).errors.length === 0){
        try{
            const place = await Place.findById(placeId).exec();
                if(place){
                    if(req.authenticatedUserId == place.userId){
                        place.title = title;
                        place.description = description;
                        place.address = address;
                        
                        await place.save();
                        const finalResponse = {...defaultResponse, place : place.toObject({getters : true})};
        
                        res.status(200);
                        res.send(finalResponse);
                    } else {
                        res.status(200);
                        res.send({isSuccessfull : false, errorMessage : "Unauthorised Access, It seems that you are not the owner of this place."});
                    }
                } else {
                    const error = createError.NotFound('No place found for this placeId.');
                    next(error);
                }
            
            
        } catch(err){
            res.status(200);
            res.send({isSuccessfull : false, error : err});
        }
    } else {
        res.status(200);
        res.send({isSuccessfull : false, errors : [...validationResult(req).errors]});
    }
})

// This will delete a place
Router.delete('/:placeId', Authenticate, async (req,res,next)=>{
    const {placeId} = req.params;
    try{
        // const place = await Place.findById(placeId).exec();
        const place = await Place.findById(placeId).populate('userId').exec(); // Populate will find the User document and populate is's cimplete 'object' instead of populating it with just 'userId'.

        if(place){
            if(req.authenticatedUserId == place.userId.id){
                const imagePath = place.imageURL; // Get the path of Image.
                const session = await mongoose.startSession(); // Create a session
                session.startTransaction(); // Start a transaction
    
                place.userId.places.pull(place); // Remove the refrence of place from user's places list.
                await place.userId.save({session : session}); // Save the user model. (Temprerly under session)
    
                await place.remove({session : session}); // Delete the place, (Temprerly under session)
    
                await session.commitTransaction();  // Finaly if every thing goes well then save changes permanently.
    
                fs.unlink(imagePath, ()=>{}); // Delete the linked picture from local storage.
    
                res.status(200);
                res.send({...defaultResponse});
            } else {
                res.status(200);
                res.send({isSuccessfull : false, errorMessage : "Unauthorised Access, It seems that you are not the owner of this place."});
            }
            
        } else {
            const error = createError.NotFound('No place found for this placeId.');
            next(error);
        }
    } catch(err){
        res.status(200);
        res.send({isSuccessfull : false, error : err});
    }
})


module.exports = Router;