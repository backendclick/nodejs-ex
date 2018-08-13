var express = require('express'),
    app     = express(),
    morgan  = require('morgan'),
    bodyParser = require('body-parser');

var mongodb = require('mongodb'),
    MongoClient = mongodb.MongoClient;

var developMongoUrl = process.env.developMongoUrl;
if(developMongoUrl){
  console.log("Ambiente DEV detectado.");
  console.log(developMongoUrl);
} else {
  console.log("Ambiente de PRODUÇÃO detectado.");
}
var STATUS = {
  OPEN : 1, 
  CLOSED : 0
};

const dbName = "sampledb";
const chamadosCollection = "chamados";

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL || developMongoUrl,
    mongoURLLabel = "";

function log(msg){
  console.log(msg);
}

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  console.log("Montando string de conexão...");
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
    console.log("String de conexão definida:");
    console.log(mongoURL);

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null){
    console.log(mongoURL);
    return;
  }
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
  res.send("Acesso raiz");
});

app.post('/open', function (req, res) {
  console.log("Requisição de abertura de chamado recebida às " + new Date());
  console.log("Corpo da requisição", req.body);
  let chamado = req.body;
  
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).find().sort({osNumber : -1}).limit(1).toArray(function(err, items) {
      if (err) throw err;
      console.log("Iniciando find().sort({osNumber : -1}).limit(1) ", items);

      let maxOsNumber = items[0].osNumber;
      let nextOsNumber = maxOsNumber + 1;
      chamado.osNumber = nextOsNumber;

      chamado.status = STATUS.OPEN;
      chamado.openingDate = new Date();

      db.db(dbName).collection(chamadosCollection).insertOne(chamado, function(err, insertResponse) {
          if (err) throw err;
          console.log("1 document inserted");
          res.json({ returnCode : 1, message : `Os ${nextOsNumber} aberta com sucesso` });
          db.close();
        });
    });
    // var cursor = db.db(dbName).collection(chamadosCollection).find();
    // if(cursor.hasNext()){
    //   cursor.nextObject(function(err, object){
    //     console.log("entrou no next object");
    //   });
    // } else {
    //   throw new Error("Não foi encontrado max osNumber.");
    // }
  })

});

app.get('/count', function (req, res) {
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).count(function(err, count ){
        res.send('{ chamadosCount : ' + count + '}');
    });
  });
});


app.get('/getOpeneds', (req, res) => {
  console.log("---------> /getOpeneds <-------------")
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).find({status : 1}).toArray(function(err, items) {
      console.log("Finalizada recuperação dos chamados.  get-'/chamados/getOpeneds' ");
      console.log(items);
      res.send(items);
    });
  })
});

app.get('/getAll', (req, res) => {
  console.log("---------> /getAll <-------------")
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).find().toArray(function(err, items) {
      console.log("Finalizada recuperação dos chamados.  get-'/getAll' ");
      console.log(items);
      res.send(items);
    });
  })
});

app.get('/removeAll', function (req, res) {
  if(req.query.senha === "fudeu"){
    MongoClient.connect(mongoURL, (err, db)=>{
      if(err) throw err;
      db.db(dbName).collection(chamadosCollection).remove(
        {},
        { justOne : false }
     )
    });
  } else {
    res.json({returnCode : -1, msg: "senha errada"});
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

// initDb(function(err){
//   console.log('Error connecting to Mongo. Message:\n'+err);
// });

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
