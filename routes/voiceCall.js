var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

    Parse.initialize(process.env.App_ID);
    Parse.serverURL = process.env.SERVER_URL;

    var user;
    var allMyPPLPhoneNumber = "+16502062610"
    var servicingHours = "48"

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

  twiml.gather({
    action: "/voice/parsePhoneNumberInput",
    numDigits: 10,
    timeout: 10,
    method: "POST"
  }, function (){
    twiml.say("Please enter the ten digit phone number associated with your account followed by the pound sign.", { voice: 'alice'});
  });

  twiml.redirect('/voice/promptForPhoneNumber');

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/parsePhoneNumberInput', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

  user.set('username',input);

  if (input.length == 10) {
    twiml.redirect('/voice/promptForPinNumber');
  } else {
    twiml.redirect('/voice/promptForPhoneNumber');
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/promptForPinNumber', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.gather({
    action: "/voice/parsePinNumberInput",
    numDigits: 4,
    timeout: 10,
    method: "POST"
  }, function() {
      twiml.say("Please enter the four digit pin number associated with your account followed by the pound sign.", { voice: 'alice'});
  });

  twiml.redirect('/voice/promptForPinNumber');

      response.type('text/xml');
      response.send(twiml.toString());
});

router.post('/parsePinNumberInput', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

 if (input.length == 4) {
    Parse.User.logIn(user.get('username'),input).then(function(logInObj){user = logInObj;
       twiml.redirect('/voice/afterLogin'); response.type('text/xml');
    response.send(twiml.toString());},function(user, error){console.error(error); twiml.redirect('/voice/loginError'); response.type('text/xml');
    response.send(twiml.toString());});
  } else {
    twiml.redirect('/voice/promptForPhoneNumber');
    response.type('text/xml');
    response.send(twiml.toString());
  }


});


router.post('/loginError', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  twiml.say("Invalid phone number and pin combination, you'll need to re-enter your credentials.",{voice:'alice'})
  twiml.redirect('/voice/promptForPhoneNumber');
      response.type('text/xml');
      response.send(twiml.toString());
});


router.post('/afterLogin', twilio.webhook({validate:false}), function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.say("Welcome.",{voice: 'alice'});

  twiml.redirect('/voice/menu/0');

      response.type('text/xml');
      response.send(twiml.toString());

      });

router.post('/menu/:numeral', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();

  var numeral = parseInt(request.params.numeral);
  if (numeral >= 10) { twiml.say("End of contacts.  Looping back through.  If you're hearing this message right after starting the list, you haven't set up any contacts to be one of your people in the All my people eye oh ess app.",{voice:'alice'}); twiml.redirect('/voice/menu/0'); response.type('text/xml'); response.send(twiml.toString());}
  else if (numeral <= 0) { twiml.say("Listing contacts.",{voice:'alice'}); twiml.redirect('/voice/menu/1'); response.type('text/xml'); response.send(twiml.toString());}
  else {
    var query = new Parse.Query("Contact");
    query.equalTo("numeral",numeral+"");
    query.first({sessionToken:user.getSessionToken()}).then(function(contact){
        if (!contact) {twiml.redirect('/voice/menu/'+(numeral+1))}
        else {
          twiml.gather({
            action: "/voice/menu/"+numeral+"/afterMenu",
            numDigits: 1,
            timeout: 5,
            method: "POST"
          }, function(){
            twiml.say("Press "+numeral+" to connect to "+ contact.get('name') +", followed by the pound sign.",{voice:'alice'});
          });

          twiml.redirect("/voice/menu/"+(numeral+1));
        }
    }).then(function(){
          response.type('text/xml');
          response.send(twiml.toString());
    }, function(error) {
        twiml.redirect('/goodbye');
            response.type('text/xml');
            response.send(twiml.toString());
    });
  }
});

router.post('/menu/:numeral/afterMenu', twilio.webhook({validate: false}), function(request, response) {
  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  var twiml = new twilio.TwimlResponse();

  var numeral = parseInt(request.params.numeral);

  var query = new Parse.Query("Contact");
  query.equalTo("numeral",input+"");
  query.first({sessionToken:user.getSessionToken()}).then(function(contact){
    if (!contact) {twiml.say("I'm sorry, I couldn't find a contact for that keypad selection.",{voice:'alice'});
      twiml.redirect("/menu/"+(numeral+1))} else {
        twiml.dial(contact.get('phone'), { callerId : allMyPPLPhoneNumber, timeout: 30, action: '/voice/goodbye', method: "POST" });
      }
        response.type('text/xml');
        response.send(twiml.toString());
  }, function(error) {twiml.say("I'm sorry, an error occurred.",{voice:'alice'}); twiml.redirect('/voice/goodbye');
    response.type('text/xml');
    response.send(twiml.toString());})

});

