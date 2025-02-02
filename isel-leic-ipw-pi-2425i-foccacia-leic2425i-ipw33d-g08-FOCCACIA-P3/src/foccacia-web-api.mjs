// Import error mapping function
import errorsMapping from './application-to-http-errors.mjs';

// Initialize the Foccacia Web API with the provided services
export function foccaciaWebApiInit(foccaciaServices) {
  // Throw an error if foccaciaServices is not provided
  if (!foccaciaServices) {
    throw new Error('foccaciaServices must be provided');
  }

  // Return an object with various methods for handling API requests
  return {
    getTeamsByName: createHandler(internalGetTeamsByName),
    getLeaguesByTeam: createHandler(internalGetLeaguesByTeam),
    createGroup: createHandler(internalCreateGroup),
    updateGroup: createHandler(internalUpdateGroup),
    getGroups: createHandler(internalGetGroups),
    deleteGroup: createHandler(internalDeleteGroup),
    getGroupDetails: createHandler(internalGetGroupDetails),
    addTeamToGroup: createHandler(internalAddTeamToGroup),
    removeTeamFromGroup: createHandler(internalRemoveTeamFromGroup),
    createUser: createHandler(internalCreateUser),
    getTeamDetailed: createHandler(internalGetTeamDetailed),
  };

  // Internal function to get teams by name
  function internalGetTeamsByName(req, rsp) {
    return foccaciaServices
      .getTeamsByName(req.query.name) // Call service to get teams by name
      .then((teams) => rsp.json(teams)); // Respond with the teams in JSON format
  }

  // Internal function to get leagues by team
  function internalGetLeaguesByTeam(req, rsp) {
    return foccaciaServices
      .getLeaguesByTeam(req.query.team) // Call service to get leagues by team
      .then((leagues) => rsp.json(leagues)); // Respond with the leagues in JSON format
  }

  // Internal function to create a group
  function internalCreateGroup(req, rsp) {
    return foccaciaServices
      .createGroup(req.body.name, req.body.description, req.token) // Call service to create a group
      .then((group) => rsp.status(201).json(group)); // Respond with the created group in JSON format and status 201
  }

  // Internal function to update a group
  function internalUpdateGroup(req, rsp) {
    return foccaciaServices
      .updateGroup(
        req.query['groupId'], // Group ID from query parameters
        req.body.name, // New group name from request body
        req.body.description, // New group description from request body
        req.token // Token from request
      )
      .then((group) => rsp.json(group)); // Respond with the updated group in JSON format
  }

  // Internal function to get all groups
  function internalGetGroups(req, rsp) {
    return foccaciaServices
      .getGroups(req.token) // Call service to get all groups
      .then((groups) => rsp.json(groups)); // Respond with the groups in JSON format
  }

  // Internal function to delete a group
  function internalDeleteGroup(req, rsp) {
    return foccaciaServices
      .deleteGroup(req.query['groupId'], req.token) // Call service to delete a group
      .then(() => rsp.status(204).send()); // Respond with status 204 (No Content)
  }

  // Internal function to get group details
  function internalGetGroupDetails(req, rsp) {
    return foccaciaServices
      .getGroupDetails(req.params.groupId, req.token) // Call service to get group details
      .then((group) => rsp.json(group)); // Respond with the group details in JSON format
  }

  // Internal function to add a team to a group
  function internalAddTeamToGroup(req, rsp) {
    return foccaciaServices
      .addTeamToGroup(
        req.params.groupId, // Group ID from URL parameters
        req.body.teamId, // Team ID from request body
        req.body.leagueId, // League ID from request body
        req.body.season, // Season from request body
        req.token // Token from request
      )
      .then((team) => rsp.status(201).json(team)); // Respond with the added team in JSON format and status 201
  }

  // Internal function to remove a team from a group
  function internalRemoveTeamFromGroup(req, rsp) {
    return foccaciaServices
      .removeTeamFromGroup(
        req.params.groupId, // Group ID from URL parameters
        req.query['teamId'], // Team ID from query parameters
        req.query['leagueId'], // League ID from query parameters
        req.query['season'], // Season from query parameters
        req.token // Token from request
      )
      .then(() => rsp.status(204).send()); // Respond with status 204 (No Content)
  }

  // Internal function to create a user
  function internalCreateUser(req, rsp) {
    return foccaciaServices
      .createUser(req.body.username) // Call service to create a user
      .then((user) => rsp.status(201).json(user)); // Respond with the created user in JSON format and status 201
  }

  // Internal function to get detailed information about a team
  function internalGetTeamDetailed(req, rsp) {
    return foccaciaServices
      .getTeamDetailed(req.params.teamName) // Call service to get detailed information about a team
      .then((team) => rsp.json(team)); // Respond with the team details in JSON format
  }

  // Create a handler for the specific function
  function createHandler(specificFunction) {
    return function (req, rsp, next) {
      const promiseResult = specificFunction(req, rsp); // Call the specific function

      promiseResult.catch((error) => sendError(rsp, error)); // Handle any errors
    };
  }

  // Send an error response
  function sendError(rsp, appError) {
    console.error(appError); // Log the error
    const httpError = errorsMapping(appError); // Map the application error to an HTTP error
    rsp.status(httpError.status).json(httpError.body); // Respond with the HTTP error status and body
  }
}

// Middleware to extract token from the request headers
export function extractToken(req, res, next) {
  const token = req.headers['authorization']; // Get the authorization header
  if (token) {
    req.token = token.split(' ')[1]; // Extract the token part
    next(); // Proceed to the next middleware
  } else {
    res.status(401).send('Token not provided'); // Respond with status 401 if token is not provided
  }
}