/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

 function validateEmail(email) {
     var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     return re.test(email);
 }

 function validateUsername(username) {
   return (validateUsernameIsDigits(username) && username.length == 10);
 }

 function validateUsernameIsDigits(username) {
     var re = /^\d+$/;
     return re.test(username);
 }

Parse.Cloud.beforeSave("Contact", (req, res) => {
  const obj = req.object;
  obj.set('nameLowercase', obj.get("name").toLowerCase());
  res.success();
});

Parse.Cloud.beforeSave(Parse.User, (req, res) => {
  const obj = req.object;
  const user = req.user;

  if (obj.get('email') && !validateEmail(obj.get('email'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"You must use a valid email address."));}
  else if (!validateUsername(obj.get('username'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"Usernames must consist of only numbers and be 10 digits in length."));}
  else {res.success();}
});
