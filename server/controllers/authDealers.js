const Dealer = require('../models/dealer')
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const { registerEmailParams, forgotPasswordEmailParams } = require('../helpers/email')
const fs = require('fs')
const {v4: uuidv4} = require('uuid');




AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
})

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

//Dealer Register function. setting up dealer's credentials and using amazon SES service for email verification
exports.dealerRegister = (req, res) => {
    // console.log('REGISTER CONTROLLER', req.body);
    const { 
        firstName,
        lastName, 
        email, 
        password, 
        address, 
        officeAddress, 
        serviceDescription, 
        cellPhone, 
        cnicNumber, 
        city, 
        country }
    = req.body
    // check if dealer exists in our db
    Dealer.findOne({ email }).exec((err, dealer) => {
        if (dealer) {
            return res.status(400).json({
                error: 'Email is taken'
            })
        }
        // generate token with dealer name email and password
        const token = jwt.sign({ firstName, lastName, email, password, address, officeAddress, serviceDescription, cellPhone, cnicNumber, city, country }, process.env.JWT_ACCOUNT_ACTIVATION, {
            expiresIn: '10m'
        })

        // send email
        const params = registerEmailParams(email, token);

        const sendEmailOnRegister = ses.sendEmail(params).promise();

        sendEmailOnRegister
            .then(data => {
                console.log('email submitted to SES', data);
                res.json({
                    message: `Email has been sent to ${email}, Follow the instructions to complete your registration`
                })
            })
            .catch(error => {
                console.log('ses email on register', error);
                res.json({
                    message: `We could not verify your email. Please try again`
                })
            })
    })
}


// Activation Controller
exports.registerActivateDealer = (req, res) => {
    const { token } = req.body;
    // console.log(token);
    jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION, function(err, decoded) {
        if (err) {
            return res.status(401).json({
                error: 'Expired link. Try again'
            });
        }

        const { 
            firstName, 
            lastName, 
            email, 
            password, 
            address, 
            officeAddress, 
            serviceDescription, 
            cellPhone, 
            cnicNumber, 
            city, 
            country } 
        = jwt.decode(token)

        Dealer.findOne({ email }).exec((err, dealer) => {
            if (dealer) {
                return res.status(401).json({
                    error: 'Email is taken'
                })
            }

            // HANDLING THE IMAGE USING S3
                const s3 = new AWS.S3({
                accessKeyId: "AKIA5IYE5CCHY6LFFOFJ",
                secretAccessKey: "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",
                Bucket:"cnic-bucket",
            })

            let myFile = req.file.originalname.split(".")
            const fileType = myFile[myFile.length - 1]
            
            var params ={
            ContentEncoding: 'base64',
            ContentType: req.file.mimetype,
            Bucket:"cnic-bucket",
            Key: `${uuidv4()}.${fileType}`,
            Body: fs.createReadStream(req.file.path)
        }

        s3.upload(params, (error, data)=>{
            if(error){
                res.status(500).send(error)
            }
            if(data){
                fs.unlinkSync(req.file.path);
                const locationUrl = data.Location;
                const newDealer = new Dealer({ firstName, lastName, email, password, address, officeAddress, serviceDescription, cellPhone, cnicNumber, city, country })
                newDealer = new Dealer({...req.body,image:locationUrl});
                newDealer.save().then(console.log(newDealer))
                var result={
                    newDealer:newDealer          
                }
                res.send(result);
                console.log(data);
            }
        })
            // register new dealer
            // newDealer.save((err, result) => {
            //     if (err) {
            //         return res.status(401).json({
            //             error: 'Error saving dealer in database. Try later'
            //         })
            //     }
            //     return res.json({
            //         message: 'Dealer Registration success. Please login.'
            //     })
            // })
        })
    })
}

// --------------------------LOGIN------------------------------------ //   
exports.loginDealer = (req, res) => {
    const { email, password } = req.body;
    // console.table({ email, password });
    Dealer.findOne({ email }).exec((err, dealer) => {
        if (err || !dealer) {
            return res.status(400).json({
                error: 'Dealer with that email does not exist. Please register.'
            })
        }
        // authenticate
        if (!dealer.authenticate(password)) {
            return res.status(400).json({
                error: 'Email and password do not match'
            })
        }
        // generate token and send to client
        const token = jwt.sign({ _id: dealer._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        const { _id, name, email, role } = dealer;

        return res.json({
            token,
            dealer: { _id, name, email, role }
        })
    })
}

exports.requireSignin = expressJwt({ secret: process.env.JWT_SECRET,
    algorithms: ['HS256'] }) // req.dealer._id


exports.authMiddleware = (req, res, next)=>{
    const authDealerId = req.dealer._id;
    Dealer.findOne({_id: authDealerId}).exec((err, dealer)=>{
        if(err || !dealer){
            return res.status(400).json({
                error: "Dealer not found"
            });
        }
        req.profile = dealer
        next()
    })
}



exports.forgotPassword = (req, res) => {
    const { email } = req.body
    // check if dealer exists with that email
    Dealer.findOne({ email }).exec((err, dealer) => {
        if (err || !dealer) {
            return res.status(400).json({
                error: 'Dealer with that email does not exist'
            })
        }
        // generate token and email to dealer
        const token = jwt.sign({ name: dealer.name }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' })
        // send email
        const params = forgotPasswordEmailParams(email, token)
        // populate the db > dealer > resetPasswordLink
        return dealer.updateOne({ resetPasswordLink: token }, (err, success) => {
            if (err) {
                return res.status(400).json({
                    error: 'Password reset failed. Try later.'
                })
            }
            const sendEmail = ses.sendEmail(params).promise();
            sendEmail
                .then(data => {
                    console.log('ses reset pw success', data);
                    return res.json({
                        message: `Email has been sent to ${email}. Click on the link to reset your password`
                    })
                })
                .catch(error => {
                    console.log('ses reset pw failed', error);
                    return res.json({
                        message: `We could not vefiry your email. Try later.`
                    })
                })
        })
    })
}


exports.resetPassword = (req, res) => {
    const { resetPasswordLink, newPassword } = req.body;
    if (resetPasswordLink) {
        // check for expiry
        jwt.verify(resetPasswordLink, process.env.JWT_RESET_PASSWORD, (err, success) => {
            if (err) {
                return res.status(400).json({
                    error: 'Expired Link. Try again.'
                })
            }
            Dealer.findOne({ resetPasswordLink }).exec((err, dealer) => {
                if (err || !dealer) {
                    return res.status(400).json({
                        error: 'Invalid token. Try again'
                    })
                }
                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                }
                dealer = _.extend(dealer, updatedFields);
                dealer.save((err, result) => {
                    if (err) {
                        return res.status(400).json({
                            error: 'Password reset failed. Try again'
                        })
                    }
                    res.json({
                        message: `Great! Now you can login with your new password`
                    })
                })
            })
        })
    }
}