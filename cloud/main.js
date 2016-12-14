/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */


var stripe = require('stripe')(process.env.STRIPE_API_KEY || "stripeApiKey");

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

  }).then(function(){
    var customerCreationPromise = new Parse.Promise();

    if (!obj.get("customerId")) {
      stripe.customers.create({
          email : obj.get("email")
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
    }

    return customerCreationPromise;

  }).then(function(customer){
    // set the customerId on the user so as to not lose the stripe customer object
    console.log(JSON.stringify(customer));

    obj.set("customerId",customer.id);

  }).then(function() {

    res.success();

  },function(err){

    console.log("error " + err);

    res.error(err);

  });

});
