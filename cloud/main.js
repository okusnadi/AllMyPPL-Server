
var client = require('../node_modules/twilio')("AC7c482ac986cafc2940a686f9e1bb45cd","b281cefd4711af6879fa89fcd97bcd9a");

// testTwilio(body:)
Parse.Cloud.define('testTwilio', function(req, res) {
  client.sendMessage({
    to:"+16505878510",
    from:"+16502062610",
    body:req.params.body
  }, function(err,responseData) {
      if (!err) {
        res.success(responseData);
      }
  });
});

// hello()
Parse.Cloud.define('hello', function(req, res) {
  res.success('Hi');
});

// createNewUser(username:, password:, email:, name:, phone:, pin:)
Parse.Cloud.define('createNewUser',function(req,res){

  var user = new Parse.User;
  user.set("username", req.params.username);
  user.set("password", req.params.password);

  // other fields can be set just like with Parse.Object
  user.set("email", req.params.email);
  user.set("name", req.params.name);
  user.set("phone", req.params.phone);
  user.set("pin", req.params.pin);

  user.save(null, {useMasterKey:true}, {
    success: function(user) {
    // Hooray! Let them use the app now.
    res.success("new user added " + user);
    },
    error: function(user, error) {
    // Show the error message somewhere and let the user try again.
    res.error("Error: " + error.code + " " + error.message);
    }
  });

});

// setPIN({pin:, userId:}) --> { userId + " now has a pin of " + pin }
Parse.Cloud.define('setPin',function(req,res){

  var query = new Parse.Query(Parse.User);
  query.equalTo('phone', req.params.phone);
  query.find({ useMasterKey : true }) // pass the session token to find()
   .then(function(users) {
         if (users && users.length == 1) {
           users[0].set("pin",req.params.pin);

           users[0].save(null, {useMasterKey: true})
             .then(function(user) {
             // Hooray! Let them use the app now.
             res.success("new pin " + req.params.pin + " set for user " + user.id);
             },
             function(user, error) {
             // Show the error message somewhere and let the user try again.
             res.error("Error: " + error.code + " " + error.message);
           });
         } else {
           res.error("no user found in database with phone " + req.params.phone);
         }
       }, function(error) {
     res.error("no user found in database with phone " + req.params.phone);
   });

});

// setValueForKeyOnCurrentUser(req.user? || phone?, key:, value:)
Parse.Cloud.define('setValueForKeyOnCurrentUser', function(req,res){

    var query = new Parse.Query(Parse.User);

    var options = {};

    if (req.user) {
      var token = req.user.getSessionToken();
      options = { sessionToken : token };
    } else if (req.params.phone) {
      query.equalTo('phone', req.params.phone);
      options = { useMasterKey : true };
    }

    query.find(options) // pass the session token to find()
    .then(function(users) {
         if (users && users.length == 1) {
           if (req.params.value) {
             users[0].set(req.params.key,req.params.value);

             users[0].save(null, {useMasterKey: true})
               .then(function(user) {
               // Hooray! Let them use the app now.
               res.success("new value " + req.params.value + " set for key " + req.params.key + " on user " + user.id);
               },
               function(user, error) {
               // Show the error message somewhere and let the user try again.
               res.error("Error: " + error.code + " " + error.message);
             });
          } else {
            res.success("No value for value was passed.  No change for user with phone " + req.params.phone || req.user.get('phone'));
          }
         } else {
           res.error("no user found in database with phone " + req.params.phone || req.user.get('phone'));
         }
    }, function(error) {
         res.error("no user found in database with phone " + req.params.phone || req.user.get('phone'));
    });

});

// getAllUsers(phone:)
Parse.Cloud.define('getAllUsers',function(req,res){

  var query = new Parse.Query(Parse.User);
  query.find({ useMasterKey : true }) // pass the session token to find()
   .then(function(users) {
         res.success("list of all users: " + JSON.stringify(users));
       }, function(error) {
     res.error("no user found in database with phone " + req.params.phone);
   });

});

