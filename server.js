// required modules
var express = require('express');
var mongoose = require('mongoose');
var engine = require('ejs-locals');
var http = require('http');
var multer = require('multer');
var path = require('path');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');

// connect to MongoDB
var db = 'SocioNet';
mongoose.connect('mongodb://localhost/'+db,function(err,db){
	if(err)
	console.log("Database Connection Error!");
});

// Profile image storage
var storage = multer.diskStorage({
	destination : function(req,file,callback){
		callback(null,'./public/data');
	},
	filename : function(req,file,callback){
		callback(null,req.session.user.username+'.jpg');
	}
});
var upload = multer({storage:storage}).array('image');

// initialize our app
var app = express();

// app configuation
app.set('view engine','ejs'); // setup ejs for templating
app.use(express.static(path.join(__dirname+'/public'))); // to allow stylesheets,imgs to be accessed
app.set('views', __dirname + '/views');
app.use(morgan('dev')); // for logging
app.use(bodyParser.json());// get info from html forms
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser()); // read cookies (needed for auth)
app.use(express.session({secret: 'parth_sachin',saveUninitialized:true,resave:true}));

// port that server will listen on
var port = 3000;

// start listening...
// start socket.io
var server = http.createServer(app);
var io = require('socket.io').listen(server);
server.listen(port);
console.log('Express server listening on port '+port);

// create user model 
var User = mongoose.model('User', {
	username: String,
	password: String,
	image: String,
	bio: String,
	friends: [String],
	pending: [String],
	waiting: [String]
});

// create status model
var Status = mongoose.model('Status', {
	body: String,
	time: Number,
	username: String,
	image: String,
	comments: Array,
	likes: Array
});

// create notifications model
var Notif = mongoose.model('Notif',{
	body: String,
	from: String,
	to:String,
	status:String,
	time: Number,
	type: String
});

// create messages model
var Message = mongoose.model('Message',{
	body: String,
	from: String,
	to:String,
	time: Number
});

// check if user logged in, redirect to homepage, else to login page
app.get('/', function (req, res) {

	if (req.session.user){

		Status.find({}).sort({time: -1}).execFind(function (err, statuses){
			Notif.find({}).sort({time:-1}).execFind(function(err,notifs){
				Message.find({}).sort({time:-1}).execFind(function(err,messages){
				User.findOne({username:req.session.user.username},function(err,user){
					req.session.user = user;
					res.render('homepage.ejs', {user: user, statuses: statuses,notifs:notifs,messages:messages});
				});
				});
			});
		});

	} else {
		res.redirect('/login');
	}

});

app.get('/logout', function (req, res) {

	if (req.session.user) {
		console.log(req.session.user.username+' has logged out');
		delete req.session.user;
	}

	res.redirect('/');

});

app.get('/login', function (req, res) {

	var error1 = null;
	var error2 = null;

	if (req.query.error1) {
		error1 = "Sorry please try again";
	}

	if (req.query.error2) {
		error2 = "Sorry please try again";
	}

	res.render('login.ejs', {error1: error1, error2: error2});

});

app.post('/login', function (req, res) {
	var username = req.body.username.toLowerCase();
	var password = req.body.password;

	var query = {username: username, password: password};

	User.findOne(query, function (err, user) {

		if (err || !user) {
			res.redirect('/login?error2=1');
		} else {
			req.session.user = user;
			console.log(username+' has logged in');
			res.redirect('/');
		}

	});
});


app.post('/signup', function (req, res){

	var username = req.body.username.toLowerCase();
	var password = req.body.password;
	var confirm = req.body.confirm;

	if(password != confirm) {
		res.redirect('/login?error1=1');
	}

	else {

		var query = {username: username};

		User.findOne(query, function (err, user) {
			if (user) {
				res.redirect('/login?error1=1');
			} else {

				var userData = { 
					username: username,
					password: password,
					image: 'http://leadersinheels.com/wp-content/uploads/facebook-default.jpg', // default image
					bio: 'I\'m new to SocioNet!!',
					friends:[],
					pending:[],
					waiting:[],
					hidden: false,
					wall: []
				};

				var newUser = new User(userData).save(function (err){

					req.session.user = userData;
					console.log('New user '+username+' has been created!');
					res.redirect('/users/'+username);

				});
			}
		});
	}
});

