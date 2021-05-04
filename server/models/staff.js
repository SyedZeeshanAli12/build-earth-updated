const mongoose = require('mongoose');
const crypto = require('crypto');


const staffSchema = new mongoose.Schema(
        {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true 
        },
        email: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        address: {
            type: String
        },
        officeAddress: {
            type: String,
            required: true
        },
        serviceDescription: {
            type: String,
            requried: true
        },
        cellPhone: {
            type: Number,
            required: true,
            unique: true
        },
        cnicNumber: {
            type: Number,
            required: true,
            unique: true
        },
        hashed_password: {
            type: String,
            required: true
        },
        salt: String,
        resetPasswordLink: {
            data: String,
            default: ''
        },
        // avatar: {
        //     type: String
        // },
        city: {
            type: String,
            required: true
        },
        country: {
            type: String,
            trim: true,
            required: true
        },
        role: {
            type: String,
            default: 'staff-subscriber'
        },
        date: {
            type: Date,
            default: Date.now
        }
    },
    { timestamps: true }
);

// virtual fields
staffSchema
    .virtual('password')
    .set(function(password) {
        // create temp variable called _password
        this._password = password;
        // generate salt
        this.salt = this.makeSalt();
        // encrypt password
        this.hashed_password = this.encryptPassword(password);
    })
    .get(function() {
        return this._password;
    });

// methods > authenticate, encryptPassword, makeSalt
staffSchema.methods = {
    authenticate: function(plainText) {
        return this.encryptPassword(plainText) === this.hashed_password;
    },

    encryptPassword: function(password) {
        if (!password) return '';
        try {
            return crypto
                .createHmac('sha1', this.salt)
                .update(password)
                .digest('hex');
        } catch (err) {
            return '';
        }
    },

    makeSalt: function() {
        return Math.round(new Date().valueOf() * Math.random()) + '';
    }
};

// EXPORT STAFF MODEL
module.exports = mongoose.model('Staff', staffSchema)