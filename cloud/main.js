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

  console.log(obj.username);

  res.success();
});
