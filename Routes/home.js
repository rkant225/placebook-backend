const express = require('express');

const router = express.Router();

router.get('/', (req,res,next)=>{
    res.send({message : "Hey there, It's working....!!!"})
});

module.exports = router;