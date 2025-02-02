# Foccacia REST API

## Overview

The Foccacia REST API is a web application designed to manage football teams, leagues, users, and groups. It is built using Node.js and Express on the server side, and it uses Elasticsearch for data storage. The client side is implemented using Handlebars for rendering views.

## Application Structure

### Server

The server-side application is structured as follows:

- **src/**: Contains the main source code for the server.
  - **foccacia-server.mjs**: Entry point for the server application.
  - **foccacia-server-config.mjs**: Configures the Express application, including routes and middleware.
  - **foccacia-web-api.mjs**: Defines the REST API endpoints.
  - **foccacia-web-site.mjs**: Handles the web application routes and views.
  - **foccacia-services.mjs**: Implements the core business logic.
  - **application-to-http-errors.mjs**: Maps application errors to HTTP errors.
  - **errors-to-http-responses.mjs**: Converts application errors to HTTP responses.
  - **public/**: Contains static assets (e.g., JavaScript, CSS).
  - **views/**: Contains Handlebars templates for rendering views.
  - **data/**: Contains modules for data access and storage.
    - **elastic/**: Modules for interacting with Elasticsearch.
    - **memory/**: In-memory data storage for testing purposes.
  - **commons/**: Contains common utilities and error definitions.

### Client

The client-side application is structured as follows:

- **public/**: Contains static assets (e.g., JavaScript, CSS).
- **views/**: Contains Handlebars templates for rendering views.
  - **partials/**: Contains partial templates used in multiple views.

## Data Storage Design

### Elasticsearch Indices

The application uses the following Elasticsearch indices:

- **users**: Stores user documents.
  - **Properties**:
    - `name`: Text, the name of the user.
    - `userToken`: Text, a unique token for the user.
- **groups**: Stores group documents.
  - **Properties**:
    - `name`: Text, the name of the group.
    - `description`: Text, a description of the group.
    - `ownerId`: Text, the ID of the user who owns the group.
- **group_teams**: Stores group team documents.
  - **Properties**:
    - `groupId`: Text, the ID of the group.
    - `teamId`: Text, the ID of the team.
    - `leagueId`: Text, the ID of the league.
    - `season`: Integer, the season year.

### Document Relations

- **User to Group**: A user can own multiple groups (`ownerId` in the `groups` index).
- **Group to GroupTeam**: A group can have multiple teams (`groupId` in the `group_teams` index).

## Mapping Between Elasticsearch Documents and Web Application Objects

- **User**: Maps to documents in the `users` index.
- **Group**: Maps to documents in the `groups` index.
- **GroupTeam**: Maps to documents in the `group_teams` index.

## Server API Documentation

### Teams

- **GET /api/teams**: Retrieve teams by name.
  - Query Parameters:
    - `name`: The name of the team to search for.

### Leagues

- **GET /api/leagues**: Retrieve leagues by team.
  - Query Parameters:
    - `team`: The name of the team to search for leagues.

### Users

- **POST /api/users**: Create a user.

### Groups

- **GET /api/groups**: Retrieve all groups.
- **POST /api/groups**: Create a new group.
  - Request Body:
    - `name`: The name of the group.
    - `description`: The description of the group.
- **PUT /api/groups**: Update an existing group.
  - Request Queries:
    - `groupId`: The ID of the group to update.
  - Request Body:
    - `name`: The new name of the group.
    - `description`: The new description of the group.
- **DELETE /api/groups**: Delete a group.
  - Request Queries:
    - `groupId`: The ID of the group to delete.

### Group Items (Teams)

- **GET /api/groups/:groupId**: Get the details and items of a group.
- **POST /api/groups/:groupId**: Add a team to a group.
  - Request Body:
    - `teamId`: The ID of the team.
    - `leagueId`: The ID of the league for the team.
    - `season`: The year of the season of the league for the team.
- **DELETE /api/groups/:groupId**: Delete a team from a group.
  - Request Queries:
    - `teamId`: The ID of the team.
    - `leagueId`: The ID of the league for the team.
    - `season`: The year of the season of the league for the team.

## Running the Application

### Prerequisites

- Node.js installed on your machine.
- Elasticsearch running on `http://localhost:2024`.

### Steps

1. Clone the repository.
2. Create a configuration file (e.g., `config.json`) with the following content:
   ```json
   {
     "apiKey": "your-api-key"
   }
3. Install the dependencies:
    - `npm install`
4. Install ElasticSearch on this link https://www.elastic.co/guide/en/elasticsearch/reference/current/run-elasticsearch-locally.html (follow the steps as it says on the website)
5. After installing it is necessary to disable database authentication as it is not necessary (it is running locally).
To do this, you need to change the docker-compose.yml file on line 12, replacing true with false.
6. Start the server:
    - `npm start`
7. The server will be running on `http://localhost:2024`.
8. Use the provided HTTP requests in test/foccacia-api-requests.http to test the API endpoints and introduce test data.
9. To introduce test data automatically, follow these steps:
    - Open the test/foccacia-api-requests.http file in your preferred HTTP client (e.g., VS Code REST Client extension, Postman).
    - Execute the requests in the file to create users, groups, and add teams to groups.
10. Verify that the application is running correctly by accessing http://localhost:2024 in your web browser.
11. To run the application with data, ensure that Elasticsearch is running and the necessary indices are created. You can use the provided HTTP requests to populate the indices with test data.
12. The application should be fully functional and ready for use within 5 minutes.

## TESTING APPLICATION

To run the tests, simply execute the following content 
  - `npm run test`

This will run the tests using Mocha, Chai, and Supertest.

# Conclusion 

This document provides a comprehensive overview of the Foccacia REST API, including its structure, data storage design, API documentation, and instructions for running the application. By following the steps outlined above, you should be able to set up and run the application on any machine quickly and efficiently.
