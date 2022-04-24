var mongoose = require('mongoose');

//Define a schema
var Schema = mongoose.Schema;

var PostModelSchema = new Schema({
  username: String,
  contentURI: String
});
module.exports.PostModel = mongoose.model('PostModel', PostModelSchema );
