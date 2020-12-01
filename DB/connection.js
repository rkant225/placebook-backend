const mongoose = require('mongoose');
const chalk = require('chalk');
require('dotenv').config(); // To access environmental variables


const connectDB = async ()=>{
    // const URI_FOR_NEW_VERSION = `mongodb+srv://rkant225:rkant225@expresswithmongodb.kfytu.mongodb.net/PlaceBook?retryWrites=true&w=majority`; // DB : PlaceBook
    // const URI_DEV = `mongodb://rkant225:rkant225@expresswithmongodb-shard-00-00.kfytu.mongodb.net:27017,expresswithmongodb-shard-00-01.kfytu.mongodb.net:27017,expresswithmongodb-shard-00-02.kfytu.mongodb.net:27017/PlaceBook?ssl=true&replicaSet=atlas-h29i6x-shard-0&authSource=admin&retryWrites=true&w=majority`; // DB : PlaceBook
    // const URI_PROD = `mongodb://rkant225:rkant225@expresswithmongodb-shard-00-00.kfytu.mongodb.net:27017,expresswithmongodb-shard-00-01.kfytu.mongodb.net:27017,expresswithmongodb-shard-00-02.kfytu.mongodb.net:27017/PlaceBook_PROD?ssl=true&replicaSet=atlas-h29i6x-shard-0&authSource=admin&retryWrites=true&w=majority`; // DB : PlaceBook_PROD
    const URI = process.env.MONGO_DB_CONNECTION_URL;
    console.log('Trying to connect...')
    try{
        await mongoose.connect(URI, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex : true});
        console.log(chalk.blueBright('Connected to database successfully...!!!'))
    }catch{
        console.log(chalk.red('Unable to connect to database..!!!'));
        process.exit(1);
    }
}

module.exports = {
    connectDB : connectDB,
};