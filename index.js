// TODO add a subscription management menu section
// TODO decide which text message replies send out on the free plan, and which require an active subscription for use of the feature
// all payment & subscription management does not require a subscription, neither does signup
// TODO write a tutorial for the onboarding process, first all messages just tell you to signup or login to your existing account, after signup, you must verify the email, then it makes a customer in stripe, you must then attach a card, and activate the subscription and pay for the current month, once receipt of a successfully paid subscription registers with stripe, then all of the sms service opens up

// while using test servers, card numbers must be the following: '4242424242424242' or '5555555555554444'

// TODO only block certain features with subscription statuses, not the all feature block that it is now

// if email is not verified, then make sure that happens before creating a stripe customer for the account
// if email is verified, but no subscription active, and no payment methods, the only commands are the payment commands: status, set.
// if email is verified, and a payment method set, but no subscription active, the only commands are the payment commands and subscription commands: status, activate, cancel
// if email is verified, and a payment method set, and a subscription is active, then all commands are available: signup, payment, subscription, menu, add, all, search, delete

// Example express application adding the parse-server module to expose Parse
// compatible API routes.
const resolve = require('path')
    .resolve;
var express = require('express');
var ParseServer = require('parse-server')
    .ParseServer;
var Parse = require('parse/node');
var path = require('path');
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID || "twilioAccountSid", process.env.TWILIO_AUTH_TOKEN || "twilioAuthToken");
var http = require('http');
var querystring = require('querystring');
var stripe = require('stripe')(process.env.STRIPE_API_KEY || "stripeApiKey");
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}
var api = new ParseServer({
    databaseURI: databaseUri || 'mongodb://localhost:27017/dev',
    cloud: process.env.CLOUD_CODE_MAIN || __dirname + '/cloud/main.js',
    appId: process.env.APP_ID || 'appId',
    masterKey: process.env.MASTER_KEY || 'masterKey', //Add your master key here. Keep it secret!
    serverURL: process.env.SERVER_URL || 'https://localhost:1337/parse', // Don't forget to change to https if needed
    liveQuery: {
        classNames: ["Contact"] // List of classes to support for query subscriptions
    },
    publicServerURL: process.env.SERVER_URL || 'https://localhost:1337/parse',
    appName: process.env.APP_NAME || 'appName',
    verifyUserEmails: true,
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
                    subject: 'Your recent message to AllMyPPL Support',
                    pathPlainText: resolve(__dirname, 'public/email-templates/custom_alert.txt'),
                    pathHtml: resolve(__dirname, 'public/email-templates/custom_alert.html')
                },
                supportReply: {
                  subject: 'Your recent message to AllMyPPL Support',
                  pathPlainText: resolve(__dirname, 'public/email-templates/support-reply.txt'),
                  pathHtml: resolve(__dirname, 'public/email-templates/support-reply.html'),
                },
                supportIncoming: {
                  subject: 'A user sent AllMyPPL Support a message',
                  pathPlainText: resolve(__dirname, 'public/email-templates/support-incoming.txt'),
                  pathHtml: resolve(__dirname, 'public/email-templates/support-incoming.html'),
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
AllMyPPL.Error = {};
AllMyPPL.PHONE_NUMBER = "+16502062610";
AllMyPPL.WEBSITE = "www.allmyppl.com";
AllMyPPL.CREATED_BY = "Patrick Blaine";
AllMyPPL.NAME = "AllMyPPL";

AllMyPPL.SUBSCRIPTION_STATUS_NEVER_HAD = undefined;
AllMyPPL.SUBSCRIPTION_STATUS_ACTIVE = "SUBSCRIPTION_STATUS_ACTIVE";
AllMyPPL.SUBSCRIPTION_STATUS_EXPIRED = "SUBSCRIPTION_STATUS_EXPIRED";
AllMyPPL.SUBSCRIPTION_STATUS_UNPAID = "SUBSCRIPTION_STATUS_UNPAID";

AllMyPPL.STRIPE_ERROR_MESSAGE = "AllMyPPL had an internal error when interacting with Stripe, please contact support@allmyppl.com and tell us what you were trying to do and at what time.";
AllMyPPL.SUPPORT_SMS_RESPONSE = "Thank you for writing AllMyPPL Support, you'll be receiving an email from us addressing your concerns.  Starting off any text with 'support' or 'help' means that you're sending a message from the phone you text from directly to AllMyPPL Support, you can also send a support message with your account information by typing 'USERNAME PASSWORD support MESSAGE'.";


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
    res.status(200)
        .send(''); // PLACE HTML OR TEXT FOR INDEX OF DOMAIN.COM/ BETWEEN '' in send()
});

