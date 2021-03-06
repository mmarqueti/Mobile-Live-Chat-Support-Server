
/**
 * Module dependencies.
 */

var mongoose = require('mongoose');
var _ = require('underscore');

/**
 * Methods
 */

/**
 * Initialize chat when app connects/reconnects
 */

function init(companyKey, deviceId, callback) {

  var Company = mongoose.model('Company');
  Company.load(companyKey, function(err, company) {
    if(err) { 
      return callback(err);  
    }
    if(company == null) { 
      return callback(new Error("Incorrect company public key."));
    }

    var Customer = mongoose.model('Customer');
    Customer.findOne({deviceId: deviceId, company: company._id}, function(err, customer) {
      if(err) { 
        return callback(err); 
      }
      if(customer == null) { 
        console.log('No customer with supplied deviceId found for this company'); 
        initCustomer(deviceId, company, callback);
      } else {
        //Customer already exists so continue with init
        getConversation(customer._id, company, callback);
      }
    });

  });

}

/**
 * Get a conversation given a customerId & company
 * If no existing conversation, a new conversation is created
 */

function getConversation(customerId, company, callback) {

  var Conversation = mongoose.model('Conversation');
  Conversation.load(customerId, company._id, function(err, conversation) {
    if(err) { 
      return callback(err); 
    }
    if(conversation == null) {
      // TODO: Create a new conversation, assign agent & return welcome JSON
      assignAgentToConversation(company, customerId, callback);
    } else {
      callback(null, conversation);
    }
  });

}

/**
 * Get a conversation given a customerId & company
 * If no existing conversation, a new conversation is created
 */

function initCustomer(deviceId, company, callback) {

  // Create new customer
  var Customer = mongoose.model('Customer');
  Customer.create({deviceId : deviceId, company: company._id}, function(err, customer) {
    if(err) { 
      return callback(err); 
    }
    
    assignAgentToConversation(company, customer._id, callback);

  });

}

/**
 * Assign an available agent to a conversation
 * Will also create conversation w/ welcome msg
 */

function assignAgentToConversation(company, customerId, callback) {

  var agent = _.findWhere(company.agents, {available : true});
  if(_.isUndefined(agent)) {
    return callback(new Error("Company has no online agents"));
  }
  
  createConversationWithWelcome(company._id, agent, customerId, callback);

}

/**
 * Create conversation with welcome message
 */

function createConversationWithWelcome(companyId, agent, customerId, callback) {

  //Create welcome message
  var Message = mongoose.model('Message');
  var timestamp = parseInt(new Date().getTime()/1000);
  Message.create({author: "agent", timestamp : timestamp, content: "Hi, how may I help you?"}, function(err, message) {
    if(err) { 
      return callback(err); 
    }

    createConversation(companyId, agent, customerId, message, callback);
  });

}

/**
 * Create a conversation with any passed message
 */

function createConversation(companyId, agent, customerId, message, callback) {

  var Conversation = mongoose.model('Conversation');
  var timestamp = parseInt(new Date().getTime()/1000);
  Conversation.create({company : companyId, agent : agent._id, customer : customerId, messages : [message], timestamp: timestamp, archived: false }
  ,function(err, conversation) {
    if(err) { 
      return callback(err); 
    }
    // Load newly created conversation with all sub-documents
    Conversation.load(customerId, companyId, function(err, conv) {
    if(err) { 
      return callback(err); 
    }
    callback(null, conv);
  });
  });

}

function formatInitResponse(conversation) {

  var response = {
    messageType: 1,
    agentName: conversation.agent.name,
    messages: conversation.messages
  }

  return response;

}

/**
 * Chat Singleton Class
 */

var Chat = {
  init : init,
  formatInitResponse : formatInitResponse
};

module.exports = Chat;