// user profile
app.get('/users/:username', function (req, res) {

	if (req.session.user) {

		var username = req.params.username.toLowerCase();
		var query = {username: username};
		var currentUser = req.session.user;

		if(username === currentUser){
			Status.find(query).sort({time: -1}).execFind(function(err, statuses){
				Notif.find({}).sort({time: -1}).execFind(function(err, notifs){
				Message.find({}).sort({time: -1}).execFind(function(err, messages){
				User.findOne({username:currentUser.username},function(err,user_){
					req.session.user = user_;
					res.render('profile.ejs', {
						user: user_, 
						statuses: statuses, 
						notifs:notifs,
						messages:messages,
						currentUser: user_
					});	
				});
				});
				});
			});
		}
		else{
			User.findOne(query, function (err, user) {

				if (err || !user) { // if user profile not found, redirect to homepage
					res.redirect("/");
				} else {
					Status.find(query).sort({time: -1}).execFind(function(err, statuses){
						Notif.find({}).sort({time: -1}).execFind(function(err, notifs){
						Message.find({}).sort({time: -1}).execFind(function(err, messages){
						User.findOne({username:currentUser.username},function(err,user_){
							req.session.user = user_;
							res.render('profile.ejs', {
								user: user, 
								statuses: statuses,
								notifs:notifs, 
								messages:messages,
								currentUser: user_
							});	
						});
						});
						});
					});
				}
			});
		}
	}
	else{
		res.redirect('/login');
	}
});

// profile update request
app.post('/profile', function (req, res) {

	if (req.session.user){
		upload(req,res,function(err){
	
			var username = req.session.user.username;
			var query = {username: username};

			var newBio = req.body.bio;
			var newImage = '/data/'+username+'.jpg';

			var change = {bio: newBio, image: newImage};

			User.update(query, change, function (err, user) {

				Status.update(query, {image: newImage}, {multi: true}, function(err, statuses){
					
					console.log(username+' has updated their profile');
					req.session.user.bio = newBio;
					req.session.user.image = newImage;
					res.redirect('/users/'+username);
				});

			});
		});

	} else {
		res.redirect('/login');
	}
});

// new status by profile page
app.post('/statuses', function (req, res) {

	if (req.session.user) {
			var status = req.body.status;
			var username = req.session.user.username;
			var pic = req.session.user.image;
			var statusData = { 
				body: status,
				time: new Date().getTime(),
				username: username,
				image: pic,
				comments: [],
				likes: []
			};
			var newStatus = new Status(statusData).save(function (err) {
				console.log(username+' has posted a new status');
				io.sockets.emit('newStatus', {statusData: statusData});
				res.redirect('/users/'+username);
			});
	} else {
		res.redirect('/login');
	}
});

// new status by homepage
app.post('/statuses1', function (req, res) {

	if (req.session.user) {
			var status = req.body.status;
			var username = req.session.user.username;
			var pic = req.session.user.image;
			var statusData = { 
				body: status,
				time: new Date().getTime(),
				username: username,
				image: pic,
				comments: [],
				likes: []
			};
			var newStatus = new Status(statusData).save(function (err) {
				console.log(username+' has posted a new status');
				io.sockets.emit('newStatus', {statusData: statusData});
				res.redirect('/');
			});
	} else {
		res.redirect('/login');
	}
});

// search query results
app.post('/search',function(req,res){
	console.log("Search request coming");
	if (req.session.user) {
		var username = req.body.key;
		var query = {username: new RegExp(username,'i')};
		var currentUser = req.session.user;

		User.find(query, function (err, users) {
			if (err)
				throw err;
			var ans = [];
			for(var i=0;i<users.length;i++){
				ans.push(users[i].username);
			}
			res.send(JSON.stringify(ans));
		});
	} else {
		res.redirect('/login');
	}
});

// send friend request
app.post('/send_request', function (req, res) {
	console.log("New friend request");
	if (req.session.user) {
			var from = req.body.from;
			var to = req.body.to;
			var username = req.session.user.username;
			// first add 'to' to 'from's waiting list
			var query = {username: username};
			var wtn = req.session.user.waiting;
			wtn.push(to);
			var change = {waiting:wtn};
			User.update(query, change, function (err, user) {
				// now add 'from' to 'to's pending list
				User.findOne({username:to},function(err,data){
					var pnd = data.pending;
					pnd.push(from);
					change = {pending:pnd};
					User.update({username:to},change,function(err,user){
						// if all successful, send notification message
						var notifData = { 
							body: from+" has sent you a friend request!",
							time: new Date().getTime(),
							status: "not_read",
							from: from,
							to: to,
							type : "req"
						};
						var newNotify = new Notif(notifData).save(function (err) {
							io.sockets.emit('notification', {notifData: notifData});
							res.redirect('/users/'+to);
						});
					});
				});
			});
	} else {
		res.redirect('/login');
	}
});

