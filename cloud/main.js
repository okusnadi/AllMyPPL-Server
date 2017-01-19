var app = require('cloud/app.js');

var twilioPhoneNumber = '+16502062610';
var secretPasswordToken = '0420';

var language = "en";
var languages = ["en", "es", "ja", "kr", "pt-BR"];

var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID || "twilioAccountSid", process.env.TWILIO_AUTH_TOKEN || "twilioAuthToken");

Parse.Cloud.define("sendCode", function(req, res) {
	var phoneNumber = req.params.phoneNumber;
	phoneNumber = phoneNumber;

	var lang = req.params.language;
  if(lang !== undefined && languages.indexOf(lang) != -1) {
		language = lang;
	}

	if (!phoneNumber || (phoneNumber.length != 10 && phoneNumber.length != 11)) return res.error('Invalid Parameters');
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query(Parse.User);
	query.equalTo('username', phoneNumber + "");
	query.first().then(function(result) {
		var min = 1000; var max = 9999;
		var num = Math.floor(Math.random() * (max - min + 1)) + min;

		if (result) {
			result.set("language", language);
			result.save().then(function() {
				return sendCodeSms(phoneNumber, num, language);
			}).then(function() {
				res.success({});
			}, function(err) {
				res.error(err);
			});
		} else {
			var user = new Parse.User();
			user.setUsername(phoneNumber);
			user.setPassword(secretPasswordToken);
			user.set("language", language);
			user.setACL({});
			user.save().then(function(a) {
				return sendCodeSms(phoneNumber, num, language);
			}).then(function() {
				res.success({});
			}, function(err) {
				res.error(err);
			});
		}
	}, function (err) {
		res.error(err);
	});
});

Parse.Cloud.define("logIn", function(req, res) {
	Parse.Cloud.useMasterKey();

	var phoneNumber = req.params.phoneNumber;
	phoneNumber = phoneNumber;

	if (phoneNumber && req.params.codeEntry) {
		Parse.User.logIn(phoneNumber, secretPasswordToken).then(function (user) {
			res.success(user.getSessionToken());
		}, function (err) {
			res.error(err);
		});
	} else {
		res.error('Invalid parameters.');
	}
});

function sendCodeSms(phoneNumber, code, language) {
	var prefix = "+1";
	if(typeof language !== undefined && language == "ja") {
		prefix = "+81";
	} else if (typeof language !== undefined && language == "kr") {
		prefix = "+82";
		phoneNumber = phoneNumber.substring(1);
	} else if (typeof language !== undefined && language == "pt-BR") {
		prefix = "+55";
  }

	var promise = new Parse.Promise();
	twilio.sendSms({
		to: prefix + phoneNumber,
		from: twilioPhoneNumber,
		body: 'Your login code for AllMyPPL is ' + code
	}, function(err, responseData) {
		if (err) {
			console.log(err);
			promise.reject(err.message);
		} else {
			promise.resolve();
		}
	});
	return promise;
}

/* Parse.Object class extension example
// A complex subclass of Parse.Object
var Monster = Parse.Object.extend("Monster", {
  // Instance methods
  hasSuperHumanStrength: function () {
    return this.get("strength") > 18;
  },
  // Instance properties go in an initialize method
  initialize: function (attrs, options) {
    this.sound = "Rawr"
  }
}, {
  // Class methods
  spawn: function(strength) {
    var monster = new Monster();
    monster.set("strength", strength);
    return monster;
  }
});

var monster = Monster.spawn(200);
alert(monster.get('strength'));  // Displays 200.
alert(monster.sound); // Displays Rawr.
*/


 function validateEmail(email) {
     var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     return re.test(email);
 }

 function validateUsernameIsDigits(username) {
     var re = /^\d+$/;
     return re.test(username);
 }


 /*
  * text({Body:"",To:"",From:""})
  * sends a message via twilio
  */


Parse.Cloud.define('text', (req,res) => {

   const Body = req.params.Body;
   const To = req.params.To;
   const From = req.params.From;
   const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
   const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from www.twilio.com/console

   var twilio = require('twilio');
   var client = new twilio.RestClient(accountSid, authToken);

   if (!req.params.Body || !req.params.To || !req.params.From) { res.error(new Parse.Error(Parse.Error.SCRIPT_ERROR,'When calling, req.params must be {Body:"",To:"",From:""}.')); }
   else {
     client.messages.create({
         body: Body,
         to: To,
         from: From
     }, function(err, message) {
         if(err) { res.error(new Parse.Error(err.code, err.message)); }
         else { res.success("Sent message with Body: '"+Body+"', To:'"+To+"', From:"+From); }
     });
   }

});


/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

Parse.Cloud.beforeSave("Contact", (req, res) => {

  const obj = req.object;
  const user = req.user;

  if (!user) {console.log("no req.user");}
  else {console.log("user",user.toJSON());}

  if (!obj) {console.log("no object passed in, aborting..."); res.error(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,"No req.object found."));}
  else {console.log("beforeSave triggered on Contact ",obj.toJSON()); obj.set('nameLowercase', obj.get("name").toLowerCase()); res.success();}

});

/*
 * this beforeSave handler performs field validation on the email and username fields.
 */


/*Parse.Cloud.beforeSave(Parse.User, (req, res) => {
  const obj = req.object;
  const user = req.user;

  if (obj.get('email') && !validateEmail(obj.get('email'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"You must use a valid email address."));}
  else if (obj.get('username').length != 10 || !validateUsernameIsDigits(obj.get('username'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"Username must be a ten digit phone number."));}
  else {res.success();}
});*/
