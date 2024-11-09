import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import bcrypt from "bcrypt"
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv"
import GoogleStrategy from "passport-google-oauth2"



const app=express();
const port=3000;
const saltRound=10;
env.config();

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        maxAge: 1000*60*60*24,
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const db=new pg.Client({
    user:process.env.PG_USER,
    host:process.env.PG_HOST,
    database:process.env.PG_DATABASE,
    password:process.env.PG_PASSWORD,
    port:process.env.PG_PORT,
  });
  db.connect();

let date=new Date();
let year=date.getFullYear();



app.get("/",(req,res)=>{
    res.render("start.ejs",{Year:year});
})

app.get("/login", (req, res) => {
    res.render("login.ejs",{Year:year});
  });
  
app.get("/register", (req, res) => {
    res.render("register.ejs",{Year:year});
});

app.post("/register",async(req,res)=>{
    const email=req.body.username;
    const password=req.body.password;

    try{
        const checkEmail=await db.query("SELECT * FROM users WHERE email= $1",[email]);

        if(checkEmail.rows.length>0){
            res.send("Email aldreay exists.Try logging in.");
        } else{
            // Password hashing
            bcrypt.hash(password,saltRound, async (err,hash) => {
                if(err){
                    console.log("Error hashing password: ",err)
                }else{
                    const result=await db.query("INSERT INTO users(email,password) VALUES($1,$2)RETURNING * ",[email,hash]);
                    const user=result.rows[0];
                    req.login(user,(err)=>{
                        console.log(err)
                        res.redirect("/home")
                    })
                }
            });
        }
    }catch(err){
        console.log(err);
    }
});

app.post("/login",passport.authenticate("local",{
    successRedirect:"/home",
    failureRedirect:"/login"
}));


app.get("/home",(req,res)=>{
    console.log(req.user);
    if(req.isAuthenticated()){
       res.render("home.ejs",{Year:year}); 
    }else{
        res.redirect("/login");
    }
});
app.get("/info",(req,res)=>{
    if(req.isAuthenticated()){
       res.render("info.ejs",{Year:year}); 
    }else{
        res.redirect("/login");
    }
});
app.get("/contact",(req,res)=>{
    if(req.isAuthenticated()){
       res.render("contact.ejs",{Year:year}); 
    }else{
        res.redirect("/login");
    }
});

app.get("/auth/google",passport.authenticate("google",{
    scope:["profile","email"],
}));
app.get("/auth/google/home",passport.authenticate("google",{
    successRedirect:"/home",
    failureRedirect:"/login",
}));

app.get("/info",(req,res)=>{
    res.render("info.ejs",{Year:year});
});

app.get("/contact",(req,res)=>{
    res.render("contact.ejs",{Year:year});
});

app.get("/logout",(req,res)=>{
    req.logout((err)=>{
        if(err){
            console.log(err);
        }
        res.redirect("/")
    });
});


passport.use("local",new Strategy( async function verify(username,password,cb){
    console.log(username)
    try{
        const checkEmail=await db.query("SELECT * FROM users WHERE email= $1",[username]);
        console.log(checkEmail);
        if(checkEmail.rows.length>0){
            const user=checkEmail.rows[0];
            const storedHashedPassword=user.password;
            bcrypt.compare(password,storedHashedPassword,(err,result)=>{
                if(err){
                    return cb(err);
                }else{
                    if(result){
                        return cb(null,user);
                    }else{
                        return cb(null,false);
                    }
                }
            })
        }else{
            return cb("User not found");
        }
    }catch(err){
        return cb(err);
    }
}));

passport.use("google",new GoogleStrategy({
    clientID:process.env.GOOGLE_CLIENT_ID,
    clientSecret:process.env.GOOGLE_CLIENT_SECRET,
    callbackURL:"http://localhost:3000/auth/google/home",
    userProfileURL:"https://openidconnect.googleapis.com/v1/userinfo"
    }, async (accessToken,refreshToken,profile,cb)=>{
        console.log(profile);
        try{
          const result=await db.query("SELECT * FROM users WHERE email= $1",[profile.email]);
          if(result.rows.length==0){
            const newUser=await db.query("INSERT INTO users (email, password) VALUES ($1, $2)",[profile.email,"google"]);
            return cb(null,newUser.rows[0])
          }else{
            //Aldready existing user
            return cb(null,result.rows[0])
          }
        }catch(err){
            return cb(err);
        }
    }
))


passport.serializeUser((user,cb)=>{
    cb(null,user);
});

passport.deserializeUser((user,cb)=>{
    cb(null,user);
});



app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});