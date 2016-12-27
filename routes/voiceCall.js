var twilio = require('twilio');
var Parse = require('parse');

    Parse.initialize(process.env.APP_ID);
    Parse.serverURL = process.env.SERVER_URL;

    Parse.User.currentUser().set('state',0);

exports.introduction = function(request, response) {

    console.log(JSON.stringify(Parse.User.currentUser()));
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

    switch (user.get('state')) {
        case 0:
          say("Welcome to All My People.");
          user.set('state',1);
        case 1:
          if (!input || input.length != 10) {
            say("Please enter the ten digit phone number for your account.");
            twiml.gather({timeout:20, numDigits:10});
          }
          else if (input.length == 10) {
            user.set('state',2);
            user.set('username',input);
          }
          break;
        case 2:
          if (!input || input.length != 4) {
            say("Please enter the four digit pin number for your account.");
            twiml.gather({timeout:10, numDigits:4});
          }
          else if (input.length == 4) {
            user.set('state',3);
            Parse.User.logIn(user.get('username'),input);
          }
          break;
        case 3:
          say("Welcome, "+user.get('username')+".");
          break;
        default:
          say("An error has occurred.  Please call again.");
          user.set('state',0);
    }

    respond();
};
