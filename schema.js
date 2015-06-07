var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;


//QUOTES TO BE INITIALLY ADDED TO DATABASE
var quotes = [
  { author : 'Audrey Hepburn', text : "Nothing is impossible, the word itself says 'I'm possible'!"},
  { author : 'Walt Disney', text : "You may not realize it when it happens, but a kick in the teeth may be the best thing in the world for you"},
  { author : 'Unknown', text : "Even the greatest was once a beginner. Don’t be afraid to take that first step."},
  { author : 'Neale Donald Walsch', text : "You are afraid to die, and you’re afraid to live. What a way to exist."}
];



//CREATE DATABASE CONECTION
client = new pg.Client(connectionString);
client.connect();
//CREATE A SCHEMA - quotes
query = client.query('CREATE TABLE quotes(tablekey integer PRIMARY KEY, author text UNIQUE, content text NOT NULL)');

//POPULATE THE QUOTES SCHEMA
query = client.query('INSERT INTO quotes(tablekey, author,content) VALUES($1,$2,$3)', [1,quotes[0].author,quotes[0].text]);
query = client.query('INSERT INTO quotes(tablekey,author,content) VALUES($1,$2,$3)', [2,quotes[1].author,quotes[1].text]);
query = client.query('INSERT INTO quotes(tablekey,author,content) VALUES($1,$2,$3)', [3,quotes[2].author,quotes[2].text]);
query = client.query('INSERT INTO quotes(tablekey,author,content) VALUES($1,$2,$3)', [4,quotes[3].author,quotes[3].text]);

//CALLBACK TO END DATABASE CONNECTION
query.on('end', function(result) { client.end(); });


