var express = require('express'),
    app     = express(),
    morgan  = require('morgan'),
    bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
var cors = require('cors');
var moment = require('moment-timezone');
// Object.assign=require('object-assign');
app.use(cors());

var mongodb = require('mongodb'),
    MongoClient = mongodb.MongoClient;

var developMongoUrl = process.env.developMongoUrl;
if(developMongoUrl){
  console.log("Carregando ambiente DEV. developMongoUrl: ", developMongoUrl);
} else {
  console.log("Não foi localizada variável de ambiente de desenvolvimento. Carregando ambiente de PRODUÇÃO.");
}

const STATUS = {
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

const ChamadosCrud = {
  fecharChamado : (chamado, res, callback) => {
    try{
      console.log("|---    Iniciando método fecharChamado    ---|");
      console.log("Parâmetro recebidos : (_id, openingUser, mailTo, solution):");
      console.log((chamado._id + " - " + chamado.openingUser + " - " + chamado.mailTo + " - " + chamado.solution));
      var MongoClient = mongodb.MongoClient;
      MongoClient.connect(mongoURL, (err, db)=>{
        console.log("Iniciando processamento do método MongoClient.connect");
        if (err) throw err;
        var myquery =  { "osNumber" : parseInt(chamado.osNumber) };
        var newvalues = { $set: {"status" : 0, 
        "openingUser" : chamado.openingUser,
        "mailTo" : chamado.mailTo,
        "solution" : chamado.solution,
        "closingDate" : getNow() } };
        console.log("Tentando realizar o update... - método fecharChamado");
        db.db(dbName).collection(chamadosCollection).updateOne(myquery, newvalues, function(err, res) {
        console.log("1 document updated");
        db.close();
        if(callback){
          callback();
        }
        });
      });
      console.log("Finalizando fechamento");  
    } catch (ex){
      res.send({returnCode : -1, message : ex});
      console.log("Erro finalizando fechamento.", ex);  
    }
  }
};

const EmailManager = {
  sendCloseMail : function (chamado){
    console.log("EmailManager - Iniciando envio de email de FECHAMENTO. Chamado: ", chamado);
    
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'tarapi007@gmail.com',
        pass: 'generalize'
      }
    });
  
    var mailOptions = {
      from: 'atendimentochamado@gmail.com',
      to: chamado.mailTo,
      bcc: "clickticonsultoria@gmail.com",
      subject: `Encerramento do Chamado ${chamado.osNumber} - ClickTI Informática`, 
      html: `
        Olá ${chamado.openingUser}.

        Informamos que o chamado de número <b>${chamado.osNumber}</b> foi encerrado. <br/>
        Caso possamos ajudar em algo mais, pode responder neste email. <br/><br/>

        -------------------------- <br/><br/>

        <b>Descrição inicial:</b> ${chamado.description}<br/>

        <b>Solução executada:</b> ${chamado.solution}<br/><br/>

        -------------------------- <br/><br/>

        ClickTI Informática`
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log("Email enviado. Reponse: " + info.response);
        console.log("MailOptions:");
        console.log( mailOptions);
      }
    });
  },
  sendOpenMail : function (chamado){
    console.log("EmailManager - Iniciando envio de email de ABERTURA. Chamado: ", chamado);
    
    var transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'tarapi007@gmail.com',
        pass: 'generalize'
      }
    });
    
    chamado.mailTo.map(function(atual, indice){
      chamado.mailTo[indice] = atual.value;
    });

    var mailOptions = {
      from: 'atendimentochamado@gmail.com',
      to: chamado.mailTo[0],
      cc: chamado.mailTo.slice(1),
      bcc: "clickticonsultoria@gmail.com",
      subject: `Abertura de Chamado ${chamado.osNumber} - ClickTI Informática`, 
      html: `
        Olá ${chamado.openingUser}. 
        <br/><br/>
        Informamos que foi aberto o chamado de número <b>${chamado.osNumber}</b>. <br/>
        Entraremos em contato para atuação. 
        <br/><br/>
        -------------------------- 
        <br/><br/>
        <b>Descrição inicial:</b> ${chamado.description}<br/>
        -------------------------- 
        <br/><br/>
        ClickTI Informática`
    };
  
    transporter.sendMail(mailOptions, function(error, info){
      if (error) {
        console.log(error);
      } else {
        console.log("Email enviado. Reponse: " + info.response);
        console.log("MailOptions:");
        console.log( mailOptions);
      }
    });
  }
};


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
// var db = null,
//     dbDetails = new Object();

