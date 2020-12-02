const multer = require('multer'); // This is a middleware, used to extract the data from request which is of type "formData" (not the JSON). Note : Form data can carry Binary data as well, but JSON can't.
const { v4: uuid } = require('uuid'); // This will generate random unique ID
const fs = require('fs');
const path = require('path');


// Allowed file types.
const MIME_TYPE_TO_FILE_EXTENSION_MAPPER = {
    'image/jpeg' : 'jpeg',
    'image/png' : 'png',
    'image/jpg' : 'jpg',
}

const FileUpload = multer({
    limits : 1024000, // Allowed file size.
    storage : multer.diskStorage({
        destination : (req, file, cb)=>{
            if(!fs.existsSync(path.join(__dirname, '../Uploads'))){
                console.log('I am called...for UPLOADS')
                fs.mkdirSync(path.join(__dirname, '../Uploads'))
            }
            if(!fs.existsSync(path.join(__dirname, '../Uploads/images'))){
                console.log('I am called...for IMAGES')
                fs.mkdirSync(path.join(__dirname, '../Uploads/images'))
            }
            cb(null, 'Uploads/images') // LocalStorage path in server.
        },
        filename : (req, file, cb)=>{
            const fileExtension = MIME_TYPE_TO_FILE_EXTENSION_MAPPER[file.mimetype];
            cb(null, `${uuid()}.${fileExtension}`) // Math.random().toString(36).split('.')[1]
        }
    }),
    fileFilter : (req, file, cb)=>{
        const isValid = !!MIME_TYPE_TO_FILE_EXTENSION_MAPPER[file.mimetype]; // !! is BANG operator, it is used to convert falsy values to boolen FALSE.  !!undefined -> false
        const error = isValid ? null : new Error('Unsupported file type.');
        cb(error, isValid);
    }
});

module.exports = FileUpload; // Export this middleware.