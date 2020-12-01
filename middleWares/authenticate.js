const jwt = require('jsonwebtoken');

const Authenticate = (req, res, next) =>{
    const token = req.headers && req.headers.authorization && req.headers.authorization.split(' ')[1] ? req.headers.authorization.split(' ')[1] : "";
    if(token){

        const decodedToken = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_KEY);
        const {userId} = decodedToken;
        req.authenticatedUserId = userId; // This will be used in the protected routes to verify that the correct user is performing the action.

        next();

    } else {
        res.status(200);
        res.send({isSuccessfull : false, errorMessage : "Unauthorised access."})
    }
}

module.exports = Authenticate;