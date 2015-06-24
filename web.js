var express = require('express');
var pg = require('pg').native;
var connectionString = process.env.DATABASE_URL;
var start = new Date();
var port = process.env.PORT;
var client;
var bodyParser = require('body-parser');
var cors = require('cors');
var app = express();
var password = require('password-hash-and-salt');         
var path = require('path');                                                           
var randtoken = require('rand-token');



client = new pg.Client(connectionString);
client.connect();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(__dirname +'/www'));
app.use(cors());


app.post('/logout',function(req,res){
    tokenAllowed(req.body.token,function(ok){
    if(ok){
      doLogOut(req,res);
    }
    else{
      noToken(req,res);
    }
  });                              
});

app.get('/seqtok',function(req,res){
  tokenAllowed(req.query.token,function(ok){
    if(ok){
      doseqTok(req,res);
    }
    else{
      noToken(req,res);
    }
  });                              
});

app.post('/newUser',function(req,res){

  var un = req.body.username;
  var pw = req.body.password;


  var query = client.query('SELECT COUNT(username) FROM users u WHERE u.username = $1', [un]);

  var count;
  query.on('row',function(result){
    count = result.count;
  });

  query.on('end',function(){
      if(count == 0){
        encrypt(pw,function(epw){
          var query2 = client.query('INSERT INTO users(username,password) VALUES($1,$2)',[un,epw]);
          query2.on('end',function(){
            var query3 = client.query('INSERT INTO badges(username,b1,b2,b3,b4) VALUES($1,FALSE,FALSE,FALSE,FALSE)',[un]);
            query3.on('end',function(){
              res.writeHead(200);
              res.write('signup succesful');
              res.end();
            });
          });
        });
      }
    else{
      res.write('User with this Username already exists!');
      res.end();
    }
  });



});


app.post('/login',function(req,res){
  var un = req.body.username;
  var pw = req.body.password;

  verifyCredentials(un,pw,function(verified){
    if(!verified){
      res.write('unauthorized login!');
      res.end();
    }
    else{
      var token = giveMeAToken();
      var queryTokenInsert = client.query('INSERT INTO validTokens(token) VALUES($1)',[token]);
      queryTokenInsert.on('end',function(){
        var setUserToken = client.query('UPDATE users SET token = $1 WHERE username = $2',[token,un]);
        setUserToken.on('end',function(){
          res.writeHead(200);
          res.write(token);
          res.end();
        });
      });
    }



  });


});
/////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////
app.get('/testupdate', function (req,res){
res.sendfile('testupdate.html'); 

});
////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/rank', function (req,res){
query = client.query('SELECT username , totalpoints, points_lvl FROM rank ORDER BY totalpoints DESC') ;
var alluser =[];
query.on('row', function (result){
var user ={
username : "",
totalpoints: 0 

} ; 
user.username = result.username;
user.totalpoints = result.totalpoints;
user.points_lvl = result.points_lvl ; 
alluser.push(user) ; 
});

query.on('err', function(err){
res.statusCode =  503 ; 
console.log("503 : ERROR "+ err.message );
return res.send( "503 : ERROR"); 
})

query.on('end', function(){
if(alluser.length < 1 ){
res.statusCode =404 ; 
console.log ("404 : NOT FOUND");
res.return ("404 : NOT FOUND");
res.end() ; 
}else {
res.statusCode = 200 ; 
console.log("SUCCESS RETRIEVING FROM DATABASE");
return res.send(alluser) ; 

}

});

});


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/user/:username', function (req,res){
  console.log("1");
if(!req.params.username ){console.log("start-----");
console.log("NEED USERNAME");
res.writeHead(400);
res.write('Error 400 : USERNAME not specified');
res.end();
}
  console.log("2");
