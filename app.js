//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require("mongoose-encryption");
const cookieParser = require("cookie-parser");
const session = require('express-session');
const uuid = require("uuid");
const path = require('path');
const shortid = require('shortid');
const cors = require('cors');
const { log } = require('console');
const QRCode = require('qrcode')

const app = express();

app.set('view engine', 'ejs');

app.use(cors())

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(bodyParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use(express.static("public"));

app.use(cookieParser());

app.use(session({
    secret: process.env.RANDOM,
    saveUninitialized:false,
    resave: false
}));

mongoose.set('strictQuery', false);
// mongoose.connect("mongodb://localhost:27017/boeDB", {useNewUrlParser: true});
mongoose.connect("mongodb+srv://alex-dan:Admin-12345@cluster0.wirm8.mongodb.net/boeDB", {useNewUrlParser: true});

const d = new Date();
let year = d.getFullYear();
let month = d.getMonth() + 1;
let date = d.getDate();
let hour = d.getHours() ;
let minutes = d.getMinutes();

const earningSchema = new mongoose.Schema({
  currentInvestment: Number,
  totalInvestment: Number,
  totalIncome: Number,
  directIncome: Number,
  royalIncome: Number,
  salaryIncome: Number,
  availableBalance: Number
});
const bankDetailsSchema = new mongoose.Schema({
  name: String,
  accountNumber: String,
  bankName: String,
  ifsc: String
});
const historySchema = new mongoose.Schema({
  paymentStatus: String,
  trnxID: String,
  amount: String,
  date: String,
  month: String,
  year: String
});
const transactionSchema = new mongoose.Schema({
  type: String,
  from: String,
  amount: Number,
  status: String,
  time:{
    date: String,
    month: String,
    year: String
  },
  trnxId: String
});
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true
  },

  mobile:{
    type: String,
    required: true
  },

  userID: {
    type: String,
    required: true
  },

  sponsorID: {
    type: String,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  earnings: earningSchema,

  bankDetails: bankDetailsSchema,

  history: [historySchema],

  transaction: [transactionSchema],

  time: {
    date: String,
    month: String,
    year: String
  },

  currentTrnx: String

});
const adminSchema = new mongoose.Schema({
  email: String,
  invest:[
    {
      trnxId: String,
      email: String,
      amount: Number,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
      status: String
    }
  ],
  withdrawal:[
    {
      trnxID: String,
      amount: Number,
      email: String,
      username: String,
      time:{
        date: String,
        month: String,
        year: String,
        minutes: String,
        hour: String
      },
    }
  ]
});
const paymentSchema = new mongoose.Schema({
  user: userSchema,
  trnxId: String,
  amount: Number
})
const qrDataSchema = new mongoose.Schema({ text: String });


userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

const Admin = new mongoose.model("Admin", adminSchema);

const Payment = new mongoose.model("Payment", paymentSchema);

const Data = mongoose.model('Data', qrDataSchema);

//ROUTES
app.get("/", function(req, res){
  const alert = "false";
  res.render("login", {alert});
});

app.get("/register", function(req, res){
  if(req.session.sponsorID){
    const alert = "false";
    const sponsor = 'true';
    const sponsorID = req.session.sponsorID;
    res.render("register", {
      sponID:req.session.sponsorID,
      alert,
      sponsor,
      sponsorID
    });
  }else {
    const alert = "false";
    const sponsor = "false"
    res.render("register", {
      alert,
      sponsor
    });
  }
});

app.get("/dashboard", function(req, res){
  if(!req.session.user){
    res.redirect("/")
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{

        const name = foundUser.username;
        const currentInv = foundUser.earnings.currentInvestment;
        const totalInv = foundUser.earnings.totalInvestment;
        const totalIncome = foundUser.earnings.totalIncome;
        const direct = foundUser.earnings.directIncome;
        const email = foundUser.email;
        const number = foundUser.mobile;
        const royal = foundUser.earnings.royalIncome;
        const salary = foundUser.earnings.salaryIncome;
        const availableBalance = foundUser.earnings.availableBalance;
        const alert = 'nil';

        res.render("dashboard", {
          name,
          currentInv,
          totalInv,
          totalIncome,
          direct,
          royal,
          availableBalance,
          alert,
          userID: foundUser.userID,
          email,
          number,
          salary
        });
      }
    });
  }

});

