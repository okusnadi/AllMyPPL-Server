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
var express = require('express')();
var bodyParser = require('body-parser');
var ParseServer = require('parse-server')
    .ParseServer;
var Parse = require('parse/node');
var path = require('path');
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
var http = require('http');
var querystring = require('querystring');
var stripe = require('stripe')(process.env.STRIPE_API_KEY);
var databaseUri = process.env.DATABASE_URI || process.env.MONGODB_URI;
if (!databaseUri) {
    console.log('DATABASE_URI not specified, falling back to localhost.');
}
var api = new ParseServer({
    databaseURI: databaseUri,
    cloud: process.env.CLOUD_CODE_MAIN,
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY, //Add your master key here. Keep it secret!
    serverURL: process.env.SERVER_URL, // Don't forget to change to https if needed
    liveQuery: {
        classNames: ["Contact"] // List of classes to support for query subscriptions
    },
    publicServerURL: process.env.SERVER_URL,
    appName: process.env.APP_NAME,
    verifyUserEmails: true,
    emailAdapter: {
        module: 'parse-server-mailgun',
        options: {
            // The address that your emails come from
            fromAddress: process.env.MAILGUN_FROM_ADDRESS,
            // Your domain from mailgun.com
            domain: process.env.MAILGUN_DOMAIN,
            // Your API key from mailgun.com
            apiKey: process.env.MAILGUN_API_KEY,
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
                    subject: 'Custom alert',
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
Parse.initialize(process.env.APP_ID);
Parse.serverURL = process.env.SERVER_URL;

// Client-keys like the javascript key or the .NET key are not necessary with parse-server
// If you wish you require them, you can set them as options in the initialization above:
// javascriptKey, restAPIKey, dotNetKey, clientKey
var app = express();
app.set("view engine", "pug");

// Serve static assets from the /public folder
app.use('/public', express.static(path.join(__dirname, '/public')));
// Serve the Parse API on the /parse URL prefix
var mountPath = process.env.PARSE_MOUNT || '/parse';
app.use(mountPath, api);
// Parse Server plays nicely with the rest of your web routes
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

app.get("/", (req, res) =>
  res.render("index.pug", { keyPublishable : process.env.STRIPE_PUB_KEY }, null));

var port = process.env.PORT || 1337;
var httpServer = require('http')
    .createServer(app);
httpServer.listen(port, function() {
    console.log('AllMyPPL\'s Parse server is running on port ' + port + '.');
});
// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
