const express = require('express');
const fs = require('fs');
const { v4: uuid } = require('uuid'); // This will generate random unique ID
const createError = require('http-errors'); // You can create error and pass it to next() middleware, thi will force to trigger the ErrorHandling middleware which have 4 parameters.
const {check, validationResult} = require('express-validator'); // Validate all the fields comming in request.

const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');

const FileUploadMiddleWare = require('../middleWares/fileUpload');

const User = require('../Models/user');

const Router = express.Router();

const defaultResponse = {isSuccessfull : true};


// ------This is for Quick testing-----
// const ACCESS_TOKEN_EXPIRY_LIMIT = 1; // 5 minutes
// const REFRESH_TOKEN_EXPIRY_LIMIT = 2; // 1 Day
// ------This is for Quick testing-----
const ACCESS_TOKEN_EXPIRY_LIMIT = 5; // 5 minutes
const REFRESH_TOKEN_EXPIRY_LIMIT = 60 * 24; // 1 Day
const LIMIT_TIME_IN = 'm' // 's' for Second, 'm' for Minute, 'h' for Hour, 'd' for Day
let REFRESH_TOKENS = {}; // List of all the Refresh tokens distributed till now.



// This will return all the users list.
Router.get('/', async (req,res,next)=>{

    try {
        const users = await User.find({}, '-password').exec(); // This will fetch all the users created till now, and select everything except password.
        res.send({...defaultResponse, users : users.map(user => user.toObject({getters : true}))});
    } catch(err) {
        res.status(422);
        res.send({isSuccessfull : false, error : err})
    }
    
});

// This will return the single user's details.
Router.get('/:userId', async (req,res,next)=>{
    const {userId} = req.params;

    try {
        const user = await User.findById(userId).exec();
        if(user){
            res.send({...defaultResponse, user : user.toObject({getters : true})});
        } else {
            const error = createError.NotFound('No user found for this userId');
            next(error);
        }
        
    } catch(err) {
        res.status(422);
        res.send({isSuccessfull : false, error : err})
    }
});


// This will add a single user
const signupFieldValidator = [
    check('name').not().isEmpty().withMessage('Name is mandatory.'),
    check('email').not().isEmpty().withMessage('Email is mandatory.'),
    check('email').normalizeEmail().isEmail().withMessage('Email seems to be invalid.'),
    check('password').not().isEmpty().withMessage('Password is mandatory.'),
    check('password').isLength({min : 6}).withMessage('Password password must be at least 6 characters long.'),
];
Router.post('/signup', FileUploadMiddleWare.single('image'), signupFieldValidator, async (req,res,next)=>{
    const {name, email, password} = req.body;

    if(validationResult(req).errors.length === 0){
        try{
            const existingUsersWithThisMailId = await User.find({email : email}).exec();

            if(existingUsersWithThisMailId.length === 0){
                const hashedPassword = await bcryptjs.hash(password, 12);

                const createdUser = new User({
                    name : name,
                    email : email,
                    password : hashedPassword,
                    // imageURL : `https://picsum.photos/id/${Math.round(Math.random() * 100)}/50`,
                    imageURL : req.file.path.replace(/\\/g,'/'),
                    places : []
                });

                const access_token = jwt.sign({userId : createdUser.id}, process.env.JWT_ACCESS_TOKEN_KEY, {expiresIn : `${ACCESS_TOKEN_EXPIRY_LIMIT}${LIMIT_TIME_IN}`});
                const refresh_token = jwt.sign({userId : createdUser.id}, process.env.JWT_REFRESH_TOKEN_KEY, {expiresIn : `${REFRESH_TOKEN_EXPIRY_LIMIT}${LIMIT_TIME_IN}`});

                REFRESH_TOKENS = {...REFRESH_TOKENS, [refresh_token] : uuid()}; // Save the refresh token to verify if it exists and we have created it.
    
                await createdUser.save();
                const {id, imageURL} = createdUser.toObject({getters : true});

                res.status(200);
                res.send({...defaultResponse, user : {id, email, name, imageURL}, access_token : access_token, refresh_token : refresh_token});
            } else {
                if(req.file){
                    fs.unlink(req.file.path, ()=>{})
                }
                res.status(200);
                res.send({isSuccessfull : false, errorMessage : 'User with this email already exist.'})
                // const error = createError.Conflict('User with this email already exist.');
                // next(error);
            }
            
        } catch(err) {
            if(req.file){
                fs.unlink(req.file.path, ()=>{})
            }
            res.status(200);
            res.send({isSuccessfull : false, errorMessage : 'Something went wrong while saving details.',  error : err})
        }
    } else {
        if(req.file){
            fs.unlink(req.file.path, ()=>{})
        }
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : 'Unable to create user.', error : validationResult(req).errors})
        // res.status(422);
        // res.send({isSuccessfull : false, errors : validationResult(req).errors})
    }
});


// This will validate the Credentials entered by user, and will help user to get logged in.
Router.post('/login', async (req,res,next)=>{
    const {email, password} = req.body;
    try{
        const existingUserWithThisMailId = await User.findOne({email : email}).exec();
        if(existingUserWithThisMailId){
            const isValidPassword = await bcryptjs.compare(password, existingUserWithThisMailId.password);
            if(isValidPassword){
                const {id, email, name, imageURL} = existingUserWithThisMailId.toObject({getters : true});

                const access_token = jwt.sign({userId : id}, process.env.JWT_ACCESS_TOKEN_KEY, {expiresIn : `${ACCESS_TOKEN_EXPIRY_LIMIT}${LIMIT_TIME_IN}`});
                const refresh_token = jwt.sign({userId : id}, process.env.JWT_REFRESH_TOKEN_KEY, {expiresIn : `${REFRESH_TOKEN_EXPIRY_LIMIT}${LIMIT_TIME_IN}`});
    
                REFRESH_TOKENS = {...REFRESH_TOKENS, [refresh_token] : uuid()}; // Save the refresh token to verify if it exists and we have created it.
    
                res.status(200);
                res.send({...defaultResponse, user : {id, email, name, imageURL}, access_token : access_token, refresh_token : refresh_token});
            } else {
                res.status(200);
                res.send({isSuccessfull : false, errorMessage : 'Invalid password, Please try again.'})
            }
            
        } else {
            res.status(200);
            res.send({isSuccessfull : false, errorMessage : 'User with this E-Mail Id does not exist.'})
            // const error = createError.Forbidden('Invalid credentials, Please try again.');
            // next(error);
        }
        
    } catch(err) {
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : "Something went wrong during authentication process, please try again later.", error : err})
    }
});

Router.post('/reNewAccessToken', async (req,res,next)=>{
    const {refresh_token} = req.body;
    if(REFRESH_TOKENS[refresh_token]){

        try {
            const decodedToken = jwt.verify(refresh_token, process.env.JWT_REFRESH_TOKEN_KEY);
            const {userId} = decodedToken;

            const access_token = jwt.sign({userId : userId}, process.env.JWT_ACCESS_TOKEN_KEY, {expiresIn : `${ACCESS_TOKEN_EXPIRY_LIMIT}${LIMIT_TIME_IN}`});

            res.status(200);
            res.send({...defaultResponse, access_token : access_token});

        } catch(err){
            res.status(200);
            res.send({isSuccessfull : false, errorMessage : "UnAuthorised Access...!!!", error : err})
        }
        
    } else {
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : "This refresh token does not exist, Please log out ans login again."})
    }
});

module.exports = Router;