// respond to friend request
app.post('/respond_request', function (req, res) {
	var ans = req.body.ans;
	if(ans === "Accept")
		console.log("Request Accepted...");
	else
		console.log("Request Rejected...");
	if (req.session.user) {
			var from = req.body.from;
			var to = req.body.to;
			var username = req.session.user.username;
			
			// first remove 'from' from 'to's pending list
			var pnd = req.session.user.pending;
			for(var i=0;i<pnd.length;i++)
				if(pnd[i]===from)
					break;
			pnd.splice(i,1);
			var frn = req.session.user.friends;
			if(ans === "Accept")
				frn.push(from);
			var change = {pending:pnd,friends:frn};
			User.update({username:username}, change, function (err, user) {

				// now remove 'to' from 'from's waiting list
				User.findOne({username:from},function(err,data){
					var wtn = data.waiting;
					for(var i=0;i<wtn.length;i++)
						if(wtn[i]===to)
							break;
					wtn.splice(i,1);
					var frn1 = data.friends;
					if(ans === "Accept")
						frn1.push(to);
					change = {waiting:wtn,friends:frn1};
					User.update({username:from},change,function(err,data_){
						// send notification of acceptance
						if(ans === "Accept"){
							var notifData = { 
								body: to+" has accepted your friend request!",
								time: new Date().getTime(),
								status: "not_read",
								from: from,
								to: to,
								type : "res"
							};
							var newNotify = new Notif(notifData).save(function (err) {
								io.sockets.emit('notification', {notifData: notifData});
								res.redirect('/users/'+from);
							});
						}
						// send notification of rejection
						else{
							var notifData = { 
								body: to+" has rejected your friend request!",
								time: new Date().getTime(),
								status: "not_read",
								from: from,
								to: to,
								type : "res"
							};
							var newNotify = new Notif(notifData).save(function (err) {
								io.sockets.emit('notification', {notifData: notifData});
								res.redirect('/users/'+username);
							});
						}
					});
				});
			});
	} else {
		res.redirect('/login');
	}
});

// checking if the given user is friend or not
app.post('/check_friend',function(req,res){
	var currentUser = req.session.user;
	var flag = false;
	for(var i=0;i<currentUser.friends.length;i++)
		if(currentUser.friends[i] === req.body.check){
			flag = true;
			break;
		}
	if(flag)
		res.send({ans:"yes"});
	else res.send({ans:"no"});
});

// marking a given notification read
app.post('/mark_read',function(req,res){
	var change = {status:"read"};
	Notif.update({time:req.body.time},change,function(err,data){
		res.send({msg:"OK"});
	});
});

// chekcs if username exists
app.post('/check_user',function(req,res){
	User.findOne({username:req.body.username},function(err,data){
		if(err || (!data)){
			res.send({msg:"not_valid"});
		}
		else{
			res.send({msg:"valid"});
		}
	});
});

// message rqt from profile - stores new messge and broadcasts
app.post('/send_msg',function(req,res){
	var username = req.session.user.username.toLowerCase();
	var to = req.body.to;
	var text = req.body.msg;
	var msgData = { 
		body: text,
		time: new Date().getTime(),
		from: username,
		to: to
		};
	var newMsg = new Message(msgData).save(function (err) {
		io.sockets.emit('new_message', {msgData: msgData});
		res.redirect('/users/'+username);
	});
});

// message rqt from homepage - stores new messge and broadcasts
app.post('/send_msg1',function(req,res){
	var username = req.session.user.username.toLowerCase();
	var to = req.body.to;
	var text = req.body.msg;
	var msgData = { 
		body: text,
		time: new Date().getTime(),
		from: username,
		to: to
		};
	var newMsg = new Message(msgData).save(function (err) {
		io.sockets.emit('new_message', {msgData: msgData});
		res.redirect('/');
	});
});

