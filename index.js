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

// setup AllMyPPL
var AllMyPPL = new Object();
AllMyPPL.Error = {SUBSCRIPTION_UNPAID:1000,SUBSCRIPTION_EXPIRED:1001};
AllMyPPL.PHONE_NUMBER = "+16502062610";
AllMyPPL.WEBSITE = "www.allmyppl.com";
AllMyPPL.CREATED_BY = "Patrick Blaine";
AllMyPPL.NAME = "AllMyPPL";
AllMyPPL.SUBSCRIPTION_STATUS_NEVER_HAD = undefined;
AllMyPPL.SUBSCRIPTION_STATUS_ACTIVE = "SUBSCRIPTION_STATUS_ACTIVE";
AllMyPPL.SUBSCRIPTION_STATUS_EXPIRED = "SUBSCRIPTION_STATUS_EXPIRED";
AllMyPPL.SUBSCRIPTION_STATUS_UNPAID = "SUBSCRIPTION_STATUS_UNPAID";

// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey

var app = express();

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));

// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send(''); // PLACE HTML OR TEXT FOR INDEX OF DOMAIN.COM/ BETWEEN '' in send()
});

app.post('/smsReceived', function(req, res) {

  var latestMessage = {}; // needed in multiple steps

  Parse.Promise.as().then(function(){
    var twilioListSmsPromise = new Parse.Promise();

    twilio.listSms({
        to: AllMyPPL.PHONE_NUMBER
    }, function(err, responseData) {
        if (!err) {
            res.status(200).send();
        twilioListSmsPromise.resolve(responseData.sms_messages[0]);
      } else {
        res.status(404).send();
        twilioListSmsPromise.reject(err);
      }
    });

    return twilioListSmsPromise;
  }).then( function(latestMsg){
    latestMessage = latestMsg;

    var wordList = latestMessage.body.split(" ");
    var enteredUsername = wordList[0] || "";
    var enteredPassword = wordList[1] || "";
    var enteredCommand = wordList[2] || "";

    if (!enteredUsername) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.USERNAME_MISSING,"All requests must begin with a username, then the password then a command. Structure your next SMS as 'USERNAME PASSWORD command ...' (i.e. 'USERNAME PASSWORD signup EMAIL')."));
    } else if (!enteredPassword) {
      return Parse.Promise.error(new Parse.Error(Parse.Error.PASSWORD_MISSING,"A password is required, then a command. Structure your next SMS in the following syntax, 'USERNAME PASSWORD command ...' (i.e. 'USERNAME PASSWORD signup EMAIL')."));
    } else {
      return Parse.Promise.as({username:enteredUsername,password:enteredPassword,command:enteredCommand});
    }

  }).then(function(userData) {
    var wordList = latestMessage.body.split(" ");
    var enteredCommand = wordList[2] || "";

    if (enteredCommand == "signup") {
      var user = new Parse.User();
      user.set("username", wordList[0]);
      user.set("password", wordList[1]);
      user.set("email", wordList[3]);
      return user.signUp(null);
    } else {
      return Parse.User.logIn(userData.username,userData.password);
    }

  }).then(function(user) {

    if (user.get("subscriptionStatus") != AllMyPPL.SUBSCRIPTION_STATUS_UNPAID) {
      return new Parse.Error(Parse.Error.EXCEEDED_QUOTA,"Your account is not in good standing, please make sure all outstanding charges have been paid.");
    } else if (user.get("subscriptionStatus") != AllMyPPL.SUBSCRIPTION_STATUS_ACTIVE) {
      return new Parse.Error(Parse.Error.EXCEEDED_QUOTA,"You are not currently subscribed to the SMS service.");
    } else {
    var wordList = latestMessage.body.split(" ");
    var enteredCommand = wordList[2] || "";

    console.log("user " + user.id + " logged in");
    if (enteredCommand == "add") {
      var nameString = "";
      for (var index in wordList) {
        if (index >= 4) {
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
      return Parse.Promise.as({command: enteredCommand, contactId:wordList[3], key:wordList[4], value:valueString, user: user});
    } else if (enteredCommand == "delete") {
      return Parse.Promise.as({command: enteredCommand, contactId:wordList[3], user: user});
    } else if (enteredCommand == "menu") {
      return Parse.Promise.as({command: enteredCommand, user: user});
    } else if (enteredCommand == "signup") {
      return Parse.Promise.as({command: enteredCommand, username:wordList[0], password:wordList[1], email: wordList[3], user: user});
    } else {
      return Parse.Promise.as({command: enteredCommand, user: user});
    }
  }

  }).then(function(commandData) {
    var commandPromise = new Parse.Promise();
    var wordList = latestMessage.body.split(" ");

    var enteredCommand = wordList[2] || "";
    var resultData = {results:[], result:{}, command: commandData.command, user: commandData.user};

    switch (enteredCommand) {
      case "menu":
            commandPromise.resolve(resultData);
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
            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE,"Phone numbers must be at least 10 digits.  An 'add' command has the following syntax, 'USERNAME PASSWORD add CONTACT-PHONE CONTACT-NAME'."));
          } else {
            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE,"Missing or invalid value for CONTACT-PHONE or CONTACT-NAME.  An 'add' command has the following syntax, 'USERNAME PASSWORD add CONTACT-PHONE CONTACT-NAME'."));
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
        var wordList = latestMessage.body.split(" ");

        console.log(wordList[3] + " " + commandData.contactId);
        if (wordList[3] == "CssnYynVKw") {
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"That contact cannot be edited or deleted."))
        } else {
            query.get(wordList[3], {sessionToken:commandData.user.getSessionToken()}).then(function (result) {

            console.log("name " + result.get("name") + "\nphone " + result.get("phone")+"\nuid "+result.id);

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
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"An email address is required following the 'signup' command. 'USERNAME PASSWORD signup EMAIL'"));
        } else if (!validateEmail(commandData.email)) {
          commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"An invalid email address was entered, please make sure the email address has a valid format. 'USERNAME PASSWORD signup EMAIL'"));
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
        commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN,"The AllMyPPL contact cannot be edited or deleted."))
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
      var wordList = latestMessage.body.split(" ");

      var enteredCommand = wordList[2] || "";

      switch (enteredCommand) {
        case "menu":
        twilio.sendMessage({

                  to: latestMessage.from, // Any number Twilio can deliver to
                  from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                  body: "Available Commands:\n\n'signup EMAIL'\n(Sign up a new user)\n\n'add CONTACT-PHONE CONTACT-NAME'\n(Add a contact)\n\n'search NAME'\n(Search for contacts containing a NAME string)\n\n'all'\n(List all contacts)\n\n'edit CONTACT-UID KEY NEW-VALUE'\n(Edit existing contact)\n\n'delete CONTACT-UID'\n(Delete a contact by its UID)"

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
                  }
        });
           resultPromise.resolve(resultData);
           break;
        case "signup":
            twilio.sendMessage({

                      to: latestMessage.from, // Any number Twilio can deliver to
                      from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                      body: "Sign in successful, welcome to AllMyPPL, the textable contact storage service, we store your contacts in the cloud, allowing you to access them by texting, managing and searching them from any phone capable of text messaging.  So when your battery dies, instead of being stranded without a way to contact who matters until you charge, you can access all of your contacts, and search by name for who you need to call, with a single text from anyone\'s phone.  The most utility of our service is found when you don\'t have your phone available, that means authenticating on another\'s device, which might give you pause, our authentication has a lifetime of a single texted command and reply, instead of sessions that have to be explicitly closed or else leaving you vulnerable until its expiration, authentication is required with every texted command, first, your username, second, your password, you will be logged in and the command following PASSWORD will run.  Make note that the sequence expected of text message commands is \'USERNAME PASSWORD command\', the latter being a command selected from the \"Available Commands\" shown when you text in the command \"menu\".  Please be aware that all commands and keys are case-sensitive (i.e. 'USERNAME PASSWORD menu')"

            }, function(err, responseData) { //this function is executed when a response is received from Twilio

                      if (!err) {
                        console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                      } else {
                        console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
                      }
            });
            resultPromise.resolve(resultData);
            break;
        case "add":
            twilio.sendMessage({

                      to: latestMessage.from, // Any number Twilio can deliver to
                      from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                      body: "Contact created for\n" + resultData.result.get("phone") + "\n\"" + resultData.result.get("name") + "\"."  // body of the SMS message

            }, function(err, responseData) { //this function is executed when a response is received from Twilio

                      if (!err) {
                        console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                      } else {
                        console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
                      }
            });
            resultPromise.resolve(resultData);
          break;
        case "all":
        if (resultData) {
            for (var index in resultData.results) {
              console.log("\nname: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: "+resultData.results[index].id);
              twilio.sendMessage({

                        to: latestMessage.from, // Any number Twilio can deliver to
                        from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                        body: "name: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: "+resultData.results[index].id   // body of the SMS message

              }, function(err, responseData) { //this function is executed when a response is received from Twilio

                        if (!err) {
                          console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                        } else {
                          console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
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
                var nameLowercase = resultData.results[index].get("name").toLowerCase();
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

                            to: latestMessage.from, // Any number Twilio can deliver to
                            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                            body: "name: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: "+resultData.results[index].id   // body of the SMS message

                  }, function(err, responseData) { //this function is executed when a response is received from Twilio

                            if (!err) {
                              console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                            } else {
                              console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
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

                  to: latestMessage.from, // Any number Twilio can deliver to
                  from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                  body: "Contact successfully deleted."   // body of the SMS message

                }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
                  }
                });

                resultPromise.resolve(resultData);
          break;
        case "edit":
          console.log("\nname: " + resultData.result.get("name") + "\nphone: " + resultData.result.get("phone") + "\nuid: "+resultData.result.id);

          twilio.sendMessage({

            to: latestMessage.from, // Any number Twilio can deliver to
            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
            body: "Contact " + resultData.result.get("phone") + " \"" + resultData.result.get("name") + "\" updated with \"" + latestMessage.body.split(" ")[4] + "\" : \"" + resultData.result.get(latestMessage.body.split(" ")[4]) + "\"."

          }, function(err, responseData) { //this function is executed when a response is received from Twilio

            if (!err) {
              console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
            } else {
              console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
            }
          });

          resultPromise.resolve(resultData);
          break;
        default:
            twilio.sendMessage({

              to: latestMessage.from, // Any number Twilio can deliver to
              from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
              body: "Log in successful, welcome to AllMyPPL, the textable contact storage service, we store your contacts in the cloud, allowing you to access them, edit and search them through texting.\n\nAvailable Commands:\n\n'signup EMAIL'\n(Sign up a new user)\n\n'add CONTACT-PHONE CONTACT-NAME'\n(Add a contact)\n\n'search NAME'\n(Search for contacts containing a NAME string)\n\n'all'\n(List all contacts)\n\n'edit CONTACT-UID KEY NEW-VALUE'\n(Edit existing contact)\n\n'delete CONTACT-UID'\n(Delete a contact by its UID)"

            }, function(err, responseData) { //this function is executed when a response is received from Twilio

              if (!err) {
                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
              } else {
                console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
              }
            });
          resultPromise.resolve(resultData);
        }
        return resultPromise;
      }).then(function(resultData) {

        Parse.User.logOut();

      }, function (error) {
        console.log("error code " + error.code + " message " + error.message);
        twilio.sendMessage({

                  to: latestMessage.from, // Any number Twilio can deliver to
                  from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                  body: error.message + "\n\nSMS Command Syntax:\n\n'USERNAME PASSWORD command'\n\n(i.e. USERNAME PASSWORD signup EMAIL)"  // body of the SMS message

        }, function(err, responseData) { //this function is executed when a response is received from Twilio

                  if (!err) {
                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                  } else {
                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
                  }
        });
      });

});

// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
  res.sendFile(path.join(__dirname, '/public/test.html'));
});

var port = process.env.PORT || 1337;
var httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
    console.log('AllMyPPL\'s Parse server is running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
