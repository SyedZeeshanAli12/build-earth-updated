const { check } = require('express-validator');

exports.userRegisterValidator = [
    check('firstName')
        .not()
        .isEmpty()
        .withMessage('First Name is required*'),
    check('lastName')
        .not()
        .isEmpty()
        .withMessage('Last Name is required*'),
    check('email')
        .isEmail()
        .withMessage('Email is required*'),
    check('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    check('address')
        .not()
        .isEmpty()
        .withMessage('Address is required*'),
    check('cnicNumber')
            .not()
            .isEmpty()
            .isNumeric()
            .withMessage('CNIC is required*'),
        check('city')
            .not()
            .isEmpty()
            .withMessage('City is required*'),
        check('country')
            .not()
            .isEmpty()
            .withMessage('Country is required*')
]

exports.userLoginValidator = [
    check('email')
        .isEmail()
        .withMessage('Must be a valid email address'),
    check('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long')
];

exports.forgotPasswordValidator = [
    check('email')
        .isEmail()
        .withMessage('Must be a valid email address')
];

exports.resetPasswordValidator = [
    check('newPassword')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    check('resetPasswordLink')
        .not()
        .isEmpty()
        .withMessage('Token is required')
];
