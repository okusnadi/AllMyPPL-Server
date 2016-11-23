# AllMyPPL-Server
An example of how you can integrate twilio and parse-server-mailgun, parse, parse-server and express modules with a heroku hosted nodejs server to accomplish an email sending, text messaging interface for managing your contacts.

Follow the instructions at https://devcenter.heroku.com/articles/deploying-a-parse-server-to-heroku to get started and when done set the missing config vars (APP_ID, MASTER_KEY, etc.) at "Heroku Dashboard > Settings > Reveal Config Vars".  I highly recommend downloading parse-dashboard at https://github.com/ParsePlatform/parse-dashboard for managing your database and easily manipulating things like ACL.  Keep in mind that Parse.com is no longer hosting and they have instead released Parse Server open source with several changes to the API, read more at https://github.com/ParsePlatform/parse-server/wiki/Compatibility-with-Hosted-Parse and http://stackoverflow.com/questions/tagged/parse-server.  Hopefully this clears up some of the troubles you might run into trying to integrate Parse Server with Twilio or Mailgun.

Patrick Blaine
11/23/2016
