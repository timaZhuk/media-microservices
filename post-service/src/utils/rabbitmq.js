const amqp = require("amqplib");
const logger = require("./logger.js");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

//needs to send messages to other parts of an application
async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to rabbitmq");
  } catch (error) {
    logger.error("Error connection to RabbitMQ: ", error);
  }
}

//----publishing events--------------
async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    //This prepares the message payload for transmission.
    // RabbitMQ messages are sent as raw binary data
    // Converts the JSON string into a binary Buffer object
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
}

//----
module.exports = { connectToRabbitMQ, publishEvent };
