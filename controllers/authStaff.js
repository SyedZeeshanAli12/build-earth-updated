const Staff = require('../models/staff')
const AWS = require('aws-sdk')
const jwt = require('jsonwebtoken')
const expressJwt = require('express-jwt')
const { registerEmailParams, forgotPasswordEmailParams } = require('../helpers/email')




AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
})

const ses = new AWS.SES({ apiVersion: '2010-12-01' });

//Staff Register function. setting up staff's credentials and using amazon SES service for email verification
exports.staffRegister = (req, res) => {
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
    // check if staff exists in our db
    Staff.findOne({ email }).exec((err, staff) => {
        if (staff) {
            return res.status(400).json({
                error: 'Email is taken'
            })
        }
        // generate token with staff name email and password
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
exports.registerActivateStaff = (req, res) => {
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

        Staff.findOne({ email }).exec((err, staff) => {
            if (staff) {
                return res.status(401).json({
                    error: 'Email is taken'
                })
            }

            // register new staff
            const newStaff = new Staff({ firstName, lastName, email, password, address, officeAddress, serviceDescription, cellPhone, cnicNumber, city, country })
            newStaff.save((err, result) => {
                if (err) {
                    return res.status(401).json({
                        error: 'Error saving staff in database. Try later'
                    })
                }
                return res.json({
                    message: 'Staff Registration success. Please login.'
                })
            })
        })
    })
}

// --------------------------LOGIN------------------------------------ //   
exports.loginStaff = (req, res) => {
    const { email, password } = req.body;
    // console.table({ email, password });
    Staff.findOne({ email }).exec((err, staff) => {
        if (err || !staff) {
            return res.status(400).json({
                error: 'Staff member with that email does not exist. Please register.'
            })
        }
        // authenticate
        if (!staff.authenticate(password)) {
            return res.status(400).json({
                error: 'Email and password do not match'
            })
        }
        // generate token and send to client
        const token = jwt.sign({ _id: staff._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
        const { _id, name, email, role } = staff;

        return res.json({
            token,
            staff: { _id, name, email, role }
        })
    })
}

exports.requireSignin = expressJwt({ secret: process.env.JWT_SECRET,
    algorithms: ['HS256'] }) // req.staff._id


exports.authMiddleware = (req, res, next)=>{
    const authStaffId = req.staff._id;
    Staff.findOne({_id: authStaffId}).exec((err, staff)=>{
        if(err || !staff){
            return res.status(400).json({
                error: "Staff member not found"
            });
        }
        req.profile = staff
        next()
    })
}



exports.forgotPassword = (req, res) => {
    const { email } = req.body
    // check if staff exists with that email
    Staff.findOne({ email }).exec((err, staff) => {
        if (err || !staff) {
            return res.status(400).json({
                error: 'Staff member with that email does not exist'
            })
        }
        // generate token and email to staff
        const token = jwt.sign({ name: staff.name }, process.env.JWT_RESET_PASSWORD, { expiresIn: '10m' })
        // send email
        const params = forgotPasswordEmailParams(email, token)
        // populate the db > staff > resetPasswordLink
        return staff.updateOne({ resetPasswordLink: token }, (err, success) => {
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
            Staff.findOne({ resetPasswordLink }).exec((err, staff) => {
                if (err || !staff) {
                    return res.status(400).json({
                        error: 'Invalid token. Try again'
                    })
                }
                const updatedFields = {
                    password: newPassword,
                    resetPasswordLink: ''
                }
                staff = _.extend(staff, updatedFields);
                staff.save((err, result) => {
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