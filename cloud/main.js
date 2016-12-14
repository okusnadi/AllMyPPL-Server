/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

// import stripe module
var stripe = require('stripe')(process.env.STRIPE_API_KEY || "stripeApiKey");
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID || "twilioAccountSid", process.env.TWILIO_AUTH_TOKEN || "twilioAuthToken");

// import AllMyPPL
// setup AllMyPPL
var AllMyPPL = new Object();
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

/*
switch (err.type) {
  case 'StripeCardError':
    // A declined card error
    err.message; // => e.g. "Your card's expiration year is invalid."
    break;
  case 'RateLimitError':
    // Too many requests made to the API too quickly
    break;
  case 'StripeInvalidRequestError':
    // Invalid parameters were supplied to Stripe's API
    break;
  case 'StripeAPIError':
    // An error occurred internally with Stripe's API
    break;
  case 'StripeConnectionError':
    // Some kind of error occurred during the HTTPS communication
    break;
  case 'StripeAuthenticationError':
    // You probably used an incorrect API key
    break;
  default:
    // Handle any other types of unexpected errors
    break;
}
*/

Parse.Cloud.afterSave(Parse.User, (req) => {

    var obj = req.object;

    Parse.Promise.as().then(function() {
      // setup to chain through beforeSave(Parse.User)
      // create a customer in stripe if the id is blank
      // if everything is good just skip through and save
      // throw out a special warning if the email isn't verified

    if (obj.get('emailVerified')) {  return Parse.Promise.as(true);  }
    else {  return Parse.Promise.as(false);  }

    }).then(function(emailVerified){

        var customerCreationPromise = new Parse.Promise();

        if (emailVerified) {

         if (obj.get('customerId') && obj.get('customerId').length > 0) {

          console.log("emailVerified, customerId");

          stripe.customers.retrieve(obj.get('customerId'),
          function(err, customer) {
          // asynchronously called
            if (err) {
              console.log("error " + err);
              customerCreationPromise.reject(AllMyPPL.STRIPE_ERROR_MESSAGE);
            } else {
              console.log("customer received " + JSON.stringify(customer));
              customerCreationPromise.resolve(customer);
            }
          });

          } else if (!obj.get('customerId')) {

            console.log("emailVerified, !customerId");

            stripe.customers.create({
                email : obj.get("email"),
                description: obj.get("username"),
                plan: "basic-monthly"
              }, function(err, customer) {
                // asynchronously called
                if (err) {
                  console.log("error " + err);
                  customerCreationPromise.reject(AllMyPPL.STRIPE_ERROR_MESSAGE);
                } else {
                  console.log("customer created " + JSON.stringify(customer));
                  customerCreationPromise.resolve(customer);
                }
              });
            }
          } else {
            console.log("!emailVerified");
            customerCreationPromise.resolve("Please verify your email before preceding.");
          }

          return customerCreationPromise;

    }).then(function(customer) {

      console.log(JSON.stringify(customer));
      // now we have the stripe customer object passed on from the last block
      // store customer.id as 'customerId' on the Parse.user so as to not lose the stripe customer object

      if (customer && customer.id) {

          obj.set("customerId", customer.id);

          return obj.save(null, { useMasterKey : true });

          /*if (obj.get('email') != customer.email || obj.get('username') != customer.description) {
            stripe.customers.update(customer.id, {
            }, function(err, customer) {
              // asynchronously called
              if (err) {
                console.log("error " + err);
                return Parse.Promise.error(AllMyPPL.STRIPE_ERROR_MESSAGE);

              } else {
                console.log("customer updated " + JSON.stringify(customer));
                return Parse.Promise.as(customer);
              }
            });
          } else {
            return Parse.Promise.as(customer);
          }*/

        } else {
          return Parse.Promise.as(customer);
        }

    }).then(function(customer) {

      console.log(customer);

    },function(err){

      console.log(err);

    });
});


Parse.Cloud.beforeSave("Contact", (req, res) => {
  const obj = req.object;
  console.log('[beforeSave] object: ', obj.toJSON());

  Parse.Promise.as({
    // setup to chain through beforeSave('Contact')
    // will need to make a lowercase copy of name
    // and create a customer in stripe if the id is blank
  }).then(function(){
    // copy name field to
    obj.set('nameLowercase', obj.get("name").toLowerCase());

  }).then(function() {

    res.success();

  },function(err){

    console.log("error " + err);

    res.error(err);

  });

});
