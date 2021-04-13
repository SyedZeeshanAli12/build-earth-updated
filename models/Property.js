const mongoose = require("mongoose"); 


const Property =  mongoose.model("Property", new mongoose.Schema({
    
    society:{
        type:String,
        required:true,
        minlength:5,
        maxlength:50
    },
    name: {
      type: String,
      minlength: 5,
      maxlength: 50,
    },

    category:{
      type: String,
      minlength:5,
      maxlength: 50
    },
    minprice:{
        type:Number,
        min:0,
    }, 
    maxprice:{
      type:Number,
      max:70000000
    },
    image:{
      type: String
    },
    
    }
));
module.exports = Property