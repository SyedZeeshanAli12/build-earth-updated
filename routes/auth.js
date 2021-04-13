const express = require('express');
const router = express.Router();

// IMPORT VALIDATORS
// USER
const {
    userRegisterValidator,
    userLoginValidator,
    forgotPasswordValidator,
    resetPasswordValidator
} = require('../validators/auth')
// DEALER
const {
    dealerRegisterValidator,
    dealerLoginValidator
}= require('../validators/dealerAuth')
// STAFF
const {
    staffRegisterValidator,
    staffLoginValidator
}= require('../validators/dealerAuth')

// VALIDATORS INDEX MIDDLEWARE
const { runValidation } = require('../validators');

// IMPORT FROM CONTROLLERS---------------------------
// USER
const {
    register,
    registerActivate,
    login,
    forgotPassword, 
    resetPassword
} = require('../controllers/auth')
// DEALER
const {
    dealerRegister,
    registerActivateDealer,
    loginDealer
}= require('../controllers/authDealers')
// STAFF
const {
    staffRegister,
    registerActivateStaff,
    loginStaff
}= require('../controllers/authDealers')


// REGISTRATION ROUTES------------------------------
// USER
router.post('/register', userRegisterValidator, runValidation, register)
// DEALER
router.post('/dealer-register', dealerRegisterValidator, runValidation, dealerRegister )
// STAFF
// router.post('/staff-register', staffRegisterValidator, runValidation, staffRegister ) -----ERROR-----


// ACTIVATATION ON CLICKING LINK----------------------
// USER
router.post('/register/activate', registerActivate)
// DEALER
router.post('/register/activate-dealer', registerActivateDealer)
// STAFF
// router.post('/register/activate-staff', registerActivateStaff) -----ERROR-----


// LOGIN----------------------------------------------
// USER 
router.post('/login', userLoginValidator, runValidation, login)
// DEALER
router.post('/login-dealer', dealerLoginValidator, runValidation, loginDealer)
// STAFF
// router.post('/login-staff', staffLoginValidator, runValidation, loginStaff) -----ERROR-----


// PASSWORD FORGOT AND RESETS--------------------------
router.put('/forgot-password', forgotPasswordValidator, runValidation, forgotPassword);
router.put('/reset-password', resetPasswordValidator, runValidation, resetPassword);

// router.get('/secret', requireSignin, (req, res) => {
//     res.json({
//         data: 'This is secret page for logged in users only'
//     });
// });
module.exports = router;