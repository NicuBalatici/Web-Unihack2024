import express from "express";
import bodyParser from "body-parser";

const app=express();
const port=3000;

app.use(bodyParser.urlencoded({extended:true}));
app.use(express.static("public"));

let date=new Date();
let year=date.getFullYear();


app.get("/",(req,res)=>{
    res.render("home.ejs",{Year:year});
})

app.get("/home",(req,res)=>{
    res.render("home.ejs",{Year:year});
})

app.get("/info",(req,res)=>{
    res.render("info.ejs",{Year:year});
})

app.get("/contact",(req,res)=>{
    res.render("contact.ejs",{Year:year});
})

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});