const express = require('express');

const router = express.Router();

router.get('/', (req,res,next)=>{
    res.send({message : "Hey there, We are online. Server is up and running....!!!", developedBy : 'Rahul Singh', emailId : 'rkant225@gmail.com', gitHub : 'https://github.com/rkant225'})
});

module.exports = router;