app.get("/profile", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{
    User.findOne({email: req.session.user.email}, function(err, foundUser){
     if(err){
       console.log(err);
     }else{
       User.findOne({userID: foundUser.sponsorID}, function(error, foundSponsor){
         if(!foundSponsor){
           //With no Registered Sponsor ID
           if(!foundUser.bankDetails){
             //No bank Details and
             res.render("profile", {
               profile: "profile",
               username: foundUser.username,
               email: foundUser.email,
               sponsorID: 'Not found',
               userID: foundUser.userID
               });
           }else {
             res.render("profile", {
               profile: "profile2",
               username: foundUser.username,
               email: foundUser.email,
               sponsorID: 'Not found',
               accountHoldersName: foundUser.bankDetails.name,
               accountNumber: foundUser.bankDetails.accountNumber,
               bankName: foundUser.bankDetails.bankName,
               ifsc: foundUser.bankDetails.ifsc,
               userID: foundUser.userID
               });
           }
         }else{
           //With registered sponsor ID
           if(!foundUser.bankDetails){
             res.render("profile", {
               profile: "profile",
               username: foundUser.username,
               email: foundUser.email,
               sponsorID: foundSponsor.username,
               userID: foundUser.userID

             });
           }else {
             res.render("profile", {
               profile: "profile2",
               username: foundUser.username,
               email: foundUser.email,
               sponsorID: foundSponsor.username,
               accountHoldersName: foundUser.bankDetails.name,
               accountNumber: foundUser.bankDetails.accountNumber,
               bankName: foundUser.bankDetails.bankName,
               ifsc: foundUser.bankDetails.ifsc,
               userID: foundUser.userID
               });
           }
         }
       });
     }
    });


  }
});

app.get("/withdrawal", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{

      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          res.render("withdrawal", {
            name: foundUser.username,
            email: foundUser.email,
            history: foundUser.history,
            availableBalance: foundUser.earnings.availableBalance,
            alert: 'nil'

          });
        }
        });
        }
});

app.get("/invest", function(req, res){
  if(!req.session.user){
    res.redirect("/");
  }else{

      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          
          if(err){
            console.log(err);
          }else{
            Data.findOne({}, function(err, data){
              if(!data){
                const qr = new Data({
                  text: "dummy@upiId"
                });
                qr.save();
                res.redirect('/dashboard');
              }else{
                res.render("investment", {
                  name: foundUser.username,
                  email: foundUser.email,
                  alert: 'nil',
                  upiId: data.text,
                  amount: foundUser.earnings.currentInvestment
                });
              }
            });
          }
        }
        });
  }
});

app.get('/transaction', function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
    User.findOne({email:req.session.user.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        res.render('transaction',{
          name: foundUser.username,
          email: foundUser.email,
          transaction: foundUser.transaction,
          alert: 'nil'
        });
      }
    });
  }
});

app.get("/adminLogin", function(req, res){
  res.render("adminLogin");
});

app.get("/admin", function(req, res){
  if(!req.session.admin){
    res.redirect("/adminLogin");
  }else{
    Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
      if(err){
        console.log(err);
      }else{
        User.find({}, function(err,foundUsers){
          if(err){
            console.log(err);
          }else{
            const total = foundUsers.length;
            const current = [];
            foundUsers.forEach(function(currentInvestors){
              if(currentInvestors.earnings.currentInvestment != 0){
                current.push(currentInvestors);
              }
            });
            let currentUsers = current.length;
            res.render("admin",
              {
                 total,
                 currentUsers,
                 investment: foundAdmin.invest,
                 withdrawal: foundAdmin.withdrawal
               });
          }
        });
      }
    });
  }
});

app.get("/update", function(req, res){
  const admin = new Admin ({
    email: process.env.ADMIN,
    invest:[],
    withdrawal:[]
  });
  admin.save();
});

app.get("/currentInvestors", function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    User.find({}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        let currentInvestor = [];
        foundUser.forEach(function(user){
          if(user.earnings.currentInvestment != 0){
            currentInvestor.push(user);
          }
        });
        res.render('investors', {
          currentInvestor
        });
      }
    })
  }
});

app.get("/register/:sponsorID", function(req, res){

  req.session.sponsorID = req.params.sponsorID;

  const alert = "false";
  const sponsor = 'true';
  const sponsorID = req.session.sponsorID;
  // res.render("register", {
  //   sponID:req.session.sponsorID,
  //   alert,
  //   sponsor,
  //   sponsorID
  // });
  res.redirect('/register');
});

app.get("/log-out", function(req, res){
  req.session.destroy();
  res.redirect("/");
});

app.get('/generateQR', async (req, res) => {
  try {
    // Fetch data from MongoDB
    const data = await Data.findOne();
    if (!data) {
      const qr = new Data({
        text: "dummy@upiId"
      });
      qr.save();
      return res.status(404).send('No data found');
    }

    // Generate QR code
    const textToQr = "upi://pay?pa=" + data.text + "&mc=5399&pn=Google Pay Merchant&oobe=fos123&q";
    QRCode.toDataURL(textToQr, (err, url) => {
      if (err) {
        return res.status(500).send('Error generating QR code');
      }
      res.status(200).send({ url });
    });
  } catch (error) {
    res.status(500).send('Server error');
  }
});




