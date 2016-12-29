// Example express application adding the parse-server module to expose Parse
// compatible API routes.

const resolve = require('path').resolve;

var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var Parse = require('parse/node');
var path = require('path');
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID || "twilioAccountSid", process.env.TWILIO_AUTH_TOKEN || "twilioAuthToken");
var http = require('http');
var querystring = require('querystring');
var bodyParser = require('body-parser');
var voice = require('./routes/voiceCall');

var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;

if (!databaseUri) {
  console.log('DATABASE_URI not specified, falling back to localhost.');
}

var api = new ParseServer({
  databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
  cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
  appId: process.env.APP_ID || 'appId',
  masterKey: process.env.MASTER_KEY || 'masterKey', //Add your master key here. Keep it secret!
  serverURL: process.env.SERVER_URL || 'https://localhost:1337/parse',  // Don't forget to change to https if needed
  liveQuery: {
    classNames: ["Contact"] // List of classes to support for query subscriptions
  },
  publicServerURL: process.env.SERVER_URL || 'https://localhost:1337/parse',
  appName: process.env.APP_NAME || 'appName',
  verifyUserEmails:true,
  emailAdapter: {
    module: 'parse-server-mailgun',
    options: {
      // The address that your emails come from
      fromAddress: process.env.MAILGUN_FROM_ADDRESS || "user@domain.tld",
      // Your domain from mailgun.com
      domain: process.env.MAILGUN_DOMAIN || "domain.tld",
      // Your API key from mailgun.com
      apiKey: process.env.MAILGUN_API_KEY || 'key-',
      // The template section
      templates: {
        passwordResetEmail: {
          subject: 'Reset your password',
          pathPlainText: resolve(__dirname, 'public/email-templates/password_reset_email.txt'),
          pathHtml: resolve(__dirname, 'public/email-templates/password_reset_email.html')
        },
        verificationEmail: {
          subject: 'Confirm your account',
          pathPlainText: resolve(__dirname, 'public/email-templates/verification_email.txt'),
          pathHtml: resolve(__dirname, 'public/email-templates/verification_email.html')
        },
        customEmailAlert: {
          subject: 'Urgent notification!',
          pathPlainText: resolve(__dirname, 'public/email-templates/custom_alert.txt'),
          pathHtml: resolve(__dirname, 'public/email-templates/custom_alert.html'),
        }
      }
    }
  }
});

// initialize Parse
Parse.initialize(process.env.APP_ID || "appId");
Parse.serverURL = process.env.SERVER_URL || "https://localhost:1337/parse";
Parse.masterKey = process.env.MASTER_KEY || "masterKey";

// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

app.use(bodyParser.urlencoded({extended:true}));

// Twilio Webhook routes
app.use('/voice', voice);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('<html style="display:table;width:100%;height:100%;text-align:center;"><head><title>AllMyPPL. Your Contacts. Everywhere.</title></head><body style=" display:table-cell; vertical-align: middle; width:auto; height:100%; margin: auto; padding:auto; background: url(./public/assets/images/AppIcon.png) bottom left no-repeat; background-size:50% 100%;"><div style="width: 200px;height: 250px;text-align: top;padding: 1em;margin: auto;margin-right: 5%; border-width:5px; border-style:solid; border-radius: 300px;background: rgba(0, 0, 0, 0.15) border-box;"><p><a href="mailto:support@allmyppl.com?subject=I%20have%20some%20questions,%20comments,%20concerns%20or%20feedback%20about%20AllMyPPL&amp;body=I%20have%20a%20question%20or%20am%20confused%20about...%0A%0A%0A%0AI%20take%20issue%20with...%0A%0A%0A%0AHave%20you%20thought%20about...%0A%0A%0A%0AI%20really%20like....%0A%0A">Contact<br>AllMyPPL Support<br>By Email</a></p><p style="">For contact retrieval and management through text messaging, send a friendly greeting to our automated attendant at the number below.</p><p><a id="allMyPPLPhoneNumber" href="">+1 (650) 206-2610</a></p></div><script type="text/javascript">if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {document.getElementById("allMyPPLPhoneNumber").href = "sms:+16502062610";} else {document.getElementById("allMyPPLPhoneNumber").href=""}</script></body></html>');
});

