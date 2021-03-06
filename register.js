var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;


 //CREATE DATABASE CONECTION
client = new pg.Client(connectionString);
client.connect();

var un = 'test';
var pw = '1234';

//CREATE A SCHEMA - users
query = client.query('DROP TABLE IF EXISTS users;');
query = client.query('DROP TABLE IF EXISTS rank;');
query = client.query('CREATE TABLE users(username text PRIMARY KEY, password text NOT NULL, token text)');
query = client.query(' CREATE TABLE rank (USERNAME VARCHAR(15) PRIMARY KEY, TOTALPOINTS INTEGER DEFAULT 0 CHECK (TOTALPOINTS >=0 ) , POINTS_LVL INTEGER[10] , LVL_BEST INTEGER[10] ) ') ;
//CALLBACK TO END DATABASE CONNECTION
query.on('end', function(result) { client.end(); });