// var initDb = function(callback) {
//   if (mongoURL == null){
//     console.log(mongoURL);
//     return;
//   }
//   if (mongodb == null) return;

//   mongodb.connect(mongoURL, function(err, conn) {
//     if (err) {
//       callback(err);
//       return;
//     }

//     db = conn;
//     dbDetails.databaseName = db.databaseName;
//     dbDetails.url = mongoURLLabel;
//     dbDetails.type = 'MongoDB';

//     console.log('Connected to MongoDB at: %s', mongoURL);
//   });
// };

app.get('/', function (req, res) {
  res.send("Acesso raiz");
});

app.post('/open', function (req, res) {
  console.log("Requisição de abertura de chamado recebida às " + getNow());
  console.log("Corpo da requisição", req.body);
  let chamado = req.body;
  
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).find().sort({osNumber : -1}).limit(1).toArray(function(err, items) {
      if (err) throw err;
      console.log("Iniciando find().sort({osNumber : -1}).limit(1) ", items);

      let maxOsNumber = items[0].osNumber;
      if(isNaN(maxOsNumber)){
        res.json({ returnCode : -1, message : `maxOsNumber is NaN` });
        return false;
      }
      let nextOsNumber = maxOsNumber + 1;
      chamado.osNumber = nextOsNumber;

      chamado.status = STATUS.OPEN;
      chamado.openingDate = getNow();

      db.db(dbName).collection(chamadosCollection).insertOne(chamado, function(err, insertResponse) {
        if (err) throw err;
        console.log("1 document inserted");
        db.close();
        res.json({ returnCode : 1, message : `Os ${nextOsNumber} aberta com sucesso` });
        EmailManager.sendOpenMail(chamado);
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

app.post('/close', (req, res) => {
  console.log("|---    Requisição GET =>     /chamados/close    ---| Chamado:");
  var chamado = req.body;
  console.log(chamado);
  ChamadosCrud.fecharChamado(chamado, res, ()=>{
    console.log("Respondendo requisição...");
    res.json({returnCode : 1, message : "1 document updated"});
    EmailManager.sendCloseMail(chamado);
  });
});

app.get('/count', function (req, res) {
  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).count(function(err, count ){
        res.send('{ chamadosCount : ' + count + ' (1 com id 0)}');
    });
  });
});

app.get('/initialize', function (req, res) {
  var initializeChamado = {
    "osNumber" : 0,
    "status" : STATUS.CLOSED,
    "clientId" : 0,
    "clientName" : "",
    "openingUser" : "",
    "openingDate" : "",
    "description" : ".",
    "comments" : [],
    "mailTo" : "",
    "closingDate" : "",
    "solution" : ""
  };

  MongoClient.connect(mongoURL, (err, db)=>{
    if(err) throw err;
    db.db(dbName).collection(chamadosCollection).insertOne(initializeChamado, function(err, insertResponse) {
      if (err) throw err;
      res.json({ returnCode : 1, message : `DB initialized successfully` });
      db.close();
    });
  });
});


app.get('/getOpeneds', (req, res) => {
  console.log("---------> /getOpeneds <-------------")
  MongoClient.connect(mongoURL, (err, db)=>{
    try{
      if(err) {
        throw err;
      } 
      db.db(dbName).collection(chamadosCollection).find({status : STATUS.OPEN}).toArray(function(err, items) {
        console.log("Finalizada recuperação dos chamados.  get-'/chamados/getOpeneds' ");
        console.log(items);
        res.send(items);
      });
    } catch (e){
      console.error("[ /getOpeneds] - Falha ao conectar ao banco", e);
      res.send({status: -1});
    }
  });
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

app.post('/removeAll', function (req, res) {
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

function getNow() {
  return moment().tz('America/Sao_Paulo').format('YYYY-MM-DD HH:mm:ss');
}

