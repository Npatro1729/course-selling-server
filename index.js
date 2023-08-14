const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const jwt = require('jsonwebtoken') 
const mongoose = require('mongoose')
const port = 3000

app.use(bodyParser.json());

const userSchema = new mongoose.Schema({
  username : String,
  password : String,
  purchasedCourses :[{type: mongoose.Schema.Types.ObjectId, ref : "Courses"}]
});

const adminSchema = new mongoose.Schema({
  username : String,
  password : String,
});

const courseSchema = new mongoose.Schema({
  title : String,
  description : String,
  price : Number,
  published : Boolean
});
const admins = mongoose.model('admins',adminSchema);
const users = mongoose.model('users',userSchema);
const Courses = mongoose.model('Courses',courseSchema);
const adminSecret = "Supers3cr3t1";
const userSecret = "Supers3cr3t2";

function AdminAuth(req,res,next){
    const authHeader = req.headers.authorization;
    if(authHeader){
      const token = authHeader.split(' ')[1];
      jwt.verify(token,adminSecret,(err,admin)=>{
        if(err){ 
          return res.sendStatus(403);
        }
        req.admin = admin;
        next();
      })
    }
    else{
    res.sendStatus(401);
}
}

function userauth(req,res,next){
  const userHeader = req.headers.authorization;
  if(userHeader){
    const token = userHeader.split(' ')[1];
    jwt.verify(token,userSecret,(err,user)=>{
      if(err) res.sendStatus(403)
      req.user = user;
      next();
    })
  }
  else{
  res.sendStatus(401);
}
}

mongoose.connect('mongodb+srv://Naren007:Naren%40007@cluster0.6uyszy7.mongodb.net/courses?authMechanism=DEFAULT');

app.post('/admin/signup', async(req,res) => {
    const {username , password} = req.body;
    const admin = await admins.findOne({username})
    if(admin){
        res.status(403).json({comment : "admin already exists"});
   }
    else {
        const newAdmin = new admins({username,password});
        newAdmin.save();
        const token = jwt.sign({username , role:'admin'},adminSecret,{ expiresIn : '1h'});
        res.json({comment:"admin created successfully",token});
    }
})
app.post('/admin/login', async(req,res) => {
  const {username , password} = req.headers;
  const admin = await admins.findOne({username})
  if(admin){
    const token = jwt.sign({username , role:'admin'},adminSecret,{ expiresIn : '1h'});
    res.json({comment:"admin logged-in successfully",token}); 
 }
  else {
    res.status(403).json({comment : "invalid username or password"});
  }      
});

app.post('/admin/courses',AdminAuth,async(req,res) => {
       const course = new Courses(req.body)
       await course.save();
       res.json({comment : "course created successfully",courseID:course.id});
   
})
app.put('/admin/courses/:courseId',AdminAuth, async(req, res) => {
  const course = await Courses.findByIdAndUpdate(req.params.courseId, req.body, {new : true});
 if(course){
  res.json({message : 'course updated successfully'});
 }else {
  res.json({message : 'course not found'});
 }
});

app.get('/admin/courses',AdminAuth, async(req, res) => {
  const courses = await Courses.find({});
  res.json({courses});
})

app.post('/users/signup', async(req, res) => {
  const {username , password} = req.body;
  const user = await users.findOne({username})
  if(user){
      res.status(403).json({comment : "user already exists"});
 }
  else {
      const newUser = new users({username,password});
      newUser.save();
      const token = jwt.sign({username , role:'user'},userSecret,{ expiresIn : '1h'});
      res.json({comment:"user created successfully",token});
  }
});

app.post('/users/login', async(req, res) => {
  const {username , password} = req.headers;
  const user = await users.findOne({username})
  if(user){
    const token = jwt.sign({username , role:'user'},userSecret,{ expiresIn : '1h'});
    res.json({comment:"user logged-in successfully",token}); 
 }
  else {
    res.status(403).json({comment : "invalid username or password"});
  } 
});

app.get('/users/courses',userauth, async(req, res) => {
  const courses = await Courses.find({published : true});
  res.json({courses});

});

app.post('/users/courses/:courseId',userauth, async(req, res) => {
  // logic to purchase a course
  const course = await Courses.findById(req.params.courseId);
  if(course){
    const user = await users.findOne({username : req.user.username});
    // console.log(req.user.username);
    if(user){
    user.purchasedCourses.push(course);
    await user.save();
    res.json({comment: "course purchased successfully"})
  }else {
    res.status(403).json({comment:"user not found"});
  }
  }else {res.status(403).json({comment : "course not found"});}
});

app.get('/users/purchasedCourses',userauth, async(req, res) => {
  // logic to view purchased courses
 const user = await users.findOne({username : req.user.username}).populate('purchasedCourses');
 if(user){
  res.json({purchasedCourses : user.purchasedCourses} || []);
 }else {
  res.status(403).json({comment:"user not found"});
 }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})