var count =-1 ;
var user ={
username : req.params.username,
totalpoint : 0 ,
points_lvl : [10],
best : [10]
}
query = client.query('SELECT COUNT(*) AS COUNT ,TOTALPOINTS, USERNAME , POINTS_LVL , LVL_BEST FROM RANK WHERE USERNAME=$1 GROUP BY USERNAME', 
[user.username]);
query.on('row', function(result){
if(result){console.log("1-----");
count = result.count;
user.totalpoint = result.totalpoints;
user.points_lvl =result.points_lvl;
user.best = result.lvl_best;
console.log("RETRIEVE SUCCESS AT GET USER") ;
console.log(user.toString());
res.writeHead(200);
res.write(user.toString());
res.end();
//res.send(user);
}
});
query.on('err', function(err){
if(err){console.log("2-----");
console.log("ERROR" + err.message);
res.writeHead(503);
res.write("503 : ERROR");
res.end();
}

});
query.on('end', function(){
if(count == -1 ){console.log("3-----");
console.log("USER NOT FOUND");
res.writeHead(404);
res.write("404: USERNOT FOUND");
res.end();
}
res.end() ;
});

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.get('/pointsAtlevel/:username/:lvl', function (req, res){

if(!req.params.username || req.params.lvl < 0 || req.params.lvl>10 ){
console.log( "please specify what lvl need") ;


res.writeHead(400);
res.write('Error 400: BAD REQUEST , Post syntax incorrect.');
res.end();

}

var obj  = {
username : req.params.username,
};
 
query = client.query('SELECT POINTS_LVL [$1] AS points, COUNT(username)  FROM RANK WHERE username = $2 GROUP BY POINTS_LVL[$1]',[req.params.lvl-1, obj.username]);
var returnPoint = -1  ; var  p = -1 ; 
query.on('row', function (result){
if (result) {
returnPoint = result.count ;
p  = result.points ;
if(p != -1 ) {
console.log("suceess"+ result.points) ;
res.write(""+p) ;
res.end();
}else {
console.log("404 : NOT FOUND"); 
res.writeHead(404);
res.write("404: CAN NOT FIND USER WITH GIVEN USER NAME");
res.end();

}
 
} 
});

query.on('error', function(err){
console.log(err.message) ; 

res.writeHead(503);
res.write("503 : ERROR");
res.end();

});



query.on('end', function(){
if(returnPoint == -1 ) {
console.log("404 : NOT FOUND");
res.writeHead(404);
res.write("404: NOT CANT FIND USERNAME");}

res.end() ; 
});

});
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
app.post('/update/:lvl' , function (req, res){
if(!req.body.hasOwnProperty('username') || !req.body.hasOwnProperty('point') || !req.params.lvl > 0){
console.log( "please specify what lvl need to update") ;

res.writeHead(400);
res.write('Error 400: Post syntax incorrect.');
res.end() ; 

}  
var obj  = {
username : req.body.username,
point : req.body.point, 
level : req.params.lvl-1
};
// assuming the username is correct that why it can do the updating

query = client.query('SELECT count(username) , lvl_best[$1] AS best FROM rank WHERE username = $2 GROUP BY lvl_best[$1]',[obj.level, obj.username]);
var count = -1  ; var best =  0 ; 
query.on('row', function(result){
count = result.count ; 
best = result.best ;
});

query.on('err' , function(err){
console.log( "ERROR :  "+ err.message) ;

res.writeHead(503);
res.write("503 : ERROR");
res.end() ; 

});

query.on('end', function(){
if(count == -1 ) {
//res.statusCode = 404 ;
console.log ( "404 : USERNAME NOT FOUND") ; 
res.write("404 : USERNAME NOT FOUND");
}else {
   if(best >= obj.point){res.statusCode=200; console.log("DO NOT NEED TO UPDATE");  
   res.write("200 : DO NOT NEED TO UPDATE") ;  res.end() ; 
 }  
   else {
  client.query('UPDATE rank SET points_lvl[$1] = $2, lvl_best[$1]=$2 , totalpoints = totalpoints + $3 WHERE username=$4',[obj.level,obj.point,(obj.point-best),obj.username],function (err){
                if(err) {console.log( "err :"+err.message) ; res.writeHead(503); res.write("503 : Error at UPDATE" ) ; res.end() ;  }  
    console.log("UPDATED");
    res.writeHead(200);
    res.write("200 : UPDATE") ;   
    res.end() ; 
        }); 
        

  }
}
//res.end() ;
});


});


