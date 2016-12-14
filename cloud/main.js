/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

// import stripe module
var stripe = require('stripe')(process.env.STRIPE_API_KEY || "stripeApiKey");
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID || "twilioAccountSid", process.env.TWILIO_AUTH_TOKEN || "twilioAuthToken");

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

Parse.Cloud.afterSave(Parse.User, (req, res) => {

    obj = req.object;
    console.log('[afterSave] object: ', obj.toJSON());

    Parse.Promise.as().then(function() {
      // setup to chain through beforeSave(Parse.User)
      // create a customer in stripe if the id is blank
      // if everything is good just skip through and save
      // throw out a special warning if the email isn't verified

    if (obj.get('emailVerified')) {  return Parse.Promise.as(true);  }
    else {  return Parse.Promise.as(false);  }

    }).then(function(emailVerified){

      var customerCreationPromise = new Parse.Promise();

      if (emailVerified && !obj.get('customerId')) {

        stripe.customers.create({
            email : obj.get("email"),
            description: obj.id,
            plan: "basic-monthly"
          }, function(err, customer) {
            // asynchronously called
            if (err) {
              console.log("error " + err);
              customerCreationPromise.reject(new Parse.Error(Parse.Error.SCRIPT_FAILED,"AllMyPPL had an internal error when interacting with Stripe, please contact support@allmyppl.com and tell us what you were trying to do and at what time."));
            } else {
              console.log("customer created " + customer);
              customerCreationPromise.resolve(customer);
            }
        });

      } else {
         customerCreationPromise.resolve({});
      }

      return customerCreationPromise;


    }).then(function(customer){

      console.log(JSON.stringify(customer));

      // now we have the stripe customer object passed on from the last block
      // store customer.id as 'customerId' on the Parse.user so as to not lose the stripe customer object

      if (customer && customer.id) {
        obj.save({ customerId : customer.id }, { sessionToken : req.object.getSessionToken()});
      }

      return Parse.Promise.as(customer);

    }).then(function(customer) {

      res.success(JSON.stringify(customer));

    },function(err){

      console.log(err);

      twilio.sendMessage({
          to: "+16505878510", // Any number Twilio can deliver to
          from: AllMyPPL.PHONE_NUMBER, // A number you bought from Twilio and can use for outbound communication
          body: "AllMyPPL had an error:\n\n" + err
      }, function(err, responseData) { //this function is executed when a response is received from Twilio
          if (!err) {
              console.log("Successfully sent sms to " + latestMessage.from + ". Body: " + responseData);
          } else {
              console.error("Could not send sms to " + latestMessage.from + ". Body: \"" + error + "\". Error: \"" + err);
          }
      });

      res.error(err);

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