//POSTS
app.post("/register", function(req, res){
  let userID = "BOX" + String(Math.floor(Math.random()*99999));
  const newUser = new User ({
    username: req.body.username,
    email: req.body.email,
    mobile: req.body.mobile,
    password: req.body.password,
    sponsorID: req.body.sponsorID,
    userID: userID,
    earnings: {
      currentInvestment: 0,
      totalInvestment: 0,
      totalIncome: 0,
      directIncome: 0,
      royalIncome: 0,
      salaryIncome: 0,
      availableBalance: 0
    },
    time: date + "/" + month + "/" + year,
    history: [],

    transaction:[]

  });

  // Unique User Id
  User.findOne({userID: userID}, function(err, foundUser){
    if(err){
      console.log(err);
    } else{
      if(foundUser){
        userID = "BOX" + String(Math.floor(Math.random()*99999));
      }
    }
  });
  User.findOne({email: req.body.email}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        //User already exist

        if(req.session.sponsorID){
          const alert = "true";
          const sponsor = 'true';
          const sponsorID = req.session.sponsorID;
          res.render("register", {
            sponID:req.session.sponsorID,
            alert,
            sponsor,
            sponsorID,
            alertType, message
          });
        }else {
          const alert = "true";
          const sponsor = "false"
          res.render("register", {
            alert,
            sponsor,
            alertType, message
          });
        }
      }else {
        User.findOne({mobile:req.body.mobile}, function(err, mobileUser){
          if(err){
            console.log(err);
          }else{
            if(mobileUser){
              //Mobile number already exist
              const alertType = "warning";
              const message = "Mobile number already exist"
      
              if(req.session.sponsorID){
                const alert = "true";
                const sponsor = 'true';
                const sponsorID = req.session.sponsorID;
                res.render("register", {
                  sponID:req.session.sponsorID,
                  alert,
                  sponsor,
                  sponsorID,
                  alertType, message
                });
              }else {
                const alert = "true";
                const sponsor = "false"
                res.render("register", {
                  alert,
                  sponsor,
                  alertType, message
                });
              }
            }else{
              //Save user
              const alertType = "success";
              const alert = "true";
              const message = "Successfully created your Account"
      
              newUser.save();
      
              res.render("login", {alertType, alert, message});
            }
          }
        })
      }
    }
  });
});

app.post("/login", function(req, res){

  User.findOne({email: req.body.email}, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(!foundUser){
        const alertType = "warning";
        const alert = "true";
        const message = "Email or Password Invalid"

        res.render("login", {alertType, alert, message});
      }else {
        if(req.body.password == foundUser.password){
          req.session.user = req.body;
          res.redirect("/dashboard");
        }else{
          const alertType = "warning";
          const alert = "true"
          const message = "Email or Password Invalid"

          res.render("login", {alertType, alert, message});
        }
      }
    }
  })
});

app.post("/bankDetails", function(req, res){
  User.updateOne({email: req.session.user.email}, {$set:{bankDetails:{name: req.body.holdersName, accountNumber: req.body.accountNumber, bankName: req.body.bankName, ifsc: req.body.ifsc}}}, function(err){
    if(err){
      console.log(err);
    }
  });
  User.findOne({email:req.session.user.email}, function(err, foundUser){
    if(err){
      console.log();
    }else{

      const name = foundUser.username;
      const currentInv = foundUser.earnings.currentInvestment;
      const totalInv = foundUser.earnings.totalInvestment;
      const totalIncome = foundUser.earnings.totalIncome;
      const direct = foundUser.earnings.directIncome;
      const royal = foundUser.earnings.royalIncome;
      const availableBalance = foundUser.earnings.availableBalance;
      const alert = 'true';
      const alertType = 'success';
      const message = 'Account details updated Successfully'

      res.render("dashboard", {
        name,
        currentInv,
        totalInv,
        totalIncome,
        direct,
        royal,
        availableBalance,
        alert,
        alertType,
        message
      });
    }
  })
});

app.post("/adminLogin", function(req, res){
  if(process.env.ADMIN === req.body.email){
    if(process.env.PASSWORD === req.body.password){
      req.session.admin = req.body;

      res.redirect('/admin');
    }else{
      //Not an User
      res.redirect('/adminLogin');
    }
  }else{
    //Not an User
    res.redirect('/adminLogin');
  }
})

