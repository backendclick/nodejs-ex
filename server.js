//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');

const chamadosCollection = "chamados";

app.use(express.bodyParser());
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  // if (!db) {
  //   initDb(function(err){});
  // }
  // if (db) {
  //   var col = db.collection('counts');
  //   // Create a document with request IP and current time of request
  //   col.insert({ip: req.ip, date: Date.now()});
  //   col.count(function(err, count){
  //     if (err) {
  //       console.log('Error running count. Message:\n'+err);
  //     }
  //     res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
  //   });
  // } else {
  //   res.render('index.html', { pageCountMessage : null});
  // }
  res.send("Acesso raiz");
});

app.post('/open', function (req, res) {
  console.log("Requisição de abertura de chamado recebida às " + new Date());
  console.log("Corpo da requisição", req.body);

  if (!db) {
    initDb(function(err){});
  }

  var chamado = req.body;
  console.log("chamado recebido", chamado);
  try{
    dbo.collection(chamadosCollection).insertOne(chamado, function(err, res) {
      if (err) throw err;
      console.log("1 document inserted");
      res.send({status:1, message : "1 document inserted"});
      db.close();
    });
  } catch(e){
    res.send({message : "Erro ao tentar abrir chamado", details: e});
  }
});

app.get('/count', function (req, res) {
  if (db) {
    db.collection(chamadosCollection).count(function(err, count ){
      res.send('{ chamadosCount : ' + count + '}');
    });
  } else {
    res.send('{ chamadosCount : -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
