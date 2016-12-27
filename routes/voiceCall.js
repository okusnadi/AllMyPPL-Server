var twilio = require('twilio');

exports.introduction = function(request, response) {
    console.log(JSON.stringify(request.body));

    var phone = request.body.From;
    var input = request.body.Digits;
    var twiml = new twilio.TwimlResponse();

    // helper to append a new "Say" verb with alice voice
    function say(text) {
        twiml.say(text, { voice: 'alice'});
    }

    // respond with the current TwiML content
    function respond() {
        response.type('text/xml');
        response.send(twiml.toString());
    }

    // Find an in-progess survey if one exists, otherwise create one
            if (input) {say("Last entered input, "+input+".");}
            say('Welcome to All My People. Please enter the ten digit phone number of your account.');
            twiml.gather({
                timeout: 15,
                numDigits: 10
            });

        // render TwiML response
        respond();
};