// menu methods for 1.0.1
/*
router.post('/menu', twilio.webhook({validate: false}), function(request, response) {

  twiml.gather({
    action: "/voice/afterMenu",
    numDigits: 1,
    timeout: 10,
    method: "POST"
  },function () {
    twiml.say("To call your emergency contact, press 1 followed by the pound sign.",{voice:'alice'});
   twiml.say("To dial out to a number you provide, press 2 followed by the pound sign.",{voice:'alice'});
});
  twiml.redirect('/voice/menu');
  response.type('text/xml');
      response.send(twiml.toString());

});

router.post('/afterMenu', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var input = request.body.Digits;
  console.log('Digits entered: '+request.body.Digits);
  if (input == "1") {
    twiml.redirect('/voice/callEmergencyContact');
  } else if (input == "2") {
    twiml.redirect('/voice/dialOut');
  } else {
    twiml.redirect('/voice/menu');
  }
  response.type('text/xml');
  response.send(twiml.toString());
});
*/
// EmergencyContact Methods for 1.0.1

router.post('/dialEmergencyContact', twilio.webhook({validate:false}), function(request, response){
  var twiml = new twilio.TwimlResponse();

  var input = request.body.Digits;

  var Contact = Parse.Object.extend("Contact");

  var emergencyContactQuery = new Parse.Query(Contact);
  emergencyContactQuery.equalTo('isEmergencyContact',true);
  emergencyContactQuery.first({sessionToken:user.get('sessionToken')})
  .then(function(emergencyContact){

      var number = emergencyContact.get('phone');

      console.log(JSON.stringify(request.body));
      if (input == "1") {
        twiml.dial(number, { callerId : user.get('username'), timeout: 30, action: '/voice/goodbye', method: "POST" });
      } else {
        twiml.redirect('/voice/menu');
      }

      return Parse.Promise.as(emergencyContact);

  }).then(function(emergencyContact){

      response.type('text/xml');
      response.send(twiml.toString());

    },function(error) {
    console.error(error.code+" : "+error.message);

    twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS, or the iOS App, prior to calling.",{voice: 'alice'});

    twiml.redirect('/voice/menu');

        response.type('text/xml');
        response.send(twiml.toString());
  });
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
      twiml.say("Your emergency contact is named "+emergencyContact.get('name')+", and has a phone number of "+emergencyContact.get('phone')+".",{voice: 'alice'});

      twiml.gather({
       action: "/voice/dialEmergencyContact",
       numDigits: 1,
       timeout: 10,
       method: "POST"
     },function() {
       twiml.say("Stay on the line or skip the wait with a pound sign to return to the main menu, or press 1 followed by the pound sign to be connected to your emergency Contact. Choose now.",{voice: 'alice'});
     });

      twiml.redirect('/voice/menu');

      return Parse.Promise.as(emergencyContact);
    }

  }).then(function(emergencyContact){

      response.type('text/xml');
      response.send(twiml.toString());

    },function(error) {
    console.error(error.code+" : "+error.message);

    twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS, or the iOS App, prior to calling.",{voice: 'alice'});

    twiml.redirect('/voice/menu');

        response.type('text/xml');
        response.send(twiml.toString());
  });
});

router.post('/goodbye', twilio.webhook({validate:false}), function(request, response){
  console.log(JSON.stringify(request.body));

  var twiml = new twilio.TwimlResponse();

  twiml.say("Thank you for using All My People. Goodbye.",{voice:'alice'});

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

//  dialOut methods

router.post('/dialOut', twilio.webhook({validate:false}),function(request, response){

  var twiml = new twilio.TwimlResponse();

  twiml.gather({
   action: "/voice/afterDialOut",
   numDigits: 10,
   timeout: 10,
   method: "POST"
 },function() {
   twiml.say("Please enter the 10 digit phone number you would like to dial, area code first followed by the pound sign.",{voice: 'alice'});
 });

  twiml.redirect('/voice/dialOut');

      response.type('text/xml');
      response.send(twiml.toString());

      });

router.post('/afterDialOut', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var input = request.body.Digits;

  console.log('Digits entered: '+request.body.Digits);

  if (input.length == 10) {
    twiml.say("Calling "+input+". ",{voice: 'alice'});
      twiml.dial(input, { callerId : user.get('username'), timeout: 30, action: '/voice/goodbye', method: "POST" });
  } else {
    twiml.say("Invalid input, you must dial a ten digit phone number, area code first.  Returning to the main menu.",{voice:'alice'});
    twiml.redirect('/voice/menu');
  }

      response.type('text/xml');
      response.send(twiml.toString());
});

module.exports = router;