app.post("/invest", function(req, res){
  Payment.findOne({trnxId: req.body.trnxId}, function(err, foundPayment){
    if(!foundPayment){

        User.findOne({email: req.session.user.email}, function(err, foundUser){
        Admin.findOne({email:process.env.ADMIN}, function(error,foundAdmin){

          const newPayment = new Payment ({
            user: foundUser,
            trnxId: req.body.trnxId,
            amount: req.body.amount
          })
          newPayment.save();

          if(!foundAdmin){
              let transaction = foundUser.transaction;

              let newTransaction = {
                trnxId: req.body.trnxId,
                amount: req.body.amount,
                status: 'Pending',
                time:{
                  date: date,
                  month: month,
                  year: year
                },
                type: 'Credit',
                from: 'Exchange'
              }
              let newInvestment = [{
                trnxId: req.body.trnxId,
                email: foundUser.email,
                amount:req.body.amount,
                username: foundUser.username,
                time:{
                  date: date,
                  month: month,
                  year: year,
                  minutes: minutes,
                  hour: hour
                },
                status: 'Pending'
              }]

              transaction.push(newTransaction);
              const newAdmin = new Admin ({
                email: process.env.ADMIN,
                invest:newInvestment
              });
              newAdmin.save(function(err){
                if(err){
                  console.log(err);
                }
              });

              User.updateOne({email: req.session.user.email}, {$set:{transaction:transaction }}, function(error){
                if(error){
                  console.log(error);
                }
              });

            res.redirect("/dashboard");
          }else{
            let transaction = foundUser.transaction;
            let investment = foundAdmin.invest;
            const newTransaction = {
              trnxId: req.body.trnxId,
              email: foundUser.email,
              amount: req.body.amount,
              status: 'Pending',
              time:{
                date: date,
                month: month,
                year: year
              },
              type: 'Credit',
              from: 'Exchange'
            }
            const newInvestment = {
              trnxId: req.body.trnxId,
              email: foundUser.email,
              amount: req.body.amount,
              username: foundUser.username,
              time:{
                date: date,
                month: month,
                year: year,
                minutes: minutes,
                hour: hour
              },
              status: 'Pending'
            }
            investment.push(newInvestment);
            transaction.push(newTransaction);
            Admin.updateOne({email: process.env.ADMIN}, {$set:{invest:investment}}, function(error){
              if(error){
                console.log(error);
              }
            });
            User.updateOne({email: req.session.user.email}, {$set:{transaction:transaction }}, function(error){
              if(error){
                console.log(error);
              }
            });

          res.redirect("/dashboard");
          }

        });
      });
    }else{
      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          const alertType = "warning";
          const message = "Invalid Transaction ID"
          res.render("investment", {
            name: foundUser.username,
            email: foundUser.email,
            alert: 'true',
            message,
            alertType
          });
        }
        });
    }
  })
});

 app.post("/qrData", async (req, res) =>{
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    try {
      // Fetch data from MongoDB
      const data = await Data.findOne();
      if (!data) {
        const qr = new Data({
          text: "dummy@upiId"
        });
        qr.save();
        res.redirect('/admin');
      }else{
            
        //Update QR or UPI details
        Data.updateOne({}, {$set:{text:req.body.upi}}, function(err){
          if(err){
            console.log(err);
          }
        });
        res.redirect('/admin');
      }
      

    } catch (error) {
      console.log(error);
    }

  }
})

app.post("/transferInvestment", function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    User.findOne({email: req.body.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        User.updateOne({email: req.body.email}, {$set:{earnings: {
          currentInvestment: 0 ,
          totalInvestment: foundUser.earnings.totalInvestment,
          totalIncome: foundUser.earnings.totalIncome+ Math.floor((Number(foundUser.earnings.currentInvestment)*req.body.multiplier)),
          directIncome: foundUser.earnings.directIncome,
          royalIncome: foundUser.earnings.royalIncome,
          salaryIncome: foundUser.earnings.salaryIncome,
          availableBalance: foundUser.earnings.availableBalance+ Math.floor((Number(foundUser.earnings.currentInvestment)*req.body.multiplier))
        }}}, function(error){
          if(error){
            console.log(error);
          }else{
            //updating Transaction history for Sponsor
            let transaction = foundUser.transaction;

            const newtrnx = {
                type: 'Credit',
                from: 'Exchange',
                amount: (Number(foundUser.earnings.currentInvestment)*req.body.multiplier),
                status: 'Success',
                time:{
                  date: date,
                  month: month,
                  year: year
              }
            }
            transaction.push(newtrnx);
            User.updateOne({email: req.body.email}, {$set:{transaction:transaction}}, function(err){
              if(err){
                console.log(err);
              }else{
                User.updateOne({email:req.body.email}, {$unset:{currentTrnx:""}}, function(err){
                  if(err){
                    console.log(err);
                  }
                });
              }
            });
          }
      });
      }
    });

    res.redirect('currentInvestors')
  }
})

app.post("/userDetails", function(req, res){
  User.findOne({username: req.body.username}, function(err, foundUser){
    if(foundUser){
      req.session.user = req.body;
      res.redirect("/dashboard");
    }else{
      res.redirect("/admin");
    }

  });
});

