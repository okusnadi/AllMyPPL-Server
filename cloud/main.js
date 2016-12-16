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
  console.log('[beforeSave] object: ', obj.toJSON());
  obj.set('nameLowercase', obj.get("name").toLowerCase());
  res.success();
});

Parse.Cloud.beforeSave(Parse.User, (req, res) => {
  const obj = req.object;
  const user = req.user;
  console.log('[beforeSave] object: ', obj.toJSON());
  console.log('user object; ',obj.toJSON());
  console.log('user dirty keys: ',user.dirtyKeys());

  var emailDirty;
  var usernameDirty;
  for (let key in user.dirtyKeys()) {if (key == 'email') {emailDirty = true; break;} if (key == 'username') {usernameDirty = true; break;}}

  if (usernameDirty && !user.get('username') || user.get('username') == '') {res.error('A username must be provided.');}
  else if (usernameDirty && user.get('username') != user.get('username').toLowerCase()) {res.error('A username must consist only of lower case letters.');}
  else if (emailDirty && !user.get('email') || user.get('email') == '' || !validateEmail(user.get('email'))) {res.error('A valid email address must be provided.');}
  else if (emailDirty && user.get('email') == obj.get('email')) {res.error('Attempting to update a user\'s email address with the value it already has is not permitted.');}
  else { res.success();}
});
