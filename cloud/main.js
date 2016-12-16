/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */
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
  if (user.username != user.username.toLowerCase()) {res.error('A username must consist only of lower case letters.')}
  else if (obj.get('email') == user.get('email')) {res.error('Attempting to update a user\'s email field with the value it already has is not permitted.');}
  else { res.success();}
});