app.post("/withdrawal", function(req, res){
  if(!req.session.user){
    res.redirect('/');
  }else{
      User.findOne({email: req.session.user.email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
            const newValue =  foundUser.earnings.availableBalance - Number(req.body.amount);
            //Minimum Withdrawal
            if(req.body.amount<150){
              const alertType = "warning";
              const alert = "true"
              const message = "Entered amount is less than Minimum withdrawal"
              res.render("withdrawal", {alertType, alert, message,
              name: foundUser.username,
              email: foundUser.email,
              sponsorID: foundUser.sponsorID,
              history: foundUser.history,
              availableBalance: foundUser.earnings.availableBalance
            });
          }  else{
            //lOW BALANCE
            if(foundUser.earnings.availableBalance < req.body.amount){
              const alertType = "warning";
              const alert = "true"
              const message = "Low balance!!"

              res.render("withdrawal", {alertType, alert, message,
                name: foundUser.username,
                email: foundUser.email,
                sponsorID: foundUser.sponsorID,
                history: foundUser.history,
                availableBalance: foundUser.earnings.availableBalance
              });
            }else{
            //No Bank details
              if(!foundUser.bankDetails){
                const alertType = "warning";
                const alert = "true"
                const message = "Fill in you Bank Details to proceed"

                res.render("withdrawal", {alertType, alert, message,
                  name: foundUser.username,
                  email: foundUser.email,
                  sponsorID: foundUser.sponsorID,
                  history: foundUser.history,
                  availableBalance: foundUser.earnings.availableBalance
                });
              }else{
                let limitReached = false;
                foundUser.history.forEach(function(transaction){
                  if(transaction.paymentStatus != 'Failed'){
                    if(transaction.date == date && transaction.month == month){
                      limitReached = true;
                    }
                  }
                });
                if(limitReached == true){
                  const alertType = "warning";
                  const alert = "true"
                  const message = "Daily Withdrawal limit reached"

                  res.render("withdrawal", {alertType, alert, message,
                    name: foundUser.username,
                    email: foundUser.email,
                    sponsorID: foundUser.sponsorID,
                    history: foundUser.history,
                    availableBalance: foundUser.earnings.availableBalance
                  });
                }else{
                //New balnce update
                User.updateOne({email: req.session.user.email},
                  {$set:
                    {earnings:
                      {
                      currentInvestment: foundUser.earnings.currentInvestment,
                      totalInvestment: foundUser.earnings.totalInvestment,
                      totalIncome: foundUser.earnings.totalIncome,
                      directIncome: foundUser.earnings.directIncome,
                      royalIncome: foundUser.earnings.royalIncome,
                      salaryIncome: foundUser.earnings.salaryIncome,
                      availableBalance: newValue
                      }}}, function(error){
                  if(error){
                    console.log(error);
                  }else{
                    const trnxID = "TRNX" + String(Math.floor(Math.random()*999999999));
                    //History and Transaction add up
                    let history = foundUser.history;
                    let transaction = foundUser.transaction;
                    const newHistory = {
                      paymentStatus: 'Pending',
                      amount: req.body.amount,
                      date: date,
                      month: month,
                      year: year,
                      trnxID: trnxID
                    }
                    const newTransaction = {
                      type: 'Debit',
                      from: 'Withdrawal',
                      amount: req.body.amount,
                      status: 'Pending',
                      time:{
                        date: date,
                        month: month,
                        year: year
                      },
                      trnxId: trnxID
                    }
                    history.push(newHistory);
                    transaction.push(newTransaction);

                    User.updateOne({email: req.session.user.email}, {$set:{history:history, transaction:transaction}}, function(error){
                      if(error){
                        console.log(error);
                      }
                    });
                    Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
                      if(err){
                        console.log(err);
                      }else{
                        let withdrawal = foundAdmin.withdrawal;
                        const newWithdrawal = {
                          trnxID: trnxID,
                          amount: req.body.amount,
                          email: foundUser.email,
                          username: foundUser.username,
                          time:{
                            date: date,
                            month: month,
                            year: year,
                            minutes: minutes,
                            hour: hour
                          }
                        }
                        withdrawal.push(newWithdrawal);
                        Admin.updateOne({email:process.env.ADMIN}, {$set:{withdrawal:withdrawal}}, function(err){
                          if(err){
                            console.log(err);
                          }
                        });
                      }
                    });
                    const name = foundUser.username;
                    const currentInv = foundUser.earnings.currentInvestment;
                    const totalInv = foundUser.earnings.totalInvestment;
                    const totalIncome = foundUser.earnings.totalIncome;
                    const direct = foundUser.earnings.directIncome;
                    const royal = foundUser.earnings.royalIncome;
                    const salary = foundUser.earnings.salaryIncome;
                    const availableBalance = newValue;
                    const alert = 'true';
                    const alertType = 'success';
                    const message = 'Withdrawal Success'

                    res.render("dashboard", {
                      name,
                      currentInv,
                      totalInv,
                      totalIncome,
                      direct,
                      royal,
                      availableBalance,
                      alert,
                      alertType,
                      message,
                      salary
                    });
                  }
                });
                }
              }
            }
          }
        }

      });
  }

});