// createContact(name:, phone: userId)
Parse.Cloud.define('createContact',function(req,res){

  var Contact = Parse.Object.extend("Contact");
  var newContact = new Contact();

  // other fields can be set just like with Parse.Object
  newContact.set("name", req.params.name);
  newContact.set("phone", req.params.phone);

  var options = { useMasterKey:true };

  if (req.user) {
    newContact.setACL(new Parse.ACL(req.user));
  } else if (req.params.userId) {
    newContact.set("userId", req.params.userId);
  }

   newContact.save(null, options).then(function(contact) {
     res.success(contact + "contact created");
   }, function(error) {
     res.error(error + "contact failed to create")
   });

});

// updateContact(name?, phone?, userId?) -- ? means optional
Parse.Cloud.define('updateContact',function(req,res){

  var Contact = Parse.Object.extend("Contact");

  var query = new Parse.Query(Contact);

  query.get(req.params.contactId, {
    success: function(contact) {

      if (req.params.name) {
        contact.set("name", req.params.name);
      }

      if (req.params.phone) {
        contact.set("phone", req.params.phone);
      }

      if (req.params.userId) {
        contact.set("userId", req.params.userId);
      }

      contact.save(null, {useMasterKey:true}, {
        success: function(savedContact) {
          res.success(savedContact + "was saved");
        },
        error: function(error) {
          res.error(error);
        }
      });

    },
    error: function(error) {

      res.error("contact get error " + error);

    }

  });

});

// deleteContact(contactId:)
Parse.Cloud.define('deleteContact',function(req,res){

  var Contact = Parse.Object.extend("Contact");

  var query = new Parse.Query(Contact);

  query.get(req.params.contactId, {
    success: function(contact) {
      contact.destroy({
          success: function(myObject) {
            // The object was deleted from the Parse Cloud.
            res.success(myObject+" was deleted");
          },
          error: function(myObject, error) {
            // The delete failed.
            // error is a Parse.Error with an error code and message.
            res.error(myObject+" was not deleted because of error"+error);
          }
        });
    },
    error: function(error) {
      res.error("contact get error " + error);
    }
  });

});

// getUserFromPhone(phone:)
Parse.Cloud.define('getUserFromPhone', function(req, res) {

  var query = new Parse.Query(Parse.User);
  query.equalTo("phone", req.params.phone);  // find all the women
  query.find({useMasterKey:true}, {
    success: function(users) {
      if (users.length == 1) {
        res.success(users[0]);
      } else {
        res.error("user either not found or too many:" + users);
      }
    },
    error: function(error) {
      res.error("user query error " + error);
    }
  });

});

// getUserIdFromPhone(phone:)
Parse.Cloud.define('getUserIdFromPhone', function(req, res) {

  var query = new Parse.Query(Parse.User);
  query.equalTo('phone', req.params.phone);
  query.find({ useMasterKey : true }) // pass the session token to find()
   .then(function(users) {
     if (users) {
       res.success(users[0].id);
     } else {
       res.error("no users found");
     }
      }, function(error) {
     res.error("something went wrong with the user query, error " + console.error());
   });

});

// checkPin(loginNumber:, loginPin:)
Parse.Cloud.define('checkPin', function(req, res) {

  var query = new Parse.Query(Parse.User);
  query.equalTo('phone', req.params.loginNumber);
  query.find({ useMasterKey : true }) // pass the session token to find()
   .then(function(users) {
         if (users && users.length == 1) {
           var userPin = users[0].get("pin");

           if (userPin == req.params.loginPin) {
             res.success(true);
           } else {
             res.success(false);
           }
         } else {
           res.error("no user found in database with phone " + req.params.loginNumber);
         }
       }, function(error) {
     res.error("no user found in database with phone " + req.params.loginNumber);
   });

});

// searchContactsForString(search:, userId:)
Parse.Cloud.define("searchContactsForString", function(request, response) {

  var user = request.user;
  var query = new Parse.Query("Contact");
  var options = {};

  query.contains("name", request.params.search);

  if (request.user) {
    options = { sessionToken : request.user.getSessionToken() };
  } else if (request.params.userId) {
    query.equalTo("userId", request.params.userId);
    options = { useMasterKey:true };
  }

  query.find(options).then(function(results) {
      response.success(results);
  }, function(error) {
      response.error("contact search failed with error" + error);
  });

});

Parse.Cloud.beforeSave("Contact", (req, res) => {
  const obj = req.object;
  console.log('[beforeSave] object: ', obj.toJSON());
  obj.set('nameLowercase', obj.get("name").toLowerCase());
  res.success();
})
