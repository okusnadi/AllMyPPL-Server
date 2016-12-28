/* Parse.Object class extension example
// A complex subclass of Parse.Object
var Monster = Parse.Object.extend("Monster", {
  // Instance methods
  hasSuperHumanStrength: function () {
    return this.get("strength") > 18;
  },
  // Instance properties go in an initialize method
  initialize: function (attrs, options) {
    this.sound = "Rawr"
  }
}, {
  // Class methods
  spawn: function(strength) {
    var monster = new Monster();
    monster.set("strength", strength);
    return monster;
  }
});

var monster = Monster.spawn(200);
alert(monster.get('strength'));  // Displays 200.
alert(monster.sound); // Displays Rawr.
*/


 function validateEmail(email) {
     var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
     return re.test(email);
 }

 function validateUsernameIsDigits(username) {
     var re = /^\d+$/;
     return re.test(username);
 }


 /*
  * text({Body:"",To:"",From:""})
  * sends a message via twilio
  */


Parse.Cloud.define('text', (req,res) => {

   const Body = req.params.Body;
   const To = req.params.To;
   const From = req.params.From;
   const accountSid = process.env.TWILIO_ACCOUNT_SID; // Your Account SID from www.twilio.com/console
   const authToken = process.env.TWILIO_AUTH_TOKEN;   // Your Auth Token from www.twilio.com/console

   var twilio = require('twilio');
   var client = new twilio.RestClient(accountSid, authToken);

   if (!req.params.Body || !req.params.To || !req.params.From) { res.error(new Parse.Error(Parse.Error.SCRIPT_ERROR,'When calling, req.params must be {Body:"",To:"",From:""}.')); }
   else {
     client.messages.create({
         body: Body,
         to: To,
         from: From
     }, function(err, message) {
         if(err) { res.error(new Parse.Error(err.code, err.message)); }
         else { res.success("Sent message with Body: '",Body,"', To:'",To,"', From:",From); }
     });
   }

});


/*
 * this beforeSave handler duplicates the name field in a duplicate but lowercase field
 * called nameLowercase, this gives something that can be case-insensitive searched against
 * as Parse doesn't provide a way to query case-insensitive,
 * as its too costly without a prepared field.  Calling res.success() is required.
 */

Parse.Cloud.beforeSave("Contact", (req, res) => {

  const obj = req.object;
  const user = req.user;

  if (!user) {console.log("no req.user");}
  else {console.log("user",user.toJSON());}

  if (!obj) {console.log("no object passed in, aborting..."); res.error(new Parse.Error(Parse.Error.OBJECT_NOT_FOUND,"No req.object found."));}
  else {console.log("beforeSave triggered on Contact ",obj.toJSON()); obj.set('nameLowercase', obj.get("name").toLowerCase()); res.success();}

});

/*
 * this beforeSave handler performs field validation on the email and username fields.
 */


Parse.Cloud.beforeSave(Parse.User, (req, res) => {
  const obj = req.object;
  const user = req.user;

  if (obj.get('email') && !validateEmail(obj.get('email'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"You must use a valid email address."));}
  else if (obj.get('username').length != 10 || !validateUsernameIsDigits(obj.get('username'))) {res.error(new Parse.Error(Parse.Error.VALIDATION_ERROR,"Username must be a ten digit phone number."));}
  else {res.success();}
});
