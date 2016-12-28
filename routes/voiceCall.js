var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

    Parse.initialize(process.env.APP_ID);
    Parse.serverURL = process.env.SERVER_URL;

    var user;

router.post('/', twilio.webhook({validate: false}), function(request, response) {
  user = new Parse.User();
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

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

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
  
  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

  if (!input || input.length != 4) {
    twiml.redirect('/voice/promptForPhoneNumber');
    response.type('text/xml');
    response.send(twiml.toString());
  } else if (input.length == 4) {
    Parse.User.logIn(user.get('username'),input).then(function(logInObj){user = logInObj;
       twiml.redirect('/voice/afterLogin'); response.type('text/xml');
    response.send(twiml.toString());},function(user, error){console.error(error); twiml.redirect('/voice/loginError'); response.type('text/xml');
    response.send(twiml.toString());});
  }


});

router.post('/loginError', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  twiml.say("That username and password combination didn't work, you'll need to re-enter your credentials.",{voice:'alice'})
  twiml.redirect('/voice/promptForPhoneNumber');
      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/afterLogin', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Welcome, "+user.get('username')+".",{voice: 'alice'});

  var Contact = Parse.Object.extend("Contact");

  var emergencyContactQuery = new Parse.Query(Contact);
  emergencyContactQuery.equalTo('isEmergencyContact',true);
  emergencyContactQuery.first({sessionToken:user.get('sessionToken')})
  .then(function(emergencyContact){

    if (!emergencyContact) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,"Couldn't load emergency contact."))
    } else {
      twiml.say("Dialing your emergency contact named "+emergencyContact.get('name')+", the phone number is "+emergencyContact.get('phone')+", once again, the phone number is "+emergencyContact.get('phone')+".  Connecting you now.",{voice: 'alice'});

      var number = emergencyContact.get('phone');

      console.log(JSON.stringify(request.body));

      twiml.dial(number, { callerId : user.get('username'), timeout: 30, action: '/voice/goodbye', method: "POST" });

      return Parse.Promise.as(emergencyContact);
    }

  }).then(function(emergencyContact){

      response.type('text/xml');
      response.send(twiml.toString());

    },function(error) {
    console.error(error.code+" : "+error.message);

    twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People prior to calling.",{voice: 'alice'});

    twiml.redirect('/voice/goodbye');

        response.type('text/xml');
        response.send(twiml.toString());
  });
});

router.post('/goodbye', twilio.webhook({validate:false}), function(request, response){
  console.log(JSON.stringify(request.body));

  var twiml = new twilio.TwimlResponse();

  twiml.say("Thank you for using all my people. Goodbye.",{voice:'alice'});

  twiml.redirect('/voice/hangup');

  response.type('text/xml');
  response.send(twiml.toString());

});

router.post('/hangup', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.hangup();

  response.type('text/xml');
  response.send(twiml.toString());

  user = undefined;

});

module.exports = router;