app.get('/userBadges',function(req,res){
  var un = req.body.username;

  var b1,b2,b3,b4;

  var result;

  var query = client.query('SELECT b1,b2,b3,b4 FROM badges b WHERE b.username = $1', [un]);


  query.on('row', function(row, result) {
      result.addRow(row);
  });

  query.on('end', function(result) {
      console.log(result.rows.length + ' rows were received');
  });

    // b1 = result.b1;
    // b2 = result.b2;
    // b3 = result.b3;
    // b4 = result.b4;

    // var toReturn = ""+b1.toString()+b2.toString()+b3.toString()+b4.toString();

    // res.writeHead(200);
    // res.write(toReturn);
    // res.end();








  // query.on('end',function(){

  //   for(key in result){
  //     console.log(result);
  //   }


  //   // var toReturn = ""+b1.toString()+b2.toString()+b3.toString()+b4.toString();

  //   // res.writeHead(200);
  //   // res.write(toReturn);
  //   // res.end();

  //   res.writeHead(200);
  //   res.write("");
  //   res.end();
  // });


});



app.post('/newBadge',function(req,res){
  var un = req.body.username;
  var bid = req.body.bid;

  var query;

    if(bid==1){
      query = client.query('UPDATE badges SET b1 = TRUE WHERE username = $1', [un]);
    }
    else if(bid==2){
      query = client.query('UPDATE badges SET b2 = TRUE WHERE username = $1', [un]);
    }
    else if(bid==3){
      query = client.query('UPDATE badges SET b3 = TRUE WHERE username = $1', [un]);
    }
    else if(bid==4){
      query = client.query('UPDATE badges SET b4 = TRUE WHERE username = $1', [un]);
    }

  query.on('end',function(){
        res.writeHead(200);
        res.write(token);
        res.end();
    });
});


///////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function doseqTok(req,res){
  var token = giveMeAToken();

  var query = client.query('INSERT INTO validTokens(token) VALUES($1)', [token],function(){
        res.writeHead(200);
        res.write(token);
        res.end();
  });
  query.on('end',function(){
    removeActiveToken(req.query.token,function(){
      return token;
    });
  });
  
}

function encrypt(given,callback){
  password(given).hash(function(error, hash) {
      if(error){
        throw new Error('Something went wrong!');
      }
      callback(hash);
  });
}


function verifyCredentials(givenUsername,givenPassword,callback){

  var query = client.query('SELECT password FROM users u WHERE u.username = $1',[givenUsername]);

  var storedHash;

  query.on('row',function(result){
    storedHash = result.password;
    //IF !result ?? 
  });

  query.on('end',function(){
      if(storedHash == null){
        callback(false);
      }
      password(givenPassword).verifyAgainst(storedHash, function(error, verified) {
        if(error)
            throw new Error('Something went wrong!');
        if(!verified) {
            callback(false);
        } else {
            callback(true);
        }
      });
  });
}



function giveMeAToken(given){
  var token = randtoken.generate(16);

  return token;
}

function tokenAllowed(given,callback){
  query = client.query('SELECT COUNT(token) FROM validTokens v WHERE v.token = $1',[given]);

  var count = 0;
  query.on('row',function(result){
    count = result.count;
  });

  query.on('end',function(){
    if(count != 0){                 
      callback(true);
    }
    else{
      callback(false);
    }
  });

}

function removeActiveToken(given,callback){
  query = client.query('DELETE FROM validTokens WHERE token = $1',[given]);
  query.on('end',function(){
    var removeUserToken = client.query('UPDATE users SET token = $1 WHERE username = $2',["absent",given]);
    removeUserToken.on('end',function(){
        callback();
    });
  });
}

function noToken(req,res){ 
  res.send('Invalid Access token!');
}

function doLogOut(req,res){
  removeActiveToken(req.query.token,loggedOut(req,res));
}

function loggedOut(req,res){
  res.write('logout succesful');
  res.end();
}





// use PORT set as an environment variable
var server = app.listen(process.env.PORT, function() {
    console.log('Listening on port %d', server.address().port);
});