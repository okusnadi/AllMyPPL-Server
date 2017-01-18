var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

    Parse.initialize(process.env.App_ID);
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

    twiml.say("Welcome To All My People Emergency Caller.", { voice: 'alice'});;

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
  twiml.say("Invalid phone number and pin combination, you'll need to re-enter your credentials.",{voice:'alice'})
  twiml.redirect('/voice/promptForPhoneNumber');
      response.type('text/xml');
      response.send(twiml.toString());
});


router.post('/menu', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  twiml.say("To call your emergency contact, press 1.  To dial out with your own number as your caller id, press 2.",{voice:'alice'})

   twiml.gather({
    action: "/voice/afterMenu",
    numDigits: 4,
    method: "POST"
  });

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/afterMenu', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

  if (!input || input.length != 1) {
    twiml.redirect('/voice/menu');

  } else if (input == "1") {
    twiml.redirect('/voice/callEmergencyContact');
  } else if (input == "2") {
    twiml.redirect('/voice/dialOut');
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/afterLogin', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Welcome, "+user.get('username')+".",{voice: 'alice'});

twiml.redirect('/voice/menu');


      response.type('text/xml');
      response.send(twiml.toString());

      });

      router.post('/dialOut', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Please enter the 10 digit phone number you would like to dial, area code first. ",{voice: 'alice'});

  twiml.gather({
   action: "/voice/afterDialOut",
   numDigits: 10,
   method: "POST"
  });


      response.type('text/xml');
      response.send(twiml.toString());

      });

      router.post('/afterDialOut', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

  if (!input || input.length != 10) {
    twiml.redirect('/voice/menu');

  } else {
  twiml.say("Calling "+input+". ",{voice: 'alice'});
  twiml.dial(input, { callerId : user.get('username'), timeout: 30, action: '/voice/goodbye', method: "POST" });
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/callEmergencyContact', twilio.webhook({validate:false}), function(request, response){
  var twiml = new twilio.TwimlResponse();

  var Contact = Parse.Object.extend("Contact");

  var emergencyContactQuery = new Parse.Query(Contact);
  emergencyContactQuery.equalTo('isEmergencyContact',true);
  emergencyContactQuery.first({sessionToken:user.get('sessionToken')})
  .then(function(emergencyContact){

    if (!emergencyContact) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,"Couldn't load emergency contact."))
    } else {
        twiml.say("Dialing your emergency contact named "+emergencyContact.get('name')+", the phone number is "+emergencyContact.get('phone')+", once again, the phone number is "+emergencyContact.get('phone')+".  If you would like to make this call press 1 to be connected, otherwise press any key to return to the main menu.",{voice: 'alice'});

      var number = emergencyContact.get('phone');

      console.log(JSON.stringify(request.body));


        twiml.gather({
         action: "/voice/afterCallEmergencyContact",
         numDigits: 1,
         method: "POST"
        });

      return Parse.Promise.as(emergencyContact);
    }

  }).then(function(emergencyContact){

      response.type('text/xml');
      response.send(twiml.toString());

    },function(error) {
    console.error(error.code+" : "+error.message);

    twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS, or the iOS App, prior to calling.",{voice: 'alice'});

    twiml.redirect('/voice/goodbye');

        response.type('text/xml');
        response.send(twiml.toString());
  });
});

router.post('/afterCallEmergencyContact', twilio.webhook({validate:false}), function(request, response){

  var Contact = Parse.Object.extend("Contact");

  var emergencyContactQuery = new Parse.Query(Contact);
  emergencyContactQuery.equalTo('isEmergencyContact',true);
  emergencyContactQuery.first({sessionToken:user.get('sessionToken')})
  .then(function(emergencyContact){

    if (!emergencyContact) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,"Couldn't load emergency contact."))
    } else {
      var number = emergencyContact.get('phone');

      console.log(JSON.stringify(request.body));

      var input = request.body.Digits;

      if (input == "1") {
        twiml.dial(number, { callerId : user.get('username'), timeout: 30, action: '/voice/goodbye', method: "POST" });
      } else {
          twiml.redirect('/voice/menu');
      }

      return Parse.Promise.as(emergencyContact);
    }

  }).then(function(emergencyContact){

      response.type('text/xml');
      response.send(twiml.toString());

    },function(error) {
    console.error(error.code+" : "+error.message);

    twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS, or the iOS App, prior to calling.",{voice: 'alice'});

    twiml.redirect('/voice/goodbye');

        response.type('text/xml');
        response.send(twiml.toString());
  });
});

router.post('/goodbye', twilio.webhook({validate:false}), function(request, response){
  console.log(JSON.stringify(request.body));

  var twiml = new twilio.TwimlResponse();

  twiml.say("Thank you for using all my people emergency caller. Goodbye.",{voice:'alice'});

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
