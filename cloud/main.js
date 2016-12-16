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

Parse.Cloud.beforeSave("Contact", (req, res) => {
  const obj = req.object;
  obj.set('nameLowercase', obj.get("name").toLowerCase());
  res.success();
});

Parse.Cloud.beforeSave(Parse.User, (req, res) => {
  const obj = req.object;
  const user = req.user;

  var emailDirty;
  var usernameDirty;
  for (let key in obj.dirtyKeys()) {if (key == 'email') {emailDirty = true; break;} if (key == 'username') {usernameDirty = true; break;}}

  if (usernameDirty && !obj.get('username') || obj.get('username') == '') {res.error('A username must be provided.');}
  else if (usernameDirty && obj.get('username') != obj.get('username').toLowerCase()) {res.error('A username must consist only of lower case letters.');}
  else if (emailDirty && !user.get('email') || user.get('email') == '' || !validateEmail(user.get('email'))) {res.error('A valid email address must be provided.');}
  else { res.success();}
});
