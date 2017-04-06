var express = require('express');
var router = express.Router();
var twilio = require('twilio');
var Parse = require('parse/node');

Parse.initialize(process.env.APP_ID);
Parse.serverURL = process.env.SERVER_URL;

var allMyPPLPhoneNumber = "+16502062610";

/*
router.post('/routeName/:routeParameter', twilio.webhook({validate: false}), function(request, response) {
var twiml = new twilio.TwimlResponse();
// some action
response.type('text/xml');
response.send(twiml.toString());
});
*/

router.post('/', twilio.webhook({validate: false}), function(request, response) {
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
    twiml.say("Please enter your ten digit phone number.", { voice: 'alice'});
  });

  twiml.redirect('/voice/promptForPhoneNumber');

  response.type('text/xml');
  response.send(twiml.toString());
});

router.post('/parsePhoneNumberInput', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;

  var twiml = new twilio.TwimlResponse();

  if (input.length == 10) {
    twiml.redirect('/voice/promptForPinNumber/'+input);
  } else {
    twiml.redirect('/voice/promptForPhoneNumber');
  }

  response.type('text/xml');
  response.send(twiml.toString());
});

router.post('/promptForPinNumber/:phoneNumber', twilio.webhook({validate:false}), function(request, response){
  const phoneNumber = request.params.phoneNumber;

  var twiml = new twilio.TwimlResponse();

  twiml.gather({
    action: "/voice/parsePinNumberInput/"+phoneNumber,
    numDigits: 4,
    timeout: 5,
    method: "POST"
  }, function() {
    twiml.say("Please enter your four digit pin number.", { voice: 'alice'});
  });

  twiml.redirect('/voice/promptForPinNumber');

  response.type('text/xml');
  response.send(twiml.toString());
});

router.post('/parsePinNumberInput/:phoneNumber', twilio.webhook({validate:false}), function(request, response){

  var input = request.body.Digits;
  const phoneNumber = request.params.phoneNumber;

  var twiml = new twilio.TwimlResponse();

  if (input.length == 4) {
    Parse.User.logIn(phoneNumber,input).then(function(logInObj){var sessionToken = logInObj.getSessionToken();
      twiml.redirect('/voice/afterLogin/'+logInObj.id+'/'+escape(sessionToken)); response.type('text/xml');
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


  router.post('/afterLogin/:userID/:sessionToken', twilio.webhook({validate:false}), function(request, response){

    const userID = request.params.userID;
    const escapedSessionToken = request.params.sessionToken;

    var twiml = new twilio.TwimlResponse();

    twiml.say("Welcome.",{voice: 'alice'});
    twiml.redirect('/voice/menu/0/'+userID+'/'+escapedSessionToken);

    response.type('text/xml');
    response.send(twiml.toString());

  });


  router.post('/menu/:numeral/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
    var twiml = new twilio.TwimlResponse();
    var numeral = parseInt(request.params.numeral);
    const userID = request.params.userID;
    var user = new Parse.User();
    user.id = userID;
          const escapedSessionToken = request.params.sessionToken;
          var unescapedSessionToken = unescape(escapedSessionToken);
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
                action: "/voice/menu/"+numeral+"/afterMenu/"+userID+"/"+escapedSessionToken,
                numDigits: 1,
                timeout: 2,
                method: "POST"
              }, function(){
                twiml.say("Press 0 to connect to your party.",{voice:'alice'});
              });
            }
            twiml.redirect('/voice/menu/1/'+userID+'/'+escapedSessionToken); response.type('text/xml'); response.send(twiml.toString());
          },function(error) {
            twiml.redirect('/voice/menu/1/'+userID+"/"+escapedSessionToken); response.type('text/xml'); response.send(twiml.toString());
          });
        } else {
          twiml.gather({
            action: "/voice/menu/"+numeral+"/afterMenu/"+userID+'/'+escapedSessionToken,
            numDigits: 1,
            timeout: 2,
            method: "POST"
          }, function(){
            twiml.say("Press 0 to connect to your party.",{voice:'alice'});
          });
          twiml.redirect('/voice/menu/1/'+userID+'/'+escapedSessionToken); response.type('text/xml'); response.send(twiml.toString());
        }
      },function(error) {
        twiml.redirect('/voice/menu/1/'+userID+'/'+escapedSessionToken); response.type('text/xml'); response.send(twiml.toString());
      });
      return;
      case 2:
      twiml.gather({
        action: "/voice/menu/"+numeral+"/afterMenu/"+userID+'/'+escapedSessionToken,
        numDigits: 1,
        timeout: 2,
        method: "POST"
      }, function(){
        twiml.say("Press 2 to search for a contact.",{voice:'alice'});
      });
      break;
      case 1:
      twiml.gather({
        action: "/voice/menu/"+numeral+"/afterMenu/"+userID+'/'+escapedSessionToken,
        numDigits: 1,
        timeout: 2,
        method: "POST"
      }, function(){
        twiml.say("Press 1 to connect to My people.",{voice:'alice'});
      });
      break;
      default:
      twiml.redirect('/voice/menu/0/'+userID+'/'+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return
    }
    twiml.redirect('/voice/menu/'+(numeral+1)+"/"+userID+'/'+escapedSessionToken);
    response.type('text/xml');
    response.send(twiml.toString());

  });

  router.post('/menu/:numeral/afterMenu/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
    var input = request.body.Digits;

    var twiml = new twilio.TwimlResponse();

    var numeral = parseInt(input);


          const escapedSessionToken = request.params.sessionToken;
          var unescapedSessionToken = unescape(escapedSessionToken);
          var user = new Parse.User();
          const userID = request.params.userID;
          user.id = userID;

    if (numeral == 0) {


      var partyQuery = new Parse.Query("Party")
      partyQuery.equalTo("host",user);
      partyQuery.first().then(function(result) {
        if (result != null) {
          twiml.redirect("/voice/listParty/"+result.id+"/0/"+userID+"/"+escapedSessionToken);
          response.type('text/xml'); response.send(twiml.toString());
          return;
        } else {
          var query = new Parse.Query("Party");
          query.equalTo("users", user);
          query.notEqualTo("host",user);
          query.first().then(function(result) {
            if (result != null) {
              twiml.redirect("/voice/listParty/"+result.id+"/0/"+userID+"/"+escapedSessionToken);
              response.type('text/xml'); response.send(twiml.toString());
              return;
            } else {
              twiml.say("I'm sorry, An error occured.", {voice:'alice'});
              twiml.redirect('/voice/menu/0/'+userID+'/'+escapedSessionToken);
              response.type('text/xml'); response.send(twiml.toString());
              return;
            }
          });
        }
      });
    } else if (numeral == 1) {
      twiml.redirect("/voice/MyPPL/0/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    }
   else if (numeral == 2) {twiml.redirect('/voice/search/X/0/'+userID+"/"+escapedSessionToken);response.type('text/xml');response.send(twiml.toString());}
     else {
      twiml.say("Invalid selection.",{voice:'alice'});
      twiml.redirect("/voice/menu/0/"+userID+'/'+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    }

  });

function getRegexFromDigit(digit) {
  if (digit == "2") {
    return "[A-Ca-c2]";
  } else if (digit == "3") {
    return "[D-Fd-f3]";
} else if (digit == "4") {
    return "[G-Ig-i4]";
  } else if (digit == "5") {  return "[J-Lj-l5]";
} else if (digit == "6") {
    return "[M-Om-o6]";
  } else if (digit == "7") {
    return "[P-Sp-s7]";
  }  else if (digit == "8") {
    return "[T-Vt-v8]";
  } else if (digit == "9") {
    return "[W-Zw-z9]";
  } else {
    return "[^A-Za-z2-9_]|[01]"
  }
}

  function getRegexFromDigits(searchString) {
    var regexString = "^";
    if (searchString.length > 0) {
      var i = 0;
      while (i < searchString.length) {
      var digit = searchString[i];
      console.log(digit);
      regexString += getRegexFromDigit(digit);
      i++;
    }
    console.log(regexString);
    var regExp = new RegExp(regexString);
    if (regExp.test('April')) {console.log("matched with April");}
    return regexString;
  } return "";
  }

  router.post('/search/:searchString/:index/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
    var searchString = request.params.searchString;
    var index = parseInt(request.params.index);
    const escapedSessionToken = request.params.sessionToken;
    var unescapedSessionToken = unescape(escapedSessionToken);
    const userID = request.params.userID;

    var twiml =  new twilio.TwimlResponse();
    if (!searchString || searchString == "" || searchString == "X") {
      twiml.gather({
        action:"/voice/search/"+searchString+"/"+index+"/afterMenu/"+userID+"/"+escapedSessionToken,
        numDigits:3,
        timeout:4,
        method: "POST"
      }, function() {
        twiml.say("Enter the first three letters of the contact's name.",{voice:'alice'});
      });

      twiml.redirect("/voice/search/X/0/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    } else {
      if (index == 0) {
        twiml.gather({
          action:"/voice/search/"+searchString+"/"+index+"/afterMenu/"+userID+"/"+escapedSessionToken,
          numDigits: 1,
          timeout: 2,
          method: "POST"
        }, function() {
          twiml.say("Listing search results. Press 0 to return to the main menu.",{voice:'alice'});
        });
      }
        var query = new Parse.Query("Contact");
        query.find({sessionToken:unescapedSessionToken}).then(function(results){
          if (!results || results.length == 0) {
          twiml.say("I'm sorry, no contacts could be found for your search.",{voice:'alice'});
          twiml.redirect("/voice/search/X/0/"+userID+"/"+escapedSessionToken);
          return;
        }
          console.log("before: "+results.length);
          var acceptedResults = [];
          var regexString = getRegexFromDigits(searchString);
          var regexFromDigits = new RegExp(regexString);
          var i=0;
          while (i < results.length) {var result = results[i];
            var name = result.get('nameLowercase');
            if (regexFromDigits.test(name)) {
              acceptedResults.push(result);
            } else {
            }
            i++;}

          console.log("after: "+acceptedResults.length);
          if (acceptedResults.length == 0) {
          twiml.say("I'm sorry, no contacts could be found for your search.",{voice:'alice'});
          twiml.redirect("/voice/search/X/0/"+userID+"/"+escapedSessionToken);
          return;
          }

        if (index < acceptedResults.length) {
          var contact = acceptedResults[index];
          twiml.gather({
            action:"/voice/search/"+searchString+"/"+index+"/afterMenu/"+userID+"/"+escapedSessionToken,
            numDigits: 2,
            timeout: 3,
            method: "POST"
          }, function() {
          twiml.say("Press "+(index+1)+" to connect to "+contact.get('name')+".",{voice:'alice'});
          });
          twiml.redirect('/voice/search/'+searchString+"/"+(index+1)+"/"+userID+"/"+escapedSessionToken);
          return;
        } else {
          twiml.redirect("/voice/search/"+searchString+"/0/"+userID+"/"+escapedSessionToken);
          return;
        }

        }).then(function(){
        response.type('text/xml');
        response.send(twiml.toString());
        return;
      }, function(error){
          print(error);
          twiml.say("I'm sorry, an error occured.",{voice:'alice'});
          twiml.redirect('/voice/search/X/0/'+userID+"/"+escapedSessionToken);
          response.type('text/xml');
          response.send(twiml.toString());
          return;
        });
      }

    });

  router.post('/search/:searchString/:index/afterMenu/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
    var searchString = request.params.searchString;
    var index = parseInt(request.params.index);
    var input = request.body.Digits;

    const userID = request.params.userID;
    const escapedSessionToken = request.params.sessionToken;
    var unescapedSessionToken = unescape(escapedSessionToken);
    console.log("digits entered: "+input);
    var twiml = new twilio.TwimlResponse();

    if (input == "0") {
      twiml.redirect('/voice/menu/0/'+userID+"/"+escapedSessionToken);
    response.type('text/xml');
    response.send(twiml.toString());
    return;
  } else if (searchString == "X" || !searchString || searchString == "") {
    searchString = input;
    var searchURL = '/voice/search/'+searchString+"/0/"+userID+"/"+escapedSessionToken
    console.log(searchURL);
    twiml.redirect(searchURL);
    response.type('text/xml');
    response.send(twiml.toString());
     return;
  } else {
    var numeral = parseInt(input);
    var query = new Parse.Query("Contact");
    query.find({sessionToken:unescapedSessionToken}).then(function(results){
      if (!results || results.length == 0) {
      twiml.redirect("/voice/search/X/0/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    }
    console.log("before: "+results.length);
    var acceptedResults = [];
    var regexString = getRegexFromDigits(searchString);
    var regexFromDigits = new RegExp(regexString);
    var i=0;
    while (i < results.length) {var result = results[i];
      var name = result.get('nameLowercase');
      if (regexFromDigits.test(name)) {
        acceptedResults.push(result);
      } else {
      }
      i++;}

    console.log("after: "+acceptedResults.length);

  if ((numeral-1) < acceptedResults.length) {
      var contact = acceptedResults[numeral-1];
      twiml.redirect("/voice/checkMinutes/"+contact.get('phone')+"/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    } else {
      twiml.say("Invalid selection.",{voice:'alice'});
      twiml.redirect('/voice/search/'+searchString+"/"+(index+1)+"/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
    }
    }, function(error){
      print(error);
      twiml.say("I'm sorry, an error occured.",{voice:'alice'});
      twiml.redirect('/voice/menu/0/'+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
      return;
    });
  }

});

router.post('/MyPPL/:numeral/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();
  var numeral = parseInt(request.params.numeral);

  const userID = request.params.userID;
  const escapedSessionToken = request.params.sessionToken;
  var unescapedSessionToken = unescape(escapedSessionToken);

  if (numeral > 9) { twiml.redirect('/voice/MyPPL/0/'+userID+"/"+escapedSessionToken); response.type('text/xml'); response.send(twiml.toString()); return;}
  else if (numeral == 0) {
    twiml.say("Listing my people.",{voice:'alice'});
    twiml.gather({
      action: "/voice/MyPPL/"+numeral+"/afterMenu/"+userID+"/"+escapedSessionToken,
      numDigits: 1,
      timeout: 2,
      method: "POST"
    }, function () {
      twiml.say("Press 0 to return to the main menu.",{voice:'alice'})
    });
    twiml.redirect('/voice/MyPPL/1/'+userID+"/"+escapedSessionToken);
    response.type('text/xml');
    response.send(twiml.toString());
    return;
  } else {
    var query = new Parse.Query("Contact");
    query.equalTo("numeral",numeral+"");
    query.first({sessionToken:unescapedSessionToken}).then(function(contact){
      if (contact == null || contact == undefined || !contact) {twiml.redirect('/voice/MyPPL/'+(numeral+1)+"/"+userID+"/"+escapedSessionToken)}
      else {
        twiml.gather({
          action: "/voice/MyPPL/"+numeral+"/afterMenu/"+userID+"/"+escapedSessionToken,
          numDigits: 1,
          timeout: 2,
          method: "POST"
        }, function(){
          twiml.say("Press "+numeral+" to connect to "+ contact.get('name') +".",{voice:'alice'});
        });

        twiml.redirect("/voice/MyPPL/"+(numeral+1)+"/"+userID+"/"+escapedSessionToken);
      }
  }).then(function(){
    response.type('text/xml');
    response.send(twiml.toString());
  }, function(error) {
    twiml.redirect('/voice/goodbye');
    response.type('text/xml');
    response.send(twiml.toString());
  });
  }
});

router.post('/MyPPL/:numeral/afterMenu/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
  var input = request.body.Digits;

  var twiml = new twilio.TwimlResponse();

  var numeral = parseInt(request.params.numeral);

  const userID = request.params.userID;
  const escapedSessionToken = request.params.sessionToken;
  var unescapedSessionToken = unescape(escapedSessionToken);


  if (input == "0") {

    twiml.redirect("/voice/menu/0/"+userID+"/"+escapedSessionToken);
    response.type('text/xml');
    response.send(twiml.toString());
    return;
  }


  var query = new Parse.Query("Contact");
  query.equalTo("numeral",input+"");
  query.first({sessionToken:unescapedSessionToken}).then(function(contact){
    if (!contact) {twiml.say("I'm sorry, I couldn't find a contact for that keypad selection.",{voice:'alice'});
    twiml.redirect("/voice/MyPPL/"+(numeral+1)+"/"+userID+"/"+escapedSessionToken)} else {
      twiml.say("Connecting to "+contact.get('name'),{voice:'alice'});
      twiml.redirect("/voice/checkMinutes/"+contact.get('phone')+"/"+userID+"/"+escapedSessionToken);
    }
    response.type('text/xml');
    response.send(twiml.toString());
  }, function(error) {
    console.log(error);
    twiml.say("I'm sorry, an error occurred. ",{voice:'alice'});
    twiml.redirect('/voice/MyPPL/'+(numeral+1)+"/"+userID+"/"+escapedSessionToken);
    response.type('text/xml');
    response.send(twiml.toString());
  });
});
router.post('/listParty/:partyID/:iterator/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse();

  var iterator = parseInt(request.params.iterator);
  var partyID = request.params.partyID;

  const userID = request.params.userID;
  const escapedSessionToken = request.params.sessionToken;
  var unescapedSessionToken = unescape(escapedSessionToken);


  var query = new Parse.Query("Party");
  query.get(partyID,{sessionToken:unescapedSessionToken}).then(function(party) {
    var users = party.get("users");
    var contact = users[iterator];
    if (iterator == 0) { twiml.say("Listing Party participants. Press 0 to return to the main menu.",{voice:'alice'}); }
    if (iterator < users.length) {
      twiml.gather({
        action: "/voice/listParty/"+partyID+"/"+iterator+"/afterMenu/"+userID+"/"+escapedSessionToken,
        numDigits: 2,
        timeout: 3,
        method: "POST"
      }, function(){
        var users = party.get("users");
        var contact = users[iterator];
        contact.fetch().then(function(obj) {twiml.say("Press "+(iterator+1)+" to connect to "+ obj.get('displayName') +".",{voice:'alice'});
          twiml.redirect("/voice/listParty/"+partyID+'/'+(iterator+1)+"/"+userID+"/"+escapedSessionToken);
          response.type('text/xml');
          response.send(twiml.toString());
        }, function(error) {
          console.error(error.message);
          twiml.redirect("/voice/listParty/"+partyID+'/'+(iterator+1)+"/"+userID+"/"+escapedSessionToken);
          response.type('text/xml');
          response.send(twiml.toString());
        });
      });
    } else {
    twiml.gather({
      action: "/voice/listParty/"+partyID+"/"+iterator+"/afterMenu/"+userID+"/"+escapedSessionToken,
      numDigits: 1,
      timeout: 2,
      method: "POST"
    }, function(){});
    twiml.redirect("/voice/listParty/"+partyID+"/0/"+userID+"/"+escapedSessionToken)
    response.type('text/xml');
    response.send(twiml.toString());
  }
},function(error) {
  twiml.say("I'm sorry, an error occurred.",{voice:'alice'});
  twiml.redirect('/voice/menu/0/'+userID+"/"+escapedSessionToken);
  response.type('text/xml');
  response.send(twiml.toString());
});
});

router.post('/listParty/:partyID/:iterator/afterMenu/:userID/:sessionToken', twilio.webhook({validate: false}), function(request, response) {
  var twiml = new twilio.TwimlResponse()
  var input = request.body.Digits;

  const partyID = request.params.partyID;
  const iterator = request.params.iterator;

  const userID = request.params.userID;
    const escapedSessionToken = request.params.sessionToken;
    var unescapedSessionToken = unescape(escapedSessionToken);

  if (input == "0") {twiml.redirect('/voice/menu/0/'+userID+"/"+escapedSessionToken);
  response.type('text/xml');
  response.send(twiml.toString());
  return;}
  var query = new Parse.Query("Party");
  query.get(partyID,{sessionToken:unescapedSessionToken}).then(function(party){
    if (!party) {twiml.say("I'm sorry, we couldn't connect to your party, please try again later.",{voice:'alice'});
    twiml.redirect("/voice/goodbye");
    response.type('text/xml');
    response.send(twiml.toString());
  } else {
    var users = party.get("users");
    if ((parseInt(input)-1) < users.length) {
    var partyUser = users[parseInt(input)-1];
    partyUser.fetch().then(function(obj){
      twiml.say("Connecting to "+obj.get("displayName") + ".",{voice:'alice'});
      console.error(obj.username + " " + obj.get("username"));
      twiml.redirect("/voice/checkMinutes/"+obj.get("username")+"/"+userID+"/"+escapedSessionToken);
      response.type('text/xml');
      response.send(twiml.toString());
    }, function(error) {twiml.say("I'm sorry, we couldn't connect to your party, please try again later.",{voice:'alice'});
    twiml.redirect("/voice/goodbye");
    response.type('text/xml');
    response.send(twiml.toString());
  });
} else {
  twiml.say("invalid selection.", {voice:'alice'});
  twiml.redirect("/voice/listParty/"+partyID+"/"+(iterator+1)+"/"+userID+"/"+escapedSessionToken);
  response.type('text/xml');
  response.send(twiml.toString());
}
}
}, function(error) {
  console.log(error);
  twiml.say("I'm sorry, an error occurred. ",{voice:'alice'}); twiml.redirect('/voice/menu/0/'+userID+"/"+escapedSessionToken);
  response.type('text/xml');
  response.send(twiml.toString());
});

});

router.post('/checkMinutes/:outgoingNumber/:userID/:sessionToken', twilio.webhook({validate:false}), function (request,response) {
  var twiml = new twilio.TwimlResponse();

  console.log(request.body);

    const outgoingNumber = request.params.outgoingNumber;
    const userID = request.params.userID;
      const escapedSessionToken = request.params.sessionToken;
      var unescapedSessionToken = unescape(escapedSessionToken);

      var user = new Parse.User();
      user.id = userID;

      var query = new Parse.Query("Timeout");
      query.equalTo("user",user);
      query.first({sessionToken:unescapedSessionToken}).then(function(result) {

        if (!result) {
          var Timeout = Parse.Object.extend("Timeout");
          var timeout = new Timeout();
          timeout.set("user",user);
          timeout.set("secondsLeft",6000);
          if (timeout.get('secondsLeft') < 0) {timeout.set('secondsLeft',0);}
          return timeout.save();
        }

        return result.save();
      }).then(function(timeout) {
        const secondsLeft = timeout.get("secondsLeft");
        if (secondsLeft > 0) {
          twiml.dial(outgoingNumber, { callerId : allMyPPLPhoneNumber, timeout: 30, timeLimit: secondsLeft, action: '/voice/deductSeconds/'+userID+"/"+escapedSessionToken, method:"POST"})
        } else {
          twiml.say("I'm sorry, but you do not have enough minutes to make an outbound call; you can add more time to your account in the All My People eye oh ess app.",{voice:'alice'});
          twiml.redirect("/voice/goodbye");
        }
        return;
      }).then(function() {
                    respose.type('text/xml');
                    response.send(twiml.toString());
                  }).error(function(error){
                    twiml.say("I'm sorry, an error has occured.",{voice:'alice'});
                    twiml.redirect("/voice/goodbye");
                    response.type('text/xml');
                    response.send(twiml.toString());
                  });
});


router.post('/deductSeconds/:userID/:sessionToken', twilio.webhook({validate:false}), function (request,response) {

    var twiml = new twilio.TwimlResponse();

    console.log(request.body);

      const userID = request.params.userID;
        const escapedSessionToken = request.params.sessionToken;
        var unescapedSessionToken = unescape(escapedSessionToken);

        const callDuration = parseInt(request.params.DialCallDuration);

        var user = new Parse.User();
        user.id = userID;

        var query = new Parse.Query("Timeout");
        query.equalTo("user",user);
        query.first({sessionToken:unescapedSessionToken}).then(function(result) {

          if (!result) {
            var Timeout = Parse.Object.extend("Timeout");
            var timeout = new Timeout();
            timeout.set("user",user);
            timeout.set("secondsLeft",(6000-callDuration));
            if (timeout.get('secondsLeft') < 0) {timeout.set('secondsLeft',0);}
            return timeout.save();
          }

          result.set("secondsLeft",(result.get('secondsLeft')-callDuration));
          if (result.get('secondsLeft') < 0) {result.set('secondsLeft',0);}
          return result.save();
        }).then(function(timeout) {
          twiml.say("You have "+ parseInt(timeout.get('secondsLeft') / 60 ) + " minutes left on your account.");
          twiml.redirect("/voice/goodbye");
          return;
        }).then(function() {
                      respose.type('text/xml');
                      response.send(twiml.toString());
                    }).error(function(error){
                      twiml.redirect("/voice/goodbye");
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

});

module.exports = router;
