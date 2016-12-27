var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

    Parse.initialize(process.env.APP_ID);
    Parse.serverURL = process.env.SERVER_URL;

    var user = new Parse.User();

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

  /*var UserInfo = Parse.Object.extend("UserInfo");
  var userInfo = new UserInfo();
  userInfo.set("phone",input);
  userInfo.set("parent",user);
  userInfo.save();*/

  user.set('username',input);

  console.log(user.get('username'));

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
    response.type('text/xml');
    response.send(twiml.toString());
  } else if (input.length == 4) {
    console.log(user.get('username'));
    Parse.User.logIn(user.get('username'),input).then(function(logInObj){console.log(logInObj.toJSON()); user = logInObj; twiml.redirect('/voice/afterLogin'); response.type('text/xml');
    response.send(twiml.toString());},function(user, error){console.error(error); twiml.redirect('/voice/promptForPinNumber'); response.type('text/xml');
    response.send(twiml.toString());});
  }


});

router.post('/afterLogin', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Welcome, "+user.get(username),{voice: 'alice'});

  twiml.redirect('/voice/hangup');

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/hangup', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Goodbye",{voice:'alice'});

  twiml.hangup();

      response.type('text/xml');
      response.send(twiml.toString());
});

module.exports = router;
