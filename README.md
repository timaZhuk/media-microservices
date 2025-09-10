# Node.js Microservices with MongoDB, Redis, and RabbitMQ
### This project is a microservices-based backend application built with Node.js and Express.js. 
It demonstrates a robust, scalable, and highly decoupled architecture using a combination of modern technologies 
to handle data persistence, inter-service communication, caching, and file uploads.

🚀 Features
### Microservices Architecture: The application is broken down into small, independent services.

* MongoDB: Primary NoSQL database for each microservice.

* Redis: High-performance in-memory database used for caching and as a store for the rate limiter.

* RabbitMQ: A powerful message broker enabling asynchronous communication between services.

* Cloudinary Integration: For scalable and reliable cloud-based image and file uploads.

* Multer: Middleware for handling multipart/form-data for file uploads.

* Robust Error Handling: Custom error middleware to provide consistent and informative error responses.

* Centralized Logging: Uses the Winston package for structured and configurable logging.

📦 Prerequisites
### Ensure you have the following installed on your system:

Node.js (LTS version)

npm or yarn

Docker and Docker Compose (essential for running the services)

🏁 Getting Started
Follow these steps to set up and run the project locally.

### Clone the repository:

git clone [git@github.com:timaZhuk/media-microservices.git](git@github.com:timaZhuk/media-microservices.git)
cd your-project

### Set up environment variables:
Create a .env file in the project's root directory. This file will contain all the necessary configuration for your services.

# MongoDB
MONGO_URI=mongodb://root:root@mongodb:27017/my-database?authSource=admin

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

Note: Replace the Cloudinary placeholders with your own credentials. This file should be added to .gitignore.

### Start all services with Docker Compose:
This command will spin up the mongodb, redis, and rabbitmq containers.

docker-compose up -d

### Install Node.js dependencies:

npm install

### Run the application:

npm start

Your microservices will now be running, and you can begin sending requests to them.

⚙️ Architecture Explained
## Inter-service Communication
RabbitMQ: RabbitMQ acts as the central message broker. Instead of services communicating directly (e.g., via HTTP calls),
they publish events to specific queues in RabbitMQ. 
Other services that are subscribed to these queues can then consume and process the messages asynchronously. 
This decouples the services, making the system more resilient and scalable.

## Caching and Rate Limiting
Redis: A Redis instance is used for two main purposes:

* Caching: To store frequently accessed data. Before hitting the MongoDB database, a service can check Redis for
  a cached version of the data, significantly reducing response times and database load.

* Rate Limiting: To implement a shared rate limit across all service instances. When a request comes in, a service checks
  Redis to see if the IP address has exceeded the allowed number of requests.

## File Uploads
* Multer & Cloudinary: The file upload process is handled by a dedicated service. Multer first processes the
   **multipart/form-data** request and saves the file to a temporary location on the server. The application then uses the
  Cloudinary SDK to upload this temporary file to the cloud. Once the upload is complete, the local file is deleted, and the returned
  Cloudinary URL and metadata are saved to MongoDB.

## Error Handling & Logging
* Custom Error Middleware: The application uses a custom error handling middleware to catch and format all errors consistently.
  This ensures a predictable JSON response for the client, regardless of the error type.

Winston: The Winston library is integrated across all services for robust logging. It can be configured to log to the console, to files, or to a remote logging service, providing a unified view of the system's behavior.
