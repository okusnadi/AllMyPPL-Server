var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

    Parse.initialize(process.env.APP_ID);
    Parse.serverURL = process.env.SERVER_URL;

router.post('/', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  twiml.redirect('/voice/welcome');
      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/welcome', twilio.webhook({validate: false}), function (request, response) {
    var twiml = new twilio.TwimlResponse();

    twiml.say("Welcome To All My People.", { voice: 'alice'});;

    twiml.redirect('/voice/promptForPhoneNumber');

        response.type('text/xml');
        response.send(twiml.toString());
});

router.post('/promptForPhoneNumber', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Please enter the ten digit phone number associated with your account.", { voice: 'alice'});

  twiml.gather({
    action: "/voice/parsePhoneNumberInput",
    numDigits: 10,
    method: "POST"
  });

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/parsePhoneNumberInput', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;

  var twiml = new twilio.TwimlResponse();

  var UserInfo = Parse.Object.extend("UserInfo");
  var userInfo = new UserInfo();
  userInfo.set("phone",input);
  userInfo.set("parent",Parse.User.current());
  userInfo.save();

  var user = Parse.User.current();
  user.set('username',input);

  if (!input || input.length != 10) {
    twiml.redirect('/voice/promptForPhoneNumber');
  } else if (input.length == 10) {
    twiml.redirect('/voice/promptForPinNumber');
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/promptForPinNumber', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Please enter the four digit pin number associated with your account.", { voice: 'alice'});

  twiml.gather({
    action: "/voice/parsePinNumberInput",
    numDigits: 4,
    method: "POST"
  });

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/parsePinNumberInput', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;

  var twiml = new twilio.TwimlResponse();

  if (!input || input.length != 4) {
    twiml.redirect('/voice/promptForPinNumber');
  } else if (input.length == 4) {
    Parse.User.logIn(Parse.User.current().get('username'),input).then(function(user){console.log(user.toJSON())},function(user, error){console.error(error);});
    twiml.hangup();
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

module.exports = router;
