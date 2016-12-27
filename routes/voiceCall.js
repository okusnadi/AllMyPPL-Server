var twilio = require('twilio');
var Parse = require('parse');

    Parse.initialize(process.env.APP_ID);
    Parse.serverURL = process.env.SERVER_URL;

exports.introduction = function(request, response) {

    console.log(JSON.stringify(request.body));

    var phone = request.body.From;
    var input = request.body.Digits;
    var twiml = new twilio.TwimlResponse();

    // helper to append a new "Say" verb with alice voice
    function say(text) {
        twiml.say(text, { voice: 'alice'});
    }

    // respond with the current TwiML content
    function respond() {
        response.type('text/xml');
        response.send(twiml.toString());
    }

    var user = Parse.User.currentUser();

    var logInPromise = new Parse.Promise();
    // Find an in-progess survey if one exists, otherwise create one
    if (!input) { say('Welcome to All My People. Please enter the ten digit phone number for your account.'); twiml.gather({ timeout: 20, numDigits: 10 }); }
    else if (input.length == 10) { say("Entered account phone number, "+input+"."); user.set('username',input); say("Please enter the four digit pin number for your account."); twiml.gather({ timeout: 15, numDigits: 10 });}
    else if (input.length == 4) { say("Entered account pin number, "+input+"."); Parse.User.logIn(user.get('username'),input).then(function(user){say("Welcome, "+user.get('username')+"."); logInPromise.resolve(user);},function(user, error){logInPromise.reject(error)}); }



        // render TwiML response
        Parse.Promise.when(logInPromise).then(function(user){respond();},function(error){console.error(error.code + " : " + error.message); say("An error has occurred, please call again."); respond();});
};
