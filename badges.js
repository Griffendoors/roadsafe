var pg = require('pg').native
  , connectionString = process.env.DATABASE_URL
  , client
  , query;


 //CREATE DATABASE CONECTION
client = new pg.Client(connectionString);
client.connect();

//CREATE A SCHEMA - users
query = client.query('DROP TABLE IF EXISTS badges;');
query = client.query('CREATE TABLE badges(username text PRIMARY KEY, b1 BOOLEAN, b2 BOOLEAN, b3 BOOLEAN, b4 BOOLEAN)');

query.on('end', function(result) { client.end(); });