require('dotenv/config')
const express = require("express");
const router = express.Router();
const multer= require('multer')
const Property = require ('../models/Property.js')
const {check, validationResult} = require('express-validator')
const AWS = require('aws-sdk')
const {v4: uuidv4} = require('uuid');
const fs = require('fs')
const bodyParser = require('body-parser');
var urlencodedParser = bodyParser.json({ extended: false });

//GET METHOD
router.get("/getproperty", async (req,res)=>{
    const pageNumber = 1;
    const PageSize = 5;
    const property= await Property.find()
    .skip((pageNumber - 1) * PageSize)
    .limit(PageSize)
    .sort()
    res.send(property)
})




//Filter Search Router
router.get("/getproperty/:society/:name/:category/:minprice/:maxprice", async (req,res)=>{
    try{
        const property= await Property.find({
            society:req.params.society,
            name:req.params.name,
            category:req.params.category,
            minprice: {$gte:req.params.minprice},
            maxprice: {$lte:req.params.maxprice }
        })
        console.log(property)
        res.send(property)
    } catch(err){
    console.log(err)
        res.status(400).json('server error')
    }
})


// HANDLING THE IMAGE USING S3
const s3 = new AWS.S3({
    accessKeyId: "AKIA5IYE5CCHY6LFFOFJ",
    secretAccessKey: "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",
    Bucket:"build-earthimages",
})


// POSTING A PROPERTY ROUTER
router.post("/addproperty", multer({ dest: 'temp/', limits: { fieldSize: 8 * 1024 * 1024 } }).single('image'),
    [
        check('society', 'please enter the society').not().isEmpty(),
        check('name', 'please enter the name').not().isEmpty(),
        check('category', 'please enter the category').not().isEmpty(),
        check('minprice', 'please enter the  minimum price').not().isEmpty(),
        check('maxprice', 'please enter the  maximum price').not().isEmpty(),
    ] 
    ,
    async (req,res)=>{
        const errors= validationResult(req)
        if(!errors.isEmpty()){
            return res.status(400).json({ errors: errors.array() })
        }
        console.log(req.file);    
        let myFile = req.file.originalname.split(".")
        const fileType = myFile[myFile.length - 1]
        var params ={
            ContentEncoding: 'base64',
            ContentType: req.file.mimetype,
            Bucket:"build-earthimages",
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
                    let newProperty =  new Property(
                        {
                        society:req.body.society,
                        name:req.body.name,
                        category:req.body.category,
                        minprice:req.body.minprice,
                        maxprice:req.body.maxprice,
                        }
                    )
                    newProperty = new Property({...req.body,image:locationUrl});
                    newProperty.save().then(console.log(newProperty))
                    var result={
                        newProperty:newProperty           
                    }
                    res.send(result);
                    console.log(data);
            }
        })
    }
);



// UPDATING THE PROPERTY ROUTER

router.put("/:id", multer({ dest: 'updated/', limits: { fieldSize: 8 * 1024 * 1024 } }).single('image'), async (req, res) => {
   
    const property = await Property.findByIdAndUpdate(
      req.params.id,
      { 
        society:req.body.society,
        name: req.body.name,
        category:req.body.category,
        minprice:req.body.minprice,
        maxprice:req.body.maxprice
        },

      { new: true }
    );
    if (!property)
      return res.status(404).send("The property with the given ID was not found.");
        
    res.send(property);

    
    AWS.config.update({ accessKeyId: 'AKIA5IYE5CCHY6LFFOFJ', secretAccessKey: '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', region: 'us-east-2'});

        const fileStream = fs.createReadStream(req.file.path);
        fileStream.on('error', function (err) {
            if (err) { throw err; }
        });

    fileStream.on('open', function () {
        const s3 = new AWS.S3();
        s3.putObject({
            Bucket: 'build-earthimages',
            Key: `updated.jpeg`,
            ACL: 'public-read',
            Body: fileStream,
        }, function (err) {
            if (err) { throw err; }
        });
    });
});




    // DELETING A PROPERTY ROUTE

    router.delete("/:id", multer({limits: { fieldSize: 8 * 1024 * 1024 } }).single('image'), async (req, res) => {

    const property = await Property.findByIdAndRemove(req.params.id,(err,result)=>{
        if (err){
            return next(err);
        }

    //Now Delete the file from AWS-S3
    // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#deleteObject-property
   
    const s3 = new AWS.S3({
        accessKeyId: "AKIA5IYE5CCHY6LFFOFJ",
        secretAccessKey: "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",
        Bucket:"build-earthimages"
      });
        
        let params = {
        Bucket:"build-earthimages",
        Key:req.file.originalname //this code shows cannot read original name of undefined error
    // Key: some code goes here to dynamically delete the file from s3 along with the property,
    };

      s3.deleteObject(params, (err, data) => {
        if (err) {
          console.log(err);
        } else {
          res.send({
            status: "200",
            responseType: "string",
            response: "success"
          });
        }
      });
    });

});

module.exports=router;