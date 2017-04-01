var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

Parse.initialize(process.env.APP_ID);
Parse.serverURL = process.env.SERVER_URL;

var user;
var allMyPPLPhoneNumber = "+16502062610"
var servicingHours = "48"

/*
router.post('/routeName/:routeParameter', twilio.webhook({validate: false}), function(request, response) {
var twiml = new twilio.TwimlResponse();
// some action
response.type('text/xml');
response.send(twiml.toString());
});
*/

router.post('/', twilio.webhook({validate: false}), function(request, response) {
  user = new Parse.User();
  var twiml = new twilio.TwimlResponse();
  twiml.redirect('/voice/welcome');
  response.type('text/xml');
  response.send(twiml.toString());
});

router.post('/welcome', twilio.webhook({validate: false}), function (request, response) {
  var twiml = new twilio.TwimlResponse();


  twiml.say("Welcome To CAll My People.", { voice: 'alice'});;


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
    timeout: 5,
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
    var numeral = parseInt(request.params.numeral)
    switch (numeral) {
      case 0:
      twiml.say("Main Menu.",{voice:'alice'});

      var partyQuery = new Parse.Query("Party")
      partyQuery.equalTo("host",user);
      partyQuery.first().then(function(result) {
        if (!result) {
          var query = new Parse.Query("Party");
          query.equalTo("users", user);
          query.notEqualTo("host",user);
          query.first().then(function(result) {
            if (!result) {} else {
              twiml.gather({
                action: "/voice/menu/"+numeral+"/afterMenu",
                numDigits: 1,
                timeout: 2,
                method: "POST"
              }, function(){
                twiml.say("Press 0 to connect to your party.",{voice:'alice'});
              });
            }
            twiml.redirect('/voice/menu/1'); response.type('text/xml'); response.send(twiml.toString());
          },function(error) {
            twiml.redirect('/voice/menu/1'); response.type('text/xml'); response.send(twiml.toString());
          });
        } else {
          twiml.gather({
            action: "/voice/menu/"+numeral+"/afterMenu",
            numDigits: 1,
            timeout: 2,
            method: "POST"
          }, function(){
            twiml.say("Press 0 to connect to your party.",{voice:'alice'});
          });
          twiml.redirect('/voice/menu/1'); response.type('text/xml'); response.send(twiml.toString());
        }
      },function(error) {
        twiml.redirect('/voice/menu/1'); response.type('text/xml'); response.send(twiml.toString());
      });
      return;
      case 1:
      twiml.gather({
        action: "/voice/menu/"+numeral+"/afterMenu",
        numDigits: 1,
        timeout: 2,
        method: "POST"
      }, function(){
        twiml.say("Press 1 to search for a contact.",{voice:'alice'});
      });
      break;
      case 2:
      twiml.gather({
        action: "/voice/menu/"+numeral+"/afterMenu",
        numDigits: 1,
        timeout: 2,
        method: "POST"
      }, function(){
        twiml.say("Press 2 to connect to My people.",{voice:'alice'});
      });
      break;
      default:
      twiml.redirect('/voice/menu/0');
      response.type('text/xml');
      response.send(twiml.toString());
      return
    }
    twiml.redirect('/voice/menu/'+(numeral+1));
    response.type('text/xml');
    response.send(twiml.toString());
  });

  router.post('/menu/:numeral/afterMenu', twilio.webhook({validate: false}), function(request, response) {
    var input = request.body.Digits;

    var twiml = new twilio.TwimlResponse();

    var numeral = parseInt(input);

    if (numeral == 0) {

      var partyQuery = new Parse.Query("Party")
      partyQuery.equalTo("host",user);
      partyQuery.first().then(function(result) {
        if (result != null) {
          twiml.redirect("/voice/listParty/"+result.id+"/0");
          response.type('text/xml'); response.send(twiml.toString());
          return;
        } else {
          var query = new Parse.Query("Party");
          query.equalTo("users", user);
          query.notEqualTo("host",user);
          query.first().then(function(result) {
            if (result != null) {
              twiml.redirect("/voice/listParty/"+result.id+"/0");
              response.type('text/xml'); response.send(twiml.toString());
              return;
            } else {
              twiml.say("I'm sorry, An error occured.", {voice:'alice'});
              twiml.redirect('/voice/menu/0');
              response.type('text/xml'); response.send(twiml.toString());
              return;
            }
          });
        }
      });
    } else if (numeral == 1) {
      twiml.redirect("/voice/search/X/0");
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    } else {
      twiml.redirect("/voice/MyPPL/0");
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    }

  });

  function regexFromDigits(searchString) {
    var regexString = "";
    for (var i = 0; i++; i < searchString.length) {
      var digit = parseInt(regexString[i]);
      switch (digit) {
        case 2:
        regexString += "[A-Ca-c2]";
        break;
        case 3:
        regexString += "[D-Fd-f3]";
        break;
        case 4:
        regexString += "[G-Ig-i4]";
        break;
        case 5:
        regexString += "[J-Lj-l5]";
        break;
        case 6:
        regexString += "[M-Om-o6]";
        break;
        case 7:
        regexString += "[P-Sp-s7]";
        break;
        case 8:
        regexString += "[T-Vt-v8]";
        break;
        case 9:
        regexString += "[W-Zw-z9]";
        break;
        default:
        regexString += "[^A-Za-z2-9_]|[01]"
      }
    }
    return new RegExp(regexString);
  }

  router.post('/search/:searchString/:index', twilio.webhook({validate: false}), function(request, response) {
    var searchString = request.params.searchString;
    var index = parseInt(request.params.index);

    var twiml =  new twilio.TwimlResponse();
    if (!searchString || searchString == "" || searchString == "X") {
      twiml.gather({
        action:"/voice/search/"+searchString+"/"+index+"/afterMenu",
        numDigits:5,
        timeout:6,
        method: "POST"
      }, function() {
        twiml.say("Enter the first five or less letters of the contact's name you wish to search for followed by the pound sign.",{voice:'alice'});
        response.type('text/xml');
        response.send(twiml.toString());
        return;
      });

      twiml.redirect("/voice/search/"+searchString+"/"+index);
    } else {
      if (index == 0) {
        twiml.say("Press 0 followed by the pound sign at any silent time to go back to the main menu.",{voice:'alice'});
      }
      twiml.gather({
        action:"/voice/search/"+searchString+"/"+index+"/afterMenu",
        numDigits: 2,
        timeout: 3,
        method: "POST"
      }, function() {
        var query = new Parse.Query("Contact");
        var regexFromDigits = regexFromDigits(searchString);
        query.find({sessionToken:user.getSessionToken()}).then(function(results){
          results = Parse._.filter(results,function(result){return regexFromDigits.test(result.get('name'));})
          var contact = results[index];
          twiml.say("Press "+(index+1)+" to connect to "+contact.get('name')+".",{voice:'alice'});
          response.type('text/xml');
          response.send(twiml.toString());
          return;
        }, function(error){
          print(error);
          twiml.say("I'm sorry, an error occured.",{voice:'alice'});
          twiml.redirect('/voice/menu/0');
          response.type('text/xml');
          response.send(twiml.toString());
          return;
        });
      });

      twiml.redirect('/voice/search/'+searchString+"/"+(index+1));
    }
    response.type('text/xml');
    response.send(twiml.toString());
  });

  router.post('/search/:searchString/:index/afterMenu', twilio.webhook({validate: false}), function(request, response) {
    var searchString = request.params.searchString;
    var index = parseInt(request.params.index);
    var input = request.body.Digits;

    var twiml = new twilio.TwimlResponse();

    if (input == "0") {
      twiml.redirect('/voice/menu/0');
    response.type('text/xml');
    response.send(twiml.toString());
  } else if (!searchString || searchString == "") {
    searchString = input;
    twiml.redirect('/voice/search/'+searchString+"/0");
    response.type('text/xml');
    response.send(twiml.toString());
  } else {
    var numeral = parseInt(input)
    var query = new Parse.Query("Contact");
    var regexFromDigits = regexFromDigits(searchString);
    query.find({sessionToken:user.getSessionToken()}).then(function(results){
      results = Parse._.filter(results,function(result){return regexFromDigits.test(result.get('name'));})
      var contact = results[numeral-1];
      twiml.dial(contact.get('phone'), { callerId : allMyPPLPhoneNumber, timeout: 30, action: '/voice/goodbye', method: "POST" });
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    }, function(error){
      print(error);
      twiml.say("I'm sorry, an error occured.",{voice:'alice'});
      twiml.redirect('/voice/menu/0');
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    });
  }
});

router.post('/MyPPL/:numeral', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var numeral = parseInt(request.params.numeral);
  if (numeral > 9) { twiml.redirect('/voice/MyPPL/0'); response.type('text/xml'); response.send(twiml.toString()); return;}
  else if (numeral == 0) {
    twiml.say("Listing my people.",{voice:'alice'});
    twiml.gather({
      action: "/voice/MyPPL/"+numeral+"/afterMenu",
      numDigits: 1,
      timeout: 2,
      method: "POST"
    }, function () {
      twiml.say("Press 0 to return to the main menu.",{voice:'alice'})
    });
    twiml.redirect('/voice/MyPPL/1');
    response.type('text/xml');
    response.send(twiml.toString());
    return;
  }
  var query = new Parse.Query("Contact");
  query.equalTo("numeral",numeral+"");
  query.first({sessionToken:user.getSessionToken()}).then(function(contact){
    if (contact == null || contact == undefined || !contact) {twiml.redirect('/voice/menu/'+(numeral+1))}
    else {
      twiml.gather({
        action: "/voice/MyPPL/"+numeral+"/afterMenu",
        numDigits: 1,
        timeout: 2,
        method: "POST"
      }, function(){
        twiml.say("Press "+numeral+" to connect to "+ contact.get('name') +".",{voice:'alice'});
      });

      twiml.redirect("/voice/MyPPL/"+(numeral+1));
    }
  }).then(function(){
    response.type('text/xml');
    response.send(twiml.toString());
  }, function(error) {
    twiml.redirect('/voice/goodbye');
    response.type('text/xml');
    response.send(twiml.toString());
  });
});

router.post('/MyPPL/:numeral/afterMenu', twilio.webhook({validate: false}), function(request, response) {
  var input = request.body.Digits;

  var twiml = new twilio.TwimlResponse();

  var numeral = parseInt(request.params.numeral);



  if (input == "0") {

    twiml.redirect("/voice/menu/0");
    response.type('text/xml');
    response.send(twiml.toString());
    return;
  }


  var query = new Parse.Query("Contact");
  query.equalTo("numeral",input+"");
  query.first({sessionToken:user.getSessionToken()}).then(function(contact){
    if (!contact) {twiml.say("I'm sorry, I couldn't find a contact for that keypad selection.",{voice:'alice'});
    twiml.redirect("/MyPPL/"+(numeral+1))} else {
      twiml.say("Connecting to "+contact.get('name'),{voice:'alice'});
      twiml.dial(contact.get('phone'), { callerId : allMyPPLPhoneNumber, timeout: 30, action: '/voice/goodbye', method: "POST" });
    }
    response.type('text/xml');
    response.send(twiml.toString());
  }, function(error) {
    console.log(error);
    twiml.say("I'm sorry, an error occurred. ",{voice:'alice'}); twiml.redirect('/voice/menu/0');
    response.type('text/xml');
    response.send(twiml.toString());
  });

});
router.post('/listParty/:partyID/:iterator', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();

  var iterator = parseInt(request.params.iterator);
  var partyID = request.params.partyID;

  var query = new Parse.Query("Party");
  query.get(partyID,{sessionToken:user.getSessionToken()}).then(function(party) {
    var users = party.get("users");
    var contact = users[iterator];
    if (iterator == 0) { twiml.say("Listing Party participants. Press 0 to return to the main menu.",{voice:'alice'}); }
    if (iterator < users.length) {
      twiml.gather({
        action: "/voice/listParty/"+partyID+"/"+iterator+"/afterMenu",
        numDigits: 2,
        timeout: 3,
        method: "POST"
      }, function(){
        var users = party.get("users");
        var contact = users[iterator];
        contact.fetch().then(function(obj) {twiml.say("Press "+(iterator+1)+" to connect to "+ obj.get('displayName') +".",{voice:'alice'});
          twiml.redirect("/voice/listParty/"+partyID+'/'+(iterator+1));
          response.type('text/xml');
          response.send(twiml.toString());
        }, function(error) {
          console.error(error.message);
          twiml.redirect("/voice/listParty/"+partyID+'/'+(iterator+1));
          response.type('text/xml');
          response.send(twiml.toString());
        });
      });
    } else {
    twiml.gather({
      action: "/voice/listParty/"+partyID+"/"+iterator+"/afterMenu",
      numDigits: 1,
      timeout: 2,
      method: "POST"
    }, function(){});
    twiml.redirect("/voice/listParty/"+partyID+"/0")
    response.type('text/xml');
    response.send(twiml.toString());
  }
},function(error) {
  twiml.say("I'm sorry, an error occurred.",{voice:'alice'});
  twiml.redirect('/voice/menu/0');
  response.type('text/xml');
  response.send(twiml.toString());
});
});

router.post('/listParty/:partyID/:iterator/afterMenu', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse()
  var input = request.body.Digits;

  const partyID = request.params.partyID;
  const iterator = request.params.iterator;
  if (input == "0") {twiml.redirect('/voice/menu/0');
  response.type('text/xml');
  response.send(twiml.toString());
  return;}
  var query = new Parse.Query("Party");
  query.get(partyID,{sessionToken:user.getSessionToken()}).then(function(party){
    if (!party) {twiml.say("I'm sorry, we couldn't connect to your party, please try again later.",{voice:'alice'});
    twiml.redirect("/voice/goodbye");
    response.type('text/xml');
    response.send(twiml.toString());
  } else {
    var users = party.get("users");
    var contact = users[parseInt(input)-1];
    contact.fetch().then(function(obj){
      twiml.say("Connecting to "+obj.get("displayName") + ".",{voice:'alice'});
      console.error(obj.username + " " + obj.get("username"));
      twiml.dial(obj.get('username'), { callerId : allMyPPLPhoneNumber, timeout: 30, action: '/voice/goodbye', method: "POST" });
      response.type('text/xml');
      response.send(twiml.toString());
    }, function(error) {twiml.say("I'm sorry, we couldn't connect to your party, please try again later.",{voice:'alice'});
    twiml.redirect("/voice/goodbye");
    twiml.say("Connecting to "+contact.get("displayName"),{voice:'alice'});
    twiml.dial(contact.username, { callerId : allMyPPLPhoneNumber, timeout: 30, action: '/voice/goodbye', method: "POST" });
    response.type('text/xml');
    response.send(twiml.toString());
  });
}
}, function(error) {
  console.log(error);
  twiml.say("I'm sorry, an error occurred. ",{voice:'alice'}); twiml.redirect('/voice/menu/0');
  response.type('text/xml');
  response.send(twiml.toString());
});
});

router.post('/goodbye', twilio.webhook({validate:false}), function(request, response){
  console.log(JSON.stringify(request.body));

  var twiml = new twilio.TwimlResponse();

  twiml.say("Thank you for using CAll My People, a free service from All My PeoPLe. Goodbye.",{voice:'alice'});

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
/*
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

twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS or eye oh es App, prior to calling.",{voice: 'alice'});

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

twiml.say("I could not find an emergency contact for you, please make sure you've set up your emergency contact with All My People SMS or the eye oh ess app, prior to calling.",{voice: 'alice'});

twiml.redirect('/voice/menu');

response.type('text/xml');
response.send(twiml.toString());
});
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
*/
module.exports = router;