app.get('/createPlans', function(req,res) {
  stripe.plans.create({
    name: "Basic Plan",
    id: "basic-monthly",
    interval: "month",
    currency: "usd",
    amount: 0,
  }, function(err, plan) {
  // asynchronously called
    console.log(err);
  });
  stripe.plans.create({
  name: "Text Messaging Plan",
  id: "text-messaging",
  interval: "month",
  currency: "usd",
  amount: 99,
  }, function(err, plan) {
  // asynchronously called
    console.log(err);
  });
});

app.post('/smsReceived', function(req, res) {

  console.log(req);
  JSON.stringify(console.log(req));

  var messagesPromise = new Parse.Promise();

  twilio.listSms({
      to: AllMyPPL.PHONE_NUMBER
  }, function(err, responseData) {
      if (!err) {
          res.status(200)
              .send(responseData.sms_messages[0].body);
          messagesPromise.resolve(responseData.sms_messages[0]);
      } else {
          res.status(404)
              .send('Cannot access latestMessage.');
          messagesPromise.reject(err);
      }
  });

  Parse.Promise.when(messagesPromise)
  .then(function(message) {

      console.log(message);

      twilio.sendMessage({
          to: message.from, // Any number Twilio can deliver to
          from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
          body: message.body
      }, function(err, responseData) { //this function is executed when a response is received from Twilio
          if (!err) {
              console.log("Successfully sent sms to " + message.from + ". Response: " + responseData);
          } else {
              console.error("Could not send sms to " + message.from + ". Error: \"" + err);
          }
      });

      return Parse.Promise.as(message);

  }).then(function(message) {
        console.log(message);
  }, function(err) {
        console.error(err);
  });

});

