/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */


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

Parse.Cloud.beforeSave("Contact", function(req, res) {
  req.object.set('nameLowercase', req.object.get("name").toLowerCase());
  res.success();
});