app.post("/creditInvestment", function(req, res){
  if(!req.session.admin){
    res.redirect("/adminLogin");
  }else{
    Admin.findOne({email: process.env.ADMIN}, function(err, foundAdmin){
      if(err){
        console.log(err);
      }else{
        User.findOne({email: req.body.email}, function(err, foundUser){
          if(req.body.approval == 'fail'){

              //Updating Transaction History Failed
              let updatedTransaction = [];

              foundUser.transaction.forEach(function(transaction){
                if(transaction.trnxId == req.body.trnxId){
                  const newTrnx = {
                    type: transaction.type,
                    from: transaction.from,
                    amount: transaction.amount,
                    status: 'Failed',
                    time:{
                      date: transaction.time.date,
                      month: transaction.time.month,
                      year: transaction.time.year
                    },
                    trnxId: transaction.trnxId
                  }
                  updatedTransaction.push(newTrnx);
                }else{
                  updatedTransaction.push(transaction);
                }
              });
              //Removing Payment transaction Id from datebase
              Payment.updateOne({trnxId:req.body.trnxId},
                 {$set:{trnxId:'Failed' + req.body.trnxId}},
                  function(err){
                    if(err){
                      console.log(err);
                    }
                  });
              //Updating Admin panel pending array
              let pendingUpdated = [];

              foundAdmin.invest.forEach(function(request){
                if(request.trnxId != req.body.trnxId){
                  pendingUpdated.push(request);
                }
              });
              Admin.updateOne({email: process.env.ADMIN}, {$set:{invest:pendingUpdated}}, function(err){
                if(err){
                  console.log(err);
                }
              });

              //Updating Transaction array for User
              User.updateOne({email:req.body.email}, {$set:{transaction:updatedTransaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });
          }else{
            let updatedInvest = [];

            foundAdmin.invest.forEach(function(update){
              if(update.trnxId == req.body.trnxId){
                //Updating User balance

                User.updateOne({email: req.body.email}, {$set:{earnings: {
                  currentInvestment: foundUser.earnings.currentInvestment + Math.floor(Number(req.body.amount)),
                  totalInvestment: foundUser.earnings.totalInvestment + Math.floor(Number(req.body.amount)),
                  totalIncome: foundUser.earnings.totalIncome,
                  directIncome: foundUser.earnings.directIncome,
                  royalIncome: foundUser.earnings.royalIncome,
                  salaryIncome: foundUser.earnings.salaryIncome,
                  availableBalance: foundUser.earnings.availableBalance
                }}}, function(error){
                    if(error){
                      console.log(error);
                    }else{
                      User.findOne({userID:foundUser.sponsorID}, function(err, sponsorUser){
                        if(err){
                          console.log(err);
                        }else{
                          if(sponsorUser){
                            //Updating Direct income
                            User.updateOne({userID: foundUser.sponsorID}, {$set:{earnings: {
                              currentInvestment: sponsorUser.earnings.currentInvestment,
                              totalInvestment: sponsorUser.earnings.totalInvestment,
                              totalIncome: sponsorUser.earnings.totalIncome + Math.floor(Number(req.body.amount)*Number(req.body.refferal)) ,
                              directIncome: sponsorUser.earnings.directIncome + Math.floor(Number(req.body.amount)*Number(req.body.refferal)) ,
                              royalIncome: sponsorUser.earnings.royalIncome,
                              salaryIncome: sponsorUser.earnings.salaryIncome,
                              availableBalance: sponsorUser.earnings.availableBalance + Number(req.body.amount)*Number(req.body.refferal)
                            }}}, function(err){
                              if(err){
                                console.log(err);
                              }else{
                                  //updating Transaction history for Sponsor
                                  let sponsorTrnx = sponsorUser.transaction;
  
                                  const newSponsorTrnx = {
                                      type: 'Credit',
                                      from: 'Refferal Wallet | ' + foundUser.username,
                                      amount: req.body.amount*Number(req.body.refferal),
                                      status: 'Success',
                                      time:{
                                        date: date,
                                        month: month,
                                        year: year + ' | ' + sponsorUser.userID
                                    }
                                  }
                                  sponsorTrnx.push(newSponsorTrnx);
                                  User.updateOne({userID: foundUser.sponsorID}, {$set:{transaction:sponsorTrnx}}, function(err){
                                    if(err){
                                      console.log(err);
                                    }
                                  });
                                }
                            });
                            //Updating Transaction History Success
                            let updatedTransaction = [];
  
                            foundUser.transaction.forEach(function(transaction){
                              if(transaction.trnxId == req.body.trnxId){
                                const newTrnx = {
                                  type: transaction.type,
                                  from: transaction.from,
                                  amount: transaction.amount,
                                  status: 'Success',
                                  time:{
                                    date: transaction.time.date,
                                    month: transaction.time.month,
                                    year: transaction.time.year
                                  },
                                  trnxId: transaction.trnxId
                                }
                                updatedTransaction.push(newTrnx);
                              }else{
                                updatedTransaction.push(transaction);
                              }
                            });
                            //Updating current transaction ID
                            User.updateOne({email:req.body.email}, {$set:{currentTrnx:req.body.trnxId}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });
                            User.updateOne({email:req.body.email}, {$set:{transaction:updatedTransaction}}, function(err){
                              if(err){
                                console.log(err);
                              }
                            });

                          }
                        }
                      });
                    }
                  });
              }else{
                updatedInvest.push(update);
              }
            });

            Admin.updateOne({email:process.env.ADMIN}, {$set:{invest:updatedInvest}}, function(error){
              if(error){
                console.log(error);
              }
            });

          }
        });
      }
    });
    res.redirect("/admin");
  }
});

app.post("/creditWithdrawal", function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin')
  }else{
    if(req.body.approval == 'success'){
    Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
      if(err){
        console.log(err);
      }else{
        User.findOne({email:req.body.email}, function(err, foundUser){
          if(err){
            console.log(err);
          }else{
            //Update User history array

            let updatedHistory = [];

            foundUser.history.forEach(function(history){
              if(history.trnxID= req.body.trnxID){
                const newHistory = {
                  paymentStatus: "Success",
                  amount: history.amount,
                  date: history.date,
                  month: history.month,
                  year: history.year,
                  trnxID: history.trnxID
                }
                updatedHistory.push(newHistory);
              }else{
                updatedHistory.push(history);
              }
            });
            User.updateOne({email:req.body.email}, {$set:{history:updatedHistory}}, function(err){
              if(err){
                console.log(err);
              }
            });

            //Updating Transaction History Success
            let updatedTransaction = [];

            foundUser.transaction.forEach(function(transaction){
              if(transaction.trnxId == req.body.trnxID){
                const newTrnx = {
                  type: transaction.type,
                  from: transaction.from,
                  amount: transaction.amount,
                  status: 'Success',
                  time:{
                    date: transaction.time.date,
                    month: transaction.time.month,
                    year: transaction.time.year
                  },
                  trnxId: transaction.trnxId
                }
                updatedTransaction.push(newTrnx);
              }else{
                updatedTransaction.push(transaction);
              }
            });
            //Updating Transaction array for User
            User.updateOne({email:req.body.email}, {$set:{transaction:updatedTransaction}}, function(err){
              if(err){
                console.log(err);
              }
            });

            //Update admin array
            let updatedArray = [];

            foundAdmin.withdrawal.forEach(function(transaction){
              if(transaction.trnxID != req.body.trnxID){
                updatedArray.push(transaction);
              }
            });
            Admin.updateOne({email:process.env.ADMIN}, {$set:{withdrawal:updatedArray}}, function(err){
              if(err){
                console.log(err);
              }
            });

          }
        });
      }
    });
    }else{

      Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
        if(err){
          console.log(err);
        }else{
          User.findOne({email:req.body.email}, function(err, foundUser){
            if(err){
              console.log(err);
            }else{
              //Update User history array

              let updatedHistory = [];

              foundUser.history.forEach(function(history){
                if(history.trnxID= req.body.trnxID){
                  const newHistory = {
                    paymentStatus: "Failed",
                    amount: history.amount,
                    date: history.date,
                    month: history.month,
                    year: history.year,
                    trnxID: history.trnxID
                  }
                }else{
                  updatedHistory.push(history);
                }
              });
              User.updateOne({email:req.body.email}, {$set:{history:updatedHistory}}, function(err){
                if(err){
                  console.log(err);
                }
              });
              //Updating User balance
              User.updateOne({email: req.body.email}, {$set:{earnings: {
                currentInvestment: foundUser.earnings.currentInvestment,
                totalInvestment: foundUser.earnings.totalInvestment,
                totalIncome: foundUser.earnings.totalIncome,
                directIncome: foundUser.earnings.directIncome,
                royalIncome: foundUser.earnings.royalIncome,
                salaryIncome: foundUser.earnings.salaryIncome,
                availableBalance: foundUser.earnings.availableBalance + Math.floor(Number(req.body.amount))
              }}},function(err){
                if(err){
                  console.log(err);
                }
              });

              //Updating Transaction History Success
              let updatedTransaction = [];

              foundUser.transaction.forEach(function(transaction){
                if(transaction.trnxId == req.body.trnxID){
                  const newTrnx = {
                    type: transaction.type,
                    from: transaction.from,
                    amount: transaction.amount,
                    status: 'Failed',
                    time:{
                      date: transaction.time.date,
                      month: transaction.time.month,
                      year: transaction.time.year
                    },
                    trnxId: transaction.trnxId
                  }
                  updatedTransaction.push(newTrnx);
                }else{
                  updatedTransaction.push(transaction);
                }
              });
              //Updating Transaction array for User
              User.updateOne({email:req.body.email}, {$set:{transaction:updatedTransaction}}, function(err){
                if(err){
                  console.log(err);
                }
              });

              //Update admin array
              let updatedArray = [];

              foundAdmin.withdrawal.forEach(function(transaction){
                if(transaction.trnxID != req.body.trnxID){
                  updatedArray.push(transaction);
                }
              });
              Admin.updateOne({email:process.env.ADMIN}, {$set:{withdrawal:updatedArray}}, function(err){
                if(err){
                  console.log(err);
                }
              });

            }
          });
        }
      });
    }
    res.redirect('/admin');
  }
});

