// Define the base URI for Elasticsearch
const URI_PREFIX = 'http://localhost:9200';

// Function to perform a fetch request to Elasticsearch
export function fetchElastic(method, path, body = undefined) {
  // Define the options for the fetch request
  const options = {
    method: method, // HTTP method (GET, POST, PUT, DELETE, etc.)
    headers: {
      'Content-Type': 'application/json', // Set the content type to JSON
    },
    body: JSON.stringify(body), // Convert the body to a JSON string
  };

  // Perform the fetch request and return the response as JSON
  return fetch(URI_PREFIX + path, options).then((response) => response.json());
}