app.post('/smsReceived', function(req, res) {

  res.status(200).send();
  console.log(JSON.stringify(req.body));

  var allMyPPLPhoneNumber = '+16502062610';
  var wordList = req.body.Body.split(" ");

  Parse.Promise.as().then(function(){
    if (wordList.length < 2) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE,"Welcome to AllMyPPL SMS, you can signup with us by texting back 'YOUR_PHONE YOUR_PIN signup YOUR_EMAIL_ADDRESS'.\n\nYOUR_PHONE must be your verifiable 10 digit phone number. YOUR_PIN must be numbers only and 4 digits in length.\n\nIf you have an existing account with AllMyPPL SMS, text back 'YOUR_PHONE YOUR_PIN menu' to get a list of Available Menu Commands."));
    } else {

      var enteredUsername = wordList[0].toLowerCase() || "";
      var enteredPassword = wordList[1] || "";
      var enteredCommand = wordList[2] ? wordList[2].toLowerCase() : "";

      return Parse.Promise.as({username:enteredUsername,password:enteredPassword,command:enteredCommand});
    }

  }).then(function(userData) {
    var enteredCommand = wordList[2] ? wordList[2].toLowerCase() : "";

    var testStringIsDigits = function(string) {
        var re = /^\d+$/;
        return re.test(string);
    }

    function validateEmail(email) {
        var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(email);
    }

    if (enteredCommand == "signup") {
      var user = new Parse.User();
      if (!testStringIsDigits(wordList[0]) || wordList[0].length != 10) {return Parse.Promise.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"Your username should be your phone number, it must be a verifiable phone number consisting of only numbers and be 10 digits in length."));}
      user.set("username", wordList[0].toLowerCase());
      if (!testStringIsDigits(wordList[1]) || wordList[1].length != 4) {return Parse.Promise.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"Passwords, or PIN numbers, must consist of only numbers and must be 4 digits in length."));}
      user.set("password", wordList[1]);
      if (!validateEmail(wordList[3])) {return Parse.Promise.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"A valid email address must be provided."));}
      user.set("email", wordList[3] ? wordList[3].toLowerCase() : "");
      return user.signUp(null);
    } else {
      return Parse.User.logIn(userData.username,userData.password);
    }

  }).then(function(user) {

    var enteredCommand = wordList[2] ? wordList[2].toLowerCase() : "";

    console.log("user " + user.id + " logged in");
    if (enteredCommand == "contact") {
      var enteredContactCommand = wordList[3] ? wordList[3].toLowerCase() : "";
      var enteredContactId = wordList[4];
      return Parse.Promise.as({command: enteredCommand, contactCommand: enteredContactCommand, contactId: enteredContactId, user: user});
    } else if (enteredCommand == "add") {
      var nameString = "";
      for (var index in wordList) {
        if (index >= 3) {
          nameString += wordList[index];
          if (index != wordList.length - 1) {
            nameString += " ";
          }
        }
      }
      return Parse.Promise.as({command: enteredCommand, phone: wordList[3], name: nameString, user: user});
    } else if (enteredCommand == "all") {
      return Parse.Promise.as({command: enteredCommand, user: user});
    } else if (enteredCommand == "search") {
      var searchString = "";
      for (var index in wordList) {
        if (index >= 3) {
          searchString += wordList[index];
          if (index != wordList.length - 1) {
            searchString += " ";
          }
        }
      }
      return Parse.Promise.as({command: enteredCommand, search:searchString, user: user});
    } else if (enteredCommand == "edit") {

      var valueString = "";
      for (var index in wordList) {
        if (index >= 5) {
          valueString += wordList[index];
          if (index != wordList.length - 1) {
            valueString += " ";
          }
        }
      }
      return Parse.Promise.as({command: enteredCommand, contactId:wordList[3], key:wordList[4] ? wordList[4].toLowerCase() : "", value:valueString, user: user});
    } else if (enteredCommand == "delete") {
      return Parse.Promise.as({command: enteredCommand, contactId:wordList[3], user: user});
    } else if (enteredCommand == "menu") {
      return Parse.Promise.as({command: enteredCommand, user: user});
    } else if (enteredCommand == "signup") {
      return Parse.Promise.as({command: enteredCommand, username:wordList[0].toLowerCase(), password:wordList[1], email: wordList[3] ? wordList[3].toLowerCase() : "", user: user});
    } else {
      return Parse.Promise.as({command: enteredCommand, user: user});
    }

  }).then(function(commandData) {
    var commandPromise = new Parse.Promise();

    var enteredCommand = wordList[2] ? wordList[2].toLowerCase() : "";
    var resultData = {results:[], result:{}, command: commandData.command, user: commandData.user};

    switch (enteredCommand) {
      case "":
      case "menu":
            commandPromise.resolve(resultData);
            break;
      case "contact":
            var Contact = Parse.Object.extend("Contact");
            var emergencyContactQuery = new Parse.Query(Contact);
            if (commandData.contactCommand == "set") {
              console.log("contact set detected.");
              emergencyContactQuery.equalTo("isEmergencyContact",true);
              emergencyContactQuery.first({sessionToken:commandData.user.getSessionToken()}).then(function(emergencyContact) {
                  if (!emergencyContact) {
                    console.log("no contact to unset");
                    console.log("contactId "+commandData.contactId);

                    var contactIdQuery = new Parse.Query(Contact);
                    contactIdQuery.get(commandData.contactId,{sessionToken:commandData.user.getSessionToken()}).then(function(contact){
                      console.log("contactIdQuery.get happened");
                      if (!contact) {console.log(commandData.contactId+" did not return a contact."); commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,commandData.contactId+" did not return a contact."));}
                      else {console.log(contact.id); contact.set("isEmergencyContact",true); contact.save(null, {sessionToken:commandData.user.getSessionToken()}).then(function(saved){console.log("saved object ",saved.toJSON()); resultData.result = saved; commandPromise.resolve(resultData);},function(error){console.log("saving object failed."); commandPromise.reject(new Parse.Error(error.code,error.message));});}
                    },function(error) {
                      console.log("contactIdQuery.get failed, "+error.code+" : "+error.message+" "+commandData.contactId);
                      commandPromise.reject(new Parse.Error(error.code,error.message));
                    });

                  } else {
                    console.log("emergencyContact detected");
                    console.log(JSON.stringify(emergencyContact));
                    emergencyContact.unset("isEmergencyContact");
                    emergencyContact.save(null, {sessionToken:commandData.user.getSessionToken()}).then(function(saved){
                      console.log("isEmergencyContact unset on object "+JSON.stringify(saved));

                      var contactIdQuery = new Parse.Query(Contact);
                      contactIdQuery.get(commandData.contactId,{sessionToken:commandData.user.getSessionToken()}).then(function(contact){
                        console.log("contactIdQuery.get happened");
                        if (!contact) {console.log(commandData.contactId+" did not return a contact."); commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,commandData.contactId+" did not return a contact."));}
                        else {console.log(contact.id); contact.set("isEmergencyContact",true); contact.save(null, {sessionToken:commandData.user.getSessionToken()}).then(function(saved){console.log("saved object ",saved.toJSON()); resultData.result = saved; commandPromise.resolve(resultData);},function(error){console.log("saving object failed."); commandPromise.reject(new Parse.Error(error.code,error.message));});}
                      },function(error) {
                        console.log("contactIdQuery.get failed, "+error.code+" : "+error.message+" "+commandData.contactId);
                        commandPromise.reject(new Parse.Error(error.code,error.message));
                      });

                    },function (error) {
                      console.log("save of object failed, "+error.code+" : "+error.message+" "+commandData.contactId);
                      commandPromise.reject(new Parse.Error(error.code,error.message));
                    });
                  }
                }, function(error) {
                  console.log("error occurred when checking for emergencyContactQuery "+error.code+" "+error.message);
                  commandPromise.reject(new Parse.Error(error.code,error.message));
                });
            } else {
                console.log("looking up current emergencyContact info...");
                emergencyContactQuery.equalTo("isEmergencyContact",true);
                emergencyContactQuery.first({sessionToken:commandData.user.getSessionToken()}).then(function(emergencyContact) {
                  if (!emergencyContact) { console.error("No emergencyContact found.")}
                  else { console.log(JSON.stringify(emergencyContact)); }
                  resultData.result = emergencyContact;
                  commandPromise.resolve(resultData);
                });
            }
            break;
      case "add":
          if (commandData.phone && commandData.phone.length >= 10 && commandData.name && commandData.name.length > 0) {

            var Contact = Parse.Object.extend("Contact");
            var newContact = new Contact();

            newContact.set("phone",commandData.phone);
            newContact.set("name",commandData.name);

            newContact.setACL(new Parse.ACL(commandData.user));

            newContact.save(null, {sessionToken:commandData.user.getSessionToken()}).then(function(savedObject) {
              console.log(savedObject.id + " was saved successfully.");
              resultData = {user:commandData.user, results:[], result:savedObject, command: commandData.command};
              commandPromise.resolve(resultData);
            });

          } else if (commandData.phone && commandData.phone.length < 10) {
            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE,"Phone numbers must be at least 10 digits.  An 'add' command has the following syntax, 'YOUR_PHONE YOUR_PIN add CONTACT-PHONE CONTACT-NAME'."));
          } else {
            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE,"Missing or invalid value for CONTACT-PHONE or CONTACT-NAME.  An 'add' command has the following syntax, 'YOUR_PHONE YOUR_PIN add CONTACT-PHONE CONTACT-NAME'."));
          }
        break;
      case "all":
      // {command: enteredCommand, user: user}
        var Contact = Parse.Object.extend("Contact");
        var query = new Parse.Query(Contact);

        query.find({ sessionToken : commandData.user.getSessionToken() }).then(function(results) {
          var resultData = {user:commandData.user, results:results, result:{}, command: commandData.command};
          for (var index in results) {
            if (results[index].id == commandData.contactId);
          }
          commandPromise.resolve(resultData);
        }, function (error) {
          commandPromise.reject(error);
        });

        break;
      case "search":
      // {command: enteredCommand, search: searchString, user: user}
        var Contact = Parse.Object.extend("Contact");

        var query = new Parse.Query(Contact);
        // get all Contact objects to be ready to
        // perform a case insentive startsWith search in next step
        query.contains("nameLowercase", commandData.search.toLowerCase());

        query.find({ sessionToken : commandData.user.getSessionToken()}).then(function(results) {
          var resultData = {user:commandData.user, results:results, result:{}, command: commandData.command};
          commandPromise.resolve(resultData);
        }, function (error) {
          commandPromise.reject(error);
        });
        break;
      case "delete":
      // {command: enteredCommand, contactId:wordList[3], user: user}
        var Contact = Parse.Object.extend("Contact");
        var query = new Parse.Query(Contact);

        console.log(wordList[3] + " " + commandData.contactId);
        if (wordList[3] == "CssnYynVKw") {
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"The AllMyPPL contact is included for demonstration purposes only, it cannot be edited or deleted."))
        } else {
            query.get(wordList[3], {sessionToken:commandData.user.getSessionToken()}).then(function (result) {

            console.log("Name: " + result.get("name") + "\nPhone: " + result.get("phone")+"\nIsEmergencyContact: "+result.get("isEmergencyContact")+"\nUID: "+result.id);

            result.destroy({sessionToken:commandData.user.getSessionToken()}).then(function(destroyedObject){
              var resultData = {user:commandData.user, results:[], result:destroyedObject, command: commandData.command};
              commandPromise.resolve(resultData);
            }, function (error) {
              commandPromise.reject(new Parse.Error(error.code,error.message));
            });

          }, function(error) {
            commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,error.message));
          });
        }
        break;
      case "signup":
          function validateEmail(emailAddress)
          {
            var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
            if(emailAddress.match(mailformat))
            {
              return true;
            }
            return false;
          }
        if (!commandData.email || commandData.email.length < 1) {
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"An email address is required following the 'signup' command. Text back 'YOUR_PHONE YOUR_PIN signup YOUR_EMAIL_ADDRESS' to try again."));
        } else if (!validateEmail(commandData.email)) {
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"An invalid email address was entered, please make sure the email address has a valid format. Text back 'YOUR_PHONE YOUR_PIN signup YOUR_EMAIL_ADDRESS' to try again."));
        } else {
          commandPromise.resolve(resultData);
        }
        break;
      case "edit":
      // {command: enteredCommand, contactId:wordList[3], key:wordList[4], value:wordList[5], user: user}
      var Contact = Parse.Object.extend("Contact");
      var query = new Parse.Query(Contact);

      console.log(commandData.contactId);
      if (wordList[3] == "CssnYynVKw") {
        commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"The AllMyPPL contact is included for demonstration purposes only, it cannot be edited or deleted."))
      } else {
      query.get(commandData.contactId, {sessionToken:commandData.user.getSessionToken()}).then(function (result) {

          console.log("name " + result.get("name") + "\nphone " + result.get("phone")+"\nuid "+result.id);

          var key = commandData.key;
          result.save({key:commandData.value},{sessionToken:commandData.user.getSessionToken()}).then(function(savedObject){
            var resultData = {user:commandData.user, results:[], result:savedObject, command: commandData.command};
            commandPromise.resolve(resultData);
          }, function (error) {
            commandPromise.reject(error);
          });

        }, function(error) {
          commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,error.message));
        });
      }
        break;
      default:
        commandPromise.resolve(resultData);
      }
      return commandPromise;
  }).then(function(resultData) {
      // resultData == {results:[], result:{}, command: commandData.command, user: commandData.user}
      var resultPromise = new Parse.Promise();

      var enteredCommand = wordList[2] ? wordList[2].toLowerCase() : "";

      switch (enteredCommand) {
        case "menu":
        twilio.sendMessage({

                  to: req.body.From, // Any number Twilio can deliver to
                  from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                  body: "Available Menu Commands:\n\n'signup YOUR_EMAIL_ADDRESS'\n(Sign up as a new user)\n\n'about'\n(A service overview of AllMyPPL)\n\n'add CONTACT-PHONE CONTACT-NAME'\n(Add a contact)\n\n'search NAME'\n(Search for contacts containing a NAME string)\n\n'all'\n(List all contacts)\n\n'edit CONTACT-UID KEY NEW-VALUE'\n(Edit existing contact)\n\n'delete CONTACT-UID'\n(Delete a contact by its UID)\n\n'contact'\n(Show current Emergency Contact)\n\n'contact set CONTACT-UID'\n(Set a new Emergency Contact by its UID).)"

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                  }
        });
           resultPromise.resolve(resultData);
           break;
        case "about":
        twilio.sendMessage({

                  to: req.body.From, // Any number Twilio can deliver to
                  from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                  body: "The AllMyPPL phone number, this number, is +16502062610.\n\nAllMyPPL SMS, activates when you text message in to AllMyPPL, with it, you can manage your Contacts from any phone.\n\nCalling into AllMyPPL, activates AllMyPPL Emergency Caller, which, after you've selected an Emergency Contact using AllMyPPL SMS, forwards the call to Emergency Contact. It calls using your account's phone number for the caller ID instead of the phone you call in with, letting your Emergency Contact know who's really calling.\n\nYou can change your Emergency Contact at any time using AllMyPPL SMS, your current Emergency Contact is the only Contact who you are forwarded to.\n\nWe take your security seriously, and require your credentials with every interaction, please take your own security seriously and delete your text messages with AllMyPPL SMS if you are using a borrowed device as your PIN could be compromised."

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                  }
        });
          break;
        case "contact":
          if (resultData.result){
          twilio.sendMessage({

                    to: req.body.From, // Any number Twilio can deliver to
                    from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                    body: "Your Emergency Contact is currently...\n\nName: "+resultData.result.get("name")+"\nPhone: "+resultData.result.get("phone")+"\nUID: "+resultData.result.id+"\n\nTo change your current Emergency Contact, text back 'YOUR_PHONE YOUR_PIN contact set CONTACT-UID'."

          }, function(err, responseData) { //this function is executed when a response is received from Twilio

                    if (!err) {
                      console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                    } else {
                      console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                    }
          });
        } else {
        twilio.sendMessage({

                  to: req.body.From, // Any number Twilio can deliver to
                  from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                  body: "You do not currently have an Emergency Contact set, to set one, text back 'YOUR_PHONE YOUR_PIN contact set CONTACT-UID.'."
        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                  }
        });
        }
          break;
        case "signup":
            twilio.sendMessage({

                      to: req.body.From, // Any number Twilio can deliver to
                      from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                      body: "Signup successful, welcome to AllMyPPL SMS. To continue, text back 'YOUR_PHONE YOUR_PIN menu' for a list of Available Menu Commands or 'YOUR_PHONE YOUR_PIN about' for a service overview."
            }, function(err, responseData) { //this function is executed when a response is received from Twilio

                      if (!err) {
                        console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                      } else {
                        console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                      }
            });
            resultPromise.resolve(resultData);
            break;
        case "add":
            twilio.sendMessage({

                      to: req.body.From, // Any number Twilio can deliver to
                      from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                      body: "Contact created.\n\nName: " + resultData.result.get("name") + "\nPhone: " + resultData.result.get("phone") + "\nUID: " + resultData.result.id  // body of the SMS message

            }, function(err, responseData) { //this function is executed when a response is received from Twilio

                      if (!err) {
                        console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                      } else {
                        console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                      }
            });
            resultPromise.resolve(resultData);
          break;
        case "all":
        if (resultData) {
            for (var index in resultData.results) {
              console.log("\nname: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: "+resultData.results[index].id);
              twilio.sendMessage({

                        to: req.body.From, // Any number Twilio can deliver to
                        from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                        body: "Name: " + resultData.results[index].get("Name") + "\nphone: " + resultData.results[index].get("phone") + "\nUID: "+resultData.results[index].id   // body of the SMS message

              }, function(err, responseData) { //this function is executed when a response is received from Twilio

                        if (!err) {
                          console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                        } else {
                          console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                        }
              }       );
            }
            if (!resultData || !resultData.results) {
              resultPromise.reject(new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE,"There are no contacts to display."));
            } else {
              resultPromise.resolve(resultData);
            }
          }
          break;
        case "search":
            var count = 0;
            var searchString = "";
            for (var index in wordList) {
              if (index >= 3) {
                searchString += wordList[index];
                if (index != wordList.length - 1) {
                  searchString += " ";
                }
              }
            }

            if (resultData) {
              // perform a startsWith search
              var wasFound = true;
              for (var index in resultData.results) {
                var nameLowercase = resultData.results[index].get("nameLowercase");
                var searchStringLowercase = searchString.toLowerCase();
                for (var i = 0; i < searchStringLowercase.length; i++) {
                      if (i >= searchStringLowercase.length || nameLowercase[i] != searchStringLowercase[i]) {
                        wasFound = false;
                        break;
                      }
                  }
                if (wasFound) {
                  count = index + 1;
                  console.log("\nname: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: "+resultData.results[index].id);
                  twilio.sendMessage({

                            to: req.body.From, // Any number Twilio can deliver to
                            from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                            body: "Name: " + resultData.results[index].get("name") + "\nPhone: " + resultData.results[index].get("phone") + "\nUID: "+resultData.results[index].id   // body of the SMS message

                  }, function(err, responseData) { //this function is executed when a response is received from Twilio

                            if (!err) {
                              console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                            } else {
                              console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                            }
                  });
                }
              }

              if (count == 0 || !resultData || !resultData.results) {
                resultPromise.reject(new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE,"There are no contacts to display."));
              } else  {
                resultPromise.resolve(resultData);
              }
          }
          break;
        case "delete":

                twilio.sendMessage({

                  to: req.body.From, // Any number Twilio can deliver to
                  from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                  body: "Contact successfully deleted."   // body of the SMS message

                }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                  }
                });

                resultPromise.resolve(resultData);
          break;
        case "edit":
          console.log("\nName: " + resultData.result.get("name") + "\nPhone: " + resultData.result.get("phone") + "\nUID: "+resultData.result.id);

          twilio.sendMessage({

            to: req.body.From, // Any number Twilio can deliver to
            from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
            body: "Contact " + resultData.result.get("phone") + " \"" + resultData.result.get("name") + "\" updated with \"" + req.body.Body.split(" ")[4] + "\" : '" + resultData.result.get(req.body.Body.split(" ")[4]) + "'."

          }, function(err, responseData) { //this function is executed when a response is received from Twilio

            if (!err) {
              console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
            } else {
              console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
            }
          });

          resultPromise.resolve(resultData);
          break;
        default:
            twilio.sendMessage({

              to: req.body.From, // Any number Twilio can deliver to
              from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
              body: "Looks like you're a little lost, but you logged in successfully, welcome to AllMyPPL SMS.\n\nTo continue, text back 'YOUR_PHONE YOUR_PIN menu' to view the list of Available Menu Commands or 'YOUR_PHONE YOUR_PIN about' for a service overview."

            }, function(err, responseData) { //this function is executed when a response is received from Twilio

              if (!err) {
                console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
              } else {
                console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
              }
            });
          resultPromise.resolve(resultData);
        }
        return resultPromise;
      }).then(function(resultData) {

        let savedObjectPriomise = new Parse.Promise();

        Parse.Session.current().save({from:req.body.From},{sessionToken:Parse.User.current().getSessionToken()}).then(function(savedObject){savedObjectPriomise.resolve(savedObject);},function(err){savedObjectPriomise.reject(err)});

        console.log(Parse.Promise.as(savedObjectPriomise));

        Parse.User.logOut();

      }, function (error) {
        console.log("error code " + error.code + " message " + error.message);
        twilio.sendMessage({

                  to: req.body.From, // Any number Twilio can deliver to
                  from: allMyPPLPhoneNumber, // A number you bought from Twilio and can use for outbound communication
                  body: error.message  // body of the SMS message

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + req.body.From + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + req.body.From + ". Error: \"" + err);
                  }
        });
      });

});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('AllMyPPL\'s Parse server is running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