app.post("/creditRoyal", function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
      if(err){
        console.log(err);
      }else{
        if(!foundAdmin){
          res.redirect('/adminLogin');
        }else{
          User.findOne({email:req.body.email}, function(err, foundUser){
           if(err){
             console.log(err);
           }else{
             User.updateOne({email:req.body.email}, {$set:{earnings:{
               currentInvestment: foundUser.earnings.currentInvestment,
               totalInvestment: foundUser.earnings.totalInvestment,
               totalIncome: foundUser.earnings.totalIncome + Number(req.body.amount),
               directIncome: foundUser.earnings.directIncome,
               salaryIncome: foundUser.earnings.salaryIncome,
               royalIncome: foundUser.earnings.royalIncome + Number(req.body.amount),
               availableBalance: foundUser.earnings.availableBalance + Number(req.body.amount)}}}, function(err){
                 if(err){
                   console.log(err);
                 }else{
                 //Updating Transaction History Success

                     let transaction = foundUser.transaction;

                     let newTransaction = {
                         type: 'Credit',
                         from: 'Incentive Wallet',
                         amount: req.body.amount,
                         status: 'Success',
                         time:{
                           date: date,
                           month: month,
                           year: year
                         }
                     }

                     transaction.push(newTransaction);

                     User.updateOne({email: req.body.email}, {$set:{transaction:transaction }}, function(error){
                       if(error){
                         console.log(error);
                       }
                     });

                 }
               });
             res.redirect('/admin');
           }
          })
        }
      }
    })
  }
});

