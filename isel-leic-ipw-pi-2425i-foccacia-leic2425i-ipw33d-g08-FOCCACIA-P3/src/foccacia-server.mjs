// Importing necessary modules
import express from 'express';
import fs from 'fs';
import './focaccia-web-site.mjs'; // Importing the web site module

// Extracting command line arguments
const argv = process.argv.slice(2);

// Checking if the correct number of arguments is provided
if (argv.length !== 1) {
  console.log('Usage: node src/foccacia-server.mjs <config-file>');
  process.exit(1); // Exiting if incorrect number of arguments
}

// Getting the config file path from arguments
const configFile = argv[0];

// Checking if the config file exists
if (!fs.existsSync(configFile)) {
  console.log(`Config file not found: ${configFile}`);
  process.exit(1); // Exiting if config file is not found
}

// Reading and parsing the config file
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));

// Checking if the config file has an apiKey property
if (!config.apiKey) {
  console.log('Config file must have an apiKey property');
  process.exit(1); // Exiting if apiKey is not found in config file
}

// Setting the apiKey in the environment variables
process.env.apiKey = config.apiKey;

// Creating an Express application
const app = express();

// Importing and initializing server configuration
import init from './foccacia-server-config.mjs';
init(app);

// Defining the port number
const PORT = 2024;

// Starting the server and listening on the defined port
app.listen(PORT, serverStarted);

// Callback function to handle server start
function serverStarted(e) {
  if (e) {
    return console.log(
      `Server not started because of the following error: ${e}`
    ); // Logging error if server fails to start
  }
  console.log(`Server started: http://localhost:${PORT}`); // Logging success message
}