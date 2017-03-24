var twilioPhoneNumber = '+16502062610';
var supportPhoneNumber = '+16505878510';
var allMyPPLPhoneNumber = '+16502062610';

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
			result.setPassword(""+num);
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
			user.setPassword(""+num);
			user.set("language", language);
      var newACL = new Parse.ACL();
      newACL.setPublicReadAccess(true);
			user.setACL(newACL);
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

Parse.Cloud.define("doesUserExist", function(req, res) {
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

		if (result) {
      return true
    } else {
      return false;
    }
  }).then(
    function(bool){res.success(bool);},
    function(err){res.error(err);}
  );
});


Parse.Cloud.define("logIn", function(req, res) {
	Parse.Cloud.useMasterKey();

  //res.error(params);
  //return;
  var phoneNumber = req.params.phoneNumber;

  if (!phoneNumber) {
      res.error("phone number");
	} else if (!req.params.codeEntry) {
      res.error("code entry")
	} else {
    Parse.User.logIn(phoneNumber, req.params.codeEntry).then(function (user) {
    res.success(user.getSessionToken());
  }, function (err) {
    res.error(err);
  });
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

Parse.Cloud.define("getAllContactsForDigit", function(req, res) {
	var digit = req.params.digit

	var queries = [
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact"),
		new Parse.Query("Contact")
	]
	switch (digit) {
		case "2":
		queries[0].startsWith("nameLowercase","a");
		queries[1].startsWith("nameLowercase","b");
		queries[2].startsWith("nameLowercase","c");
		queries[3].startsWith("nameLowercase","2");
		var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
		digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "3":
			queries[0].startsWith("nameLowercase","d");
			queries[1].startsWith("nameLowercase","e");
			queries[2].startsWith("nameLowercase","f");
			queries[3].startsWith("nameLowercase","3");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "4":
			queries[0].startsWith("nameLowercase","g");
			queries[1].startsWith("nameLowercase","h");
			queries[2].startsWith("nameLowercase","i");
			queries[3].startsWith("nameLowercase","4");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "5":
			queries[0].startsWith("nameLowercase","j");
			queries[1].startsWith("nameLowercase","k");
			queries[2].startsWith("nameLowercase","l");
			queries[3].startsWith("nameLowercase","5");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "6":
			queries[0].startsWith("nameLowercase","m");
			queries[1].startsWith("nameLowercase","n");
			queries[2].startsWith("nameLowercase","o");
			queries[3].startsWith("nameLowercase","6");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "7":
			queries[0].startsWith("nameLowercase","p");
			queries[1].startsWith("nameLowercase","q");
			queries[2].startsWith("nameLowercase","r");
			queries[3].startsWith("nameLowercase","s");
			queries[4].startsWith("nameLowercase","7");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3], queries[4]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "8":
			queries[0].startsWith("nameLowercase","t");
			queries[1].startsWith("nameLowercase","u");
			queries[2].startsWith("nameLowercase","v");
			queries[3].startsWith("nameLowercase","8");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
			case "9":
			queries[0].startsWith("nameLowercase","w");
			queries[1].startsWith("nameLowercase","x");
			queries[2].startsWith("nameLowercase","y");
			queries[3].startsWith("nameLowercase","z");
			queries[4].startsWith("nameLowercase","9");
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3],queries[4]);
			digitQuery.find().then(function(results) {res.success(results);});
			break;
		default:
			queries[0].startsWith("nameLowercase",digit);
			queries[1].startsWith("nameLowercase"," ");
			queries[2].startsWith("nameLowercase",".");
			queries[3].startsWith("nameLowercase","_");
			queries[4].startsWith("nameLowercase","-");
			queries[5].startsWith("nameLowercase","(");
			queries[6].startsWith("nameLowercase","'");
			queries[7].startsWith("nameLowercase",'"');
			var digitQuery = Parse.Query.or(queries[0],queries[1],queries[2],queries[3],queries[4],queries[5],queries[6],queries[7]);
			digitQuery.find().then(function(results) {res.success(results);});
	}
});

Parse.Cloud.define("getActiveParty", (req,res) => {
	var user = req.user;
	var partyQuery = new Parse.Query("Party")
	partyQuery.equalTo("users",user);
	partyQuery.first().then(function(result) {
		res.success(result);
	},function(error) {
		res.error(error);
	});
});

Parse.Cloud.define("getActiveHostedParty", (req,res) => {
	var user = req.user;
	var partyQuery = new Parse.Query("Party")
	partyQuery.equalTo("host",user);
	partyQuery.first().then(function(result) {
		res.success(result);
	},function(error) {
		res.error(error);
	});
});

Parse.Cloud.define("joinParty", (req,res) => {
	var user = req.user;
	const partyID = req.params.partyID;
	var partyQuery = new Parse.Query("Party")
	partyQuery.get(partyID).then(function(result) {
		result["users"].push(user);
		return result.save();
	}).then(function(saved) {
		res.success(saved);
	}).error(function(error) {
		res.error(error);
	});
});

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

Parse.Cloud.beforeSave(Parse.User, (req, res) => {

  const obj = req.object;

	if (!obj.existed()) {

		let Body = obj.get('username') + " just signed up with AllMyPPL, please whitelist them with Twilio.";
    let To = supportPhoneNumber;
    let From = allMyPPLPhoneNumber;
    let accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
    let authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from www.twilio.com/console

    var twilio = require('twilio');
    var client = new twilio.RestClient(accountSid, authToken);

    client.messages.create({
          body: Body,
          to: To,
          from: From
      }, function(err, message) {
				if (!err) {	// message sent
				} else { // message failed
				}
			});

	}
	res.success();
});

// Deletes user by phone number

Parse.Cloud.define("deleteUserByPhoneNumber", function(req, res) {
	var phoneNumber = req.params.phoneNumber;
	phoneNumber = phoneNumber;

	if (!phoneNumber || (phoneNumber.length != 10)) { return res.error('Invalid Parameters'); }
	Parse.Cloud.useMasterKey();
	var query = new Parse.Query(Parse.User);
	query.equalTo('username', phoneNumber + "");
	query.first().then(function(result) {

		if (result) {
			result.destroy().then(function() {
				return;
			}).then(function() {
				res.success("User destroyed for " + phoneNumber);
			}, function(err) {
				res.error(err);
			});
		} else {
				res.error("User not found for " + phoneNumber + ".");
		}
	}, function (err) {
		res.error(err);
	});
});