app.post('/smsReceivedBROKEN', function(req, res) {
        var latestMessage = {}; // needed in multiple steps
        Parse.Promise.as()
            .then(function() {
                var twilioListSmsPromise = new Parse.Promise();
                twilio.listSms({
                    to: AllMyPPL.PHONE_NUMBER
                }, function(err, responseData) {
                    if (!err) {
                        res.status(200)
                            .send(responseData.sms_messages[0].body);
                        twilioListSmsPromise.resolve(responseData.sms_messages[0]);
                    } else {
                        res.status(404)
                            .send('Cannot access latestMessage.');
                        twilioListSmsPromise.reject(err);
                    }
                });
                return twilioListSmsPromise;
            })
            .then(function(latestMsg) {
                latestMessage = latestMsg;
                var wordList = latestMessage.body.split(" ");
                var enteredUsername = wordList[0].toLowerCase();
                var enteredPassword = wordList[1];
                var enteredCommand = wordList[2].toLowerCase();
                var enteredEmail = wordList[3].toLowerCase();
                if (!enteredUsername) {
                    return Parse.Promise.error(new Parse.Error(Parse.Error.USERNAME_MISSING, "All requests must begin with a username, then the password then a command. Structure your next SMS as 'USERNAME PASSWORD command ...' (i.e. 'USERNAME PASSWORD signup EMAIL_ADDRESS')."));
                } else if (!enteredPassword) {
                    return Parse.Promise.error(new Parse.Error(Parse.Error.PASSWORD_MISSING, "Welcome to AllMyPPL, the textable contact storage service, you can create a new account with 'USERNAME PASSWORD signup EMAIL_ADDRESS' or you can either log in to an existing account and view the commands available by typing 'USERNAME PASSWORD menu'"));
                } else if (enteredUsername == "support" || enteredUsername == "help") {
                  twilio.sendMessage({
                      to: latestMessage.from, // Any number Twilio can deliver to
                      from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                      body: AllMyPPL.SUPPORT_SMS_RESPONSE
                  }, function(err, responseData) { //this function is executed when a response is received from Twilio
                      if (!err) {
                          console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                      } else {
                          console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                      }
                  });
                  const { AppCache } = require('parse-server/lib/cache');
                  // Get a reference to the MailgunAdapter
                  // NOTE: It's best to do this inside the Parse.Cloud.define(...) method body and not at the top of your file with your other imports. This gives Parse Server time to boot, setup cloud code and the email adapter.
                  const MailgunAdapter = AppCache.get(process.env.APP_ID)['userController']['adapter'];

                  // Invoke the send method with an options object
                  MailgunAdapter.send({
                    templateName: 'supportIncoming',
                    // Optional override of the adapter's fromAddress
                    fromAddress: 'AllMyPPL Support <support@allmyppl.com>',
                    recipient: 'AllMyPPL Incoming Support Messages <inbox@allmyppl.com>',
                    variables: { fromPhone: latestMessage.from, messageBody: latestMessage.body } // {{alert}} will be compiled to 'New posts'
                  });
                } else {
                    return Parse.Promise.as({
                        username: enteredUsername,
                        password: enteredPassword,
                        command: enteredCommand,
                        email: enteredEmail
                    });
                }
            })
            .then(function(userData) {
                if (userData.command == "signup") {
                    var user = new Parse.User();
                    user.set("username", userData.username);
                    user.set("password", userData.password);
                    user.set("email", userData.email);
                    return user.signUp(null);
                } else {
                    return Parse.User.logIn(userData.username, userData.password);
                }
            })
            .then(function(user) {

                console.log(JSON.stringify(user));

                if (!user.get("emailVerified") && latestMessage.body.split(" ")[2].toLowerCase() != "signup" ) {
                  return Parse.Promise.error(
                    new Parse.Error(
                      Parse.Error.INVALID_EMAIL_ADDRESS,
                      "Welcome to AllMyPPL, "+user.get('username')+", before continuing, you'll need to verify the email address provided at sign up.  After you successfully verify, you'll be able to manage your account, subscriptions and payment methods.  If you want to use the SMS interface to retrieve and manage your contacts, you'll need an active subscription.  To activate your subscription, first attach a payment method to your account with 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVC'."
                    )
                  );
                } else {

                /*  if (user.get("subscriptionStatus") == AllMyPPL.SUBSCRIPTION_STATUS_ACTIVE) {  */
                    // SUBSCRIPTION_STATUS_ACTIVE
                    var wordList = latestMessage.body.split(" ");
                    var enteredCommand = wordList[2].toLowerCase();
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
                        return Parse.Promise.as({
                            command: enteredCommand,
                            phone: wordList[3],
                            name: nameString,
                            user: user
                        });
                    } else if (enteredCommand == "all") {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            user: user
                        });
                    } else if (enteredCommand == "search") {
                        var searchString = "";
                        for (var index in wordList) {
                            if (index >= 3) {
                                searchString += wordList[index].toLowerCase();
                                if (index != wordList.length - 1) {
                                    searchString += " ";
                                }
                            }
                        }
                        return Parse.Promise.as({
                            command: enteredCommand,
                            search: searchString,
                            user: user
                        });
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
                        return Parse.Promise.as({
                            command: enteredCommand,
                            contactId: wordList[3],
                            key: wordList[4].toLowerCase(),
                            value: valueString,
                            user: user
                        });
                    } else if (enteredCommand == "delete") {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            contactId: wordList[3],
                            user: user
                        });
                    } else if (enteredCommand == "menu") {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            user: user
                        });
                    } else if (enteredCommand == "signup") {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            email: user.email,
                            user: user
                        });
                    } else if (enteredCommand == "payment") {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            user: user
                        });
                    } else {
                        return Parse.Promise.as({
                            command: enteredCommand,
                            user: user
                        });
                    }
                  /*} else {
                    if (user.get("subscriptionStatus") == AllMyPPL.SUBSCRIPTION_STATUS_NEVER_HAD) {
                        return Parse.Promise.error(new Parse.Error(Parse.Error.EXCEEDED_QUOTA, "You've never subscribed to the SMS service, subscribing will allow you to manage and retrieve your contacts by text messaging."));
                    } else if (user.get("subscriptionStatus") == AllMyPPL.SUBSCRIPTION_STATUS_UNPAID) {
                        return Parse.Promise.error(new Parse.Error(Parse.Error.EXCEEDED_QUOTA, "Your account is not in good standing, please make sure all outstanding charges have been paid and that your subscription is reactivated."));
                    } else if (user.get("subscriptionStatus") == AllMyPPL.SUBSCRIPTION_STATUS_EXPIRED) {
                        return Parse.Promise.error(new Parse.Error(Parse.Error.EXCEEDED_QUOTA, "You are not currently subscribed to the SMS service, please activate your subscription to enable managing and retrieval of contacts by text messaging."));
                    }
                  }*/
                }
            })
            .then(function(commandData) {
                var commandPromise = new Parse.Promise();
                var wordList = latestMessage.body.split(" ");
                var enteredCommand = commandData.command;
                var resultData = {
                    results: [],
                    result: {},
                    command: commandData.command,
                    user: commandData.user,
                    paymentCommand: ""
                };
                switch (enteredCommand.toLowerCase()) {
                    case "payment":
                        resultData.paymentCommand = wordList[3].toLowerCase();
                        commandPromise.resolve(resultData);
                        break;
                    case "menu":
                        commandPromise.resolve(resultData);
                        break;
                    case "add":
                        if (commandData.phone && commandData.phone.length >= 10 && commandData.name && commandData.name.length > 0) {
                            var Contact = Parse.Object.extend("Contact");
                            var newContact = new Contact();
                            newContact.set("phone", commandData.phone);
                            newContact.set("name", commandData.name);
                            newContact.setACL(new Parse.ACL(commandData.user));
                            newContact.save(null, {
                                    sessionToken: commandData.user.getSessionToken()
                                })
                                .then(function(savedObject) {
                                    console.log(savedObject.id + " was saved successfully.");
                                    resultData = {
                                        user: commandData.user,
                                        results: [],
                                        result: savedObject,
                                        command: commandData.command
                                    };
                                    commandPromise.resolve(resultData);
                                });
                        } else if (commandData.phone && commandData.phone.length < 10) {
                            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE, "Phone numbers must be at least 10 digits.  An 'add' command has the following syntax, 'USERNAME PASSWORD add CONTACT-PHONE CONTACT-NAME'."));
                        } else {
                            commandPromise.reject(new Parse.Error(Parse.Error.INCORRECT_TYPE, "Missing or invalid value for CONTACT-PHONE or CONTACT-NAME.  An 'add' command has the following syntax, 'USERNAME PASSWORD add CONTACT-PHONE CONTACT-NAME'."));
                        }
                        break;
                    case "all":
                        // {command: enteredCommand, user: user}
                        var Contact = Parse.Object.extend("Contact");
                        var query = new Parse.Query(Contact);
                        query.find({
                                sessionToken: commandData.user.getSessionToken()
                            })
                            .then(function(results) {
                                var resultData = {
                                    user: commandData.user,
                                    results: results,
                                    result: {},
                                    command: commandData.command
                                };
                                for (var index in results) {
                                    if (results[index].id == commandData.contactId);
                                }
                                commandPromise.resolve(resultData);
                            }, function(error) {
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
                        query.find({
                                sessionToken: commandData.user.getSessionToken()
                            })
                            .then(function(results) {
                                var resultData = {
                                    user: commandData.user,
                                    results: results,
                                    result: {},
                                    command: commandData.command
                                };
                                commandPromise.resolve(resultData);
                            }, function(error) {
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
                            commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "That contact cannot be edited or deleted."))
                        } else {
                            query.get(wordList[3], {
                                    sessionToken: commandData.user.getSessionToken()
                                })
                                .then(function(result) {
                                    console.log("name " + result.get("name") + "\nphone " + result.get("phone") + "\nuid " + result.id);
                                    result.destroy({
                                            sessionToken: commandData.user.getSessionToken()
                                        })
                                        .then(function(destroyedObject) {
                                            var resultData = {
                                                user: commandData.user,
                                                results: [],
                                                result: destroyedObject,
                                                command: commandData.command
                                            };
                                            commandPromise.resolve(resultData);
                                        }, function(error) {
                                            commandPromise.reject(new Parse.Error(error.code, error.message));
                                        });
                                }, function(error) {
                                    commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, error.message));
                                });
                        }
                        break;
                    case "signup":
                        function validateEmail(emailAddress) {
                            var mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
                            if (emailAddress.match(mailformat)) {
                                return true;
                            }
                            return false;
                        }
                        if (!commandData.email || commandData.email.length < 1) {
                            commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "An email address is required following the 'signup' command. 'USERNAME PASSWORD signup EMAIL_ADDRESS'"));
                        } else if (!validateEmail(commandData.email)) {
                            commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "An invalid email address was entered, please make sure the email address has a valid format. 'USERNAME PASSWORD signup EMAIL_ADDRESS'"));
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
                            commandPromise.reject(new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, "The AllMyPPL contact cannot be edited or deleted."))
                        } else {
                            query.get(commandData.contactId, {
                                    sessionToken: commandData.user.getSessionToken()
                                })
                                .then(function(result) {
                                    console.log("name " + result.get("name") + "\nphone " + result.get("phone") + "\nuid " + result.id);
                                    var key = commandData.key;

                                    if (result.get(key)) {

                                    result.save({
                                            key: commandData.value
                                        }, {
                                            sessionToken: commandData.user.getSessionToken()
                                        })
                                        .then(function(savedObject) {
                                            var resultData = {
                                                user: commandData.user,
                                                results: [],
                                                result: savedObject,
                                                command: commandData.command
                                            };
                                            commandPromise.resolve(resultData);
                                        }, function(error) {
                                            commandPromise.reject(error);
                                        });

                                      } else {
                                        commandPromise.reject(new Parse.Error(Parse.Error.INVALID_KEY_NAME,"Currently you can only set the existing keys, "+JSON.stringify(result)+".  To edit this contact, type 'USERNAME PASSWORD edit "+commandData.contactId+" KEY NEW-VALUE'"))
                                      }
                                }, function(error) {
                                    commandPromise.reject(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND, error.message));
                                });
                        }
                        break;
                    default:
                        commandPromise.resolve(resultData);
                }
                return commandPromise;
            })
            .then(function(resultData) {
                    // resultData == {results:[], result:{}, command: commandData.command, user: commandData.user}
                    var resultPromise = new Parse.Promise();
                    var wordList = latestMessage.body.split(" ");
                    var enteredCommand = wordList[2].toLowerCase() ;
                    switch (enteredCommand) {
                        case "payment":
                            if (resultData.paymentCommand == "" || !resultData.paymentCommand) {
                              twilio.sendMessage({
                                  to: latestMessage.from, // Any number Twilio can deliver to
                                  from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                  body: "In the 'payment' menu, you can perform the following commands, 'status', which will show all the payment method registered to your account, and 'set CARD_NUMBER EXP_MONTH EXP_YEAR CVC', which will set your current payment method to the information you provide."
                              }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                  if (!err) {
                                      console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                  } else {
                                      console.error("Could not send sms to " + latestMessage.from + ". Error: \"" + err);
                                  }
                              });
                            } else if (resultData.paymentCommand == "status") {
                                stripe.customers.listCards(resultData.user.get("customerId"), function(err, cards) {

                                  if (err) {
                                    console.log(err);
                                    resultPromise.reject(new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR,AllMyPPL.STRIPE_ERROR_MESSAGE));
                                  } else {
                                    // asynchronously called
                                    if (!cards || !cards.data || cards.data.length == 0) {
                                        twilio.sendMessage({
                                            to: latestMessage.from, // Any number Twilio can deliver to
                                            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                            body: "You currently have no payment methods on file.\n\nType 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV'."
                                        }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                            if (!err) {
                                                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                            } else {
                                                console.error("Could not send sms to " + latestMessage.from + ". Error: \"" + err);
                                              }
                                        });
                                        resultPromise.resolve();
                                    } else {
                                        if (cards.data[0] && cards.data[0].last4) {
                                        twilio.sendMessage({
                                            to: latestMessage.from, // Any number Twilio can deliver to
                                            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                            body: "The last 4 digits of your active payment method are " + cards.data[0].last4 + ".\n\nTo set a new payment method, type USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV."
                                        }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                            if (!err) {
                                                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                            } else {
                                                console.error("Could not send sms to " + latestMessage.from + ". Error: \"" + err);
                                            }
                                        });
                                          resultPromise.resolve();
                                        } else {
                                          console.log(cards);
                                          resultPromise.reject(new Parse.Error(Parse.Error.INTERNAL_SERVER_ERROR,AllMyPPL.STRIPE_ERROR_MESSAGE))
                                        }
                                    }
                                }
                              });
                            } else if (resultData.paymentCommand == "set") {

                                var verificationPromise = new Parse.Promise();

                                if (!wordList[4] || wordList[4].length < 13 || wordList[4].length > 16) {
                                  verificationPromise.reject("Card number for payment method must be between 13 & 16 digits long with no spaces.\n\nType 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV'.");
                                } else if (!wordList[5] || wordList[5].length != 2) {
                                  verificationPromise.reject("Expiration month must be 2 digits.\n\nType 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV'.");
                                } else if (!wordList[6] || wordList[6].length != 4) {
                                  verificationPromise.reject("Expiration year must be 4 digits.\n\nType 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV'.");
                                } else if (!wordList[7] || wordList[7].length != 3) {
                                  verificationPromise.reject("CVC must be 3 digits.\n\nType 'USERNAME PASSWORD payment set CARD_NUMBER EXP_MONTH EXP_YEAR CVV'.");
                                } else {
                                  verificationPromise.resolve({
                                    object: 'card',
                                    number: wordList[4],
                                    exp_month: wordList[5],
                                    exp_year: wordList[6],
                                    cvc: wordList[7],
                                    currency: 'usd'
                                  });
                                }

                                Parse.Promise.when(verificationPromise).then(function(sourceToken){

                                    var customerUpdatePromise = new Parse.Promise();

                                    if (resultData.user.get('customerId')) {

                                    console.log(resultData.user.get('customerId'));

                                    stripe.customers.update(resultData.user.get('customerId'), {
                                          source: sourceToken
                                        }, function(err, customer) {
                                          // asynchronously called
                                          if (err) {
                                            console.log(err);
                                            customerUpdatePromise.reject(AllMyPPL.STRIPE_ERROR_MESSAGE);
                                          } else {
                                            customerUpdatePromise.resolve(customer);
                                          }
                                    });

                                    } else {
                                      console.log(err);
                                      customerUpdatePromise.reject(AllMyPPL.STRIPE_ERROR_MESSAGE);
                                    }

                                    return customerUpdatePromise;

                                  }).then(function(customer) {

                                    console.log("Card verified successfully.\n\n" + customer);

                                    twilio.sendMessage({
                                        to: latestMessage.from, // Any number Twilio can deliver to
                                        from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                        body: "Card verified successfully and added to the customer's account as the default payment method." // TODO mention the next step, 'subscription activate' when its written
                                    }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                        if (!err) {
                                            console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                        } else {
                                            console.error("Could not send sms to " + latestMessage.from + ". Error: \"" + err);
                                        }
                                    });

                                    resultPromise.resolve();
                                  }, function (message) {
                                    console.log("Card verification failed.");
                                    resultPromise.reject(new Parse.Error(Parse.Error.VALIDATION_ERROR,message));
                                  });

                            }
                            break;
                        case "menu":
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Available Commands:\n\n'signup EMAIL_ADDRESS'\n(Sign up a new user)\n\n'add CONTACT-PHONE CONTACT-NAME'\n(Add a contact)\n\n'search NAME'\n(Search for contacts containing a NAME string)\n\n'all'\n(List all contacts)\n\n'edit CONTACT-UID KEY NEW-VALUE'\n(Edit existing contact)\n\n'delete CONTACT-UID'\n(Delete a contact by its UID)"
                            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                            break;
                        case "signup":
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Your sign up attempt was successful, "+resultData.user.get('username')+".\n\nWelcome to AllMyPPL, the textable contact storage service, we store your contacts in the cloud, allowing you to access them by texting, managing and searching them from any phone capable of text messaging.  So when your battery dies, instead of being stranded without a way to contact who matters until you charge, you can access all of your contacts, and search by name for who you need to call, with a single text from anyone\'s phone.  The most utility of our service is found when you don\'t have your phone available, that means authenticating on another\'s device, which might give you pause, our authentication has a lifetime of a single texted command and reply, instead of sessions that have to be explicitly closed or else leaving you vulnerable until its expiration, authentication is required with every texted command, first, your username, second, your password, you will be logged in and the command following PASSWORD will run.  Make note that the sequence expected of text message commands is \'USERNAME PASSWORD command\', the latter being a command selected from the \"Available Commands\" shown when you text in the command \"menu\".\n\nPlease be aware that all commands and keys are case-sensitive (i.e. 'USERNAME PASSWORD menu').\n\nNow, before continuing on, you'll need to verify your email address.  Follow the link in your email to verify the address, it is necessary to ensure a working address for us to contact you before setting up your payment methods or subscriptions and are able to manage or retrieve your contacts by text while your subscription is active, without a subscription you will be able to manage your contacts through the AllMyPPL app, but you will not be able to manage or retrieve your contacts via text without an active subscription.\n\nPlease check your email now, the address on file is " + resultData.user.get('email') +", if this email address is incorrect, please contact support@allmyppl.com and we'll be able to help you change it."
                            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                            break;
                        case "add":
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Contact created for\n" + resultData.result.get("phone") + "\n\"" + resultData.result.get("name") + "\"." // body of the SMS message
                            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                            break;
                        case "all":
                            if (resultData) {
                                for (var index in resultData.results) {
                                    console.log("\nname: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: " + resultData.results[index].id);
                                    twilio.sendMessage({
                                        to: latestMessage.from, // Any number Twilio can deliver to
                                        from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                        body: "name: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: " + resultData.results[index].id // body of the SMS message
                                    }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                        if (!err) {
                                            console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                        } else {
                                            console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                        }
                                    });
                                }
                                if (!resultData || !resultData.results) {
                                    resultPromise.reject(new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE, "There are no contacts to display."));
                                } else {
                                    resultPromise.resolve();
                                }
                            }
                            break;
                        case "search":
                            var count = 0;
                            var searchString = "";
                            for (var index in wordList) {
                                if (index >= 3) {
                                    searchString += wordList[index].toLowerCase();
                                    if (index != wordList.length - 1) {
                                        searchString += " ";
                                    }
                                }
                            }
                            if (resultData) {
                                // perform a startsWith search
                                var wasFound = true;
                                for (var index in resultData.results) {
                                    var nameLowercase = resultData.results[index].get("name")
                                        .toLowerCase();
                                    var searchStringLowercase = searchString.toLowerCase();
                                    for (var i = 0; i < searchStringLowercase.length; i++) {
                                        if (i >= searchStringLowercase.length || nameLowercase[i] != searchStringLowercase[i]) {
                                            wasFound = false;
                                            break;
                                        }
                                    }
                                    if (wasFound) {
                                        count = index + 1;
                                        console.log("\nname: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: " + resultData.results[index].id);
                                        twilio.sendMessage({
                                            to: latestMessage.from, // Any number Twilio can deliver to
                                            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                            body: "name: " + resultData.results[index].get("name") + "\nphone: " + resultData.results[index].get("phone") + "\nuid: " + resultData.results[index].id // body of the SMS message
                                        }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                            if (!err) {
                                                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                            } else {
                                                console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                            }
                                        });
                                    }
                                }
                                if (count == 0 || !resultData || !resultData.results) {
                                    resultPromise.reject(new Parse.Error(Parse.Error.COMMAND_UNAVAILABLE, "There are no contacts to display."));
                                } else {
                                    resultPromise.resolve();
                                }
                            }
                            break;
                        case "delete":
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Contact successfully deleted." // body of the SMS message
                            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                            break;
                        case "edit":
                            console.log("\nname: " + resultData.result.get("name") + "\nphone: " + resultData.result.get("phone") + "\nuid: " + resultData.result.id);
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Contact " + resultData.result.get("phone") + " \"" + resultData.result.get("name") + "\" updated with \"" + latestMessage.body.split(" ")[4] + "\" : \"" + resultData.result.get(latestMessage.body.split(" ")[4]) + '".'
                              }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: \"" + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                            break;
                        case 'support':
                        case 'help':
                        twilio.sendMessage({
                            to: latestMessage.from, // Any number Twilio can deliver to
                            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                            body: AllMyPPL.SUPPORT_SMS_RESPONSE
                        }, function(err, responseData) { //this function is executed when a response is received from Twilio
                            if (!err) {
                                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                            } else {
                                console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                            }
                        });
                        const { AppCache } = require('parse-server/lib/cache');
                        // Get a reference to the MailgunAdapter
                        // NOTE: It's best to do this inside the Parse.Cloud.define(...) method body and not at the top of your file with your other imports. This gives Parse Server time to boot, setup cloud code and the email adapter.
                        const MailgunAdapter = AppCache.get(process.env.APP_ID)['userController']['adapter'];

                        // Invoke the send method with an options object
                        MailgunAdapter.send({
                          templateName: 'supportIncoming',
                          // Optional override of the adapter's fromAddress
                          fromAddress: resultData.user.get('email'),
                          recipient: 'AllMyPPL Incoming Support Messages <inbox@allmyppl.com>',
                          variables: { fromPhone: latestMessage.from, messageBody: latestMessage.body }
                        });

                        // Invoke the send method with an options object
                        MailgunAdapter.send({
                          templateName: 'supportReply',
                          // Optional override of the adapter's fromAddress
                          fromAddress: 'AllMyPPL Support <support@allmyppl.com>',
                          recipient: resultData.user.get('email'),
                          variables: { username: resultData.user.get('username'), messageBody: latestMessage.body }
                        });
                            break;
                        default:
                            twilio.sendMessage({
                                to: latestMessage.from, // Any number Twilio can deliver to
                                from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
                                body: "Available Commands:\n\n'signup EMAIL_ADDRESS'\n(Sign up a new user)\n\n'add CONTACT-PHONE CONTACT-NAME'\n(Add a contact)\n\n'search NAME'\n(Search for contacts containing a NAME string)\n\n'all'\n(List all contacts)\n\n'edit CONTACT-UID KEY NEW-VALUE'\n(Edit existing contact)\n\n'delete CONTACT-UID'\n(Delete a contact by its UID)\n\n'support MESSAGE'\n(Sends a message directly to AllMyPPL Support, this is also available without being signed into an account, just start off your text with 'support' and you'll reach us) "
                            }, function(err, responseData) { //this function is executed when a response is received from Twilio
                                if (!err) {
                                    console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
                                } else {
                                    console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
                                }
                            });
                            resultPromise.resolve();
                    }
                    return resultPromise;
            }).then(function() {
        Parse.User.logOut();
    }, function(error) {
        console.log(stringifiedError);
        stringifiedError = JSON.stringify(error);
        if (error.message) {
          twilio.sendMessage({
            to: latestMessage.from, // Any number Twilio can deliver to
            from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
            body: error.message + "\n\nSMS Command Syntax:\n\n'USERNAME PASSWORD command'\n\n(i.e. 'USERNAME PASSWORD signup EMAIL_ADDRESS')" // body of the SMS message
          }, function(err, responseData) { //this function is executed when a response is received from Twilio
              if (!err) {
                  console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
              } else {
                  console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
              }
          });
      } else {
        twilio.sendMessage({
          to: latestMessage.from, // Any number Twilio can deliver to
          from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
          body: error + "\n\nSMS Command Syntax:\n\n'USERNAME PASSWORD command'\n\n(i.e. 'USERNAME PASSWORD signup EMAIL_ADDRESS')" // body of the SMS message
        }, function(err, responseData) { //this function is executed when a response is received from Twilio
            if (!err) {
                console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
            } else {
                console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + responseData + "\". Error: \"" + err);
            }
        });
      }
    });
});
// There will be a test page available on the /test path of your server url
// Remove this before launching your app
app.get('/test', function(req, res) {
    res.sendFile(path.join(__dirname, '/public/test.html'));
});
var port = process.env.PORT || 1337;
var httpServer = require('http')
    .createServer(app);
httpServer.listen(port, function() {
    console.log('AllMyPPL\'s Parse server is running on port ' + port + '.');
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