app.post("/creditSalary", function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    Admin.findOne({email:process.env.ADMIN}, function(err, foundAdmin){
      if(err){
        console.log(err);
      }else{
        if(!foundAdmin){
          res.redirect('/adminLogin');
        }else{
          User.findOne({email:req.body.email}, function(err, foundUser){
           if(err){
             console.log(err);
           }else{
             User.updateOne({email:req.body.email}, {$set:{earnings:{
               currentInvestment: foundUser.earnings.currentInvestment,
               totalInvestment: foundUser.earnings.totalInvestment,
               totalIncome: foundUser.earnings.totalIncome + Number(req.body.amount),
               directIncome: foundUser.earnings.directIncome,
               salaryIncome: foundUser.earnings.salaryIncome + Number(req.body.amount),
               royalIncome: foundUser.earnings.royalIncome,
               availableBalance: foundUser.earnings.availableBalance + Number(req.body.amount)}}}, function(err){
                 if(err){
                   console.log(err);
                 }else{
                 //Updating Transaction History Success

                     let transaction = foundUser.transaction;

                     let newTransaction = {
                         type: 'Credit',
                         from: 'Salary Wallet',
                         amount: req.body.amount,
                         status: 'Success',
                         time:{
                           date: date,
                           month: month,
                           year: year
                         }
                     }

                     transaction.push(newTransaction);

                     User.updateOne({email: req.body.email}, {$set:{transaction:transaction }}, function(error){
                       if(error){
                         console.log(error);
                       }
                     });

                 }
               });
             res.redirect('/admin');
           }
          })
        }
      }
    })
  }
})

app.post('/userPanel', function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
      User.findOne({email:req.body.email}, function(err, foundUser){
        if(err){
          console.log(err);
        }else{
          if(!foundUser){
            res.redirect('/admin');
          }else{
            req.session.user = req.body;
            res.redirect("/dashboard");
          }
        }
      });
    }
  });

app.post('/unsetBankDetails', function(req, res){
  if(!req.session.admin){
    res.redirect('/adminLogin');
  }else{
    User.findOne({email:req.body.email}, function(err, foundUser){
      if(err){
        console.log(err);
      }else{
        if(!foundUser){
          res.redirect('/admin');
        }else{
          if(req.body.validation == "CONFIRM"){
            User.updateOne({email:req.body.email}, {$unset:{bankDetails:''}}, function(err){
              if(err){
                console.log(err);
              }else{
                res.redirect('/admin');
              }
            });
          }else{
            res.redirect('/admin');
          }
        }
      }
    });
  }
});






app.listen(process.env.PORT || 3000, function() {
  console.log("Server started on port 3000 | http://localhost:3000");
});
