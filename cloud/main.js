/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

// import stripe module
var stripe = require('stripe')(process.env.STRIPE_API_KEY);
var twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

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

Parse.Cloud.afterSave(Parse.User, function(req) {

    Parse.Promise.as().then(function() {

    var customerCreationPromise = new Parse.Promise();

    if (req.object.get('customerId') === undefined || !req.object.get('customerId') || req.object.get('customerId') === null) {

          stripe.customers.create({
               description: req.object.id,
               plan: "basic-monthly"
          }, function(err, customer) {
               // asynchronously called
               if (err) {
                 if (err.code  && err.message) {
                   console.error("error " + err.code + " : " + err.message);
                 }
                 customerCreationPromise.reject(err);
               } else {
                 customerCreationPromise.resolve(customer);
               }
         });

      }

    return customerCreationPromise;

    }).then(function(customer) {

      // now we have the stripe customer object passed on from the last block
      // store customer.id as 'customerId' on the Parse.user so as to not lose the stripe customer object
      if (!customer || customer == undefined || !customer.id) {
      } else {
          req.object.set('customerId',customer.id);
          return req.object.save(null, { useMasterKey : true });
      }

    }).then(function(user) {

      console.log(user.get('customerId'));

    },function(err){

      console.log(err);

    });
});


Parse.Cloud.beforeSave("Contact", function(req, res) {

  Parse.Promise.as({
    // setup to chain through beforeSave('Contact')
    // will need to make a lowercase copy of name for case insensitive searching
  }).then(function(){

    req.object.set('nameLowercase', req.object.get("name").toLowerCase());

  }).then(function() {

    res.success();

  });

});
