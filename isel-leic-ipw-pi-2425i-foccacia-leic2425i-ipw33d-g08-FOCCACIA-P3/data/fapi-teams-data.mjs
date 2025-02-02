// Import error definitions
import errors from '../commons/errors.mjs';

// Memoization function to cache results of API calls
const memoize = (fn) => {
  const memory = new Map(); // Create a new Map to store cached results
  return (...args) => {
    const key = JSON.stringify(args); // Convert arguments to a JSON string to use as a key
    if (!memory.has(key)) {
      memory.set(key, fn(...args)); // Store the result of the function call in the cache
    }
    return memory.get(key); // Return the cached result
  };
};

// Base URL for the football API
const footballApiUrl = 'https://v3.football.api-sports.io';
// Base URL for the FastAPI
const fastapi = 'api-football-v1.p.rapidapi.com';

// Export default function that initializes the FAPI data services
export default function () {
  return {
    getTeamsByName: memoize(getTeamsByNameInternal), // Memoized function to get teams by name
    getLeaguesByTeam: memoize(getLeaguesByTeamInternal), // Memoized function to get leagues by team
    getTeams: memoize(getTeamsInternal), // Memoized function to get teams
    getLeagues: memoize(getLeaguesInternal), // Memoized function to get leagues
  };

  // Internal function to get teams by name
  function getTeamsByNameInternal(teamName) {
    return fetch(`${footballApiUrl}/teams?name=${teamName}`, {
      headers: {
        'x-apisports-key': process.env.apiKey, // API key for authentication
      },
    }).then((rsp) => {
      if (rsp.ok) {
        return rsp.json().then((data) => {
          if (data.response) {
            return data.response; // Return the response data if available
          }
          return Promise.reject(errors.NOT_FOUND(`Team ${teamName} not found`)); // Reject if team is not found
        });
      }

      if (rsp.status === 404) {
        return Promise.reject(errors.NOT_FOUND(`Team ${teamName} not found`)); // Reject if team is not found
      }

      return Promise.reject(errors.INTERNAL_ERROR(`Error fetching teams`)); // Reject if there's an internal error
    });
  }

  // Internal function to get leagues by team
  function getLeaguesByTeamInternal(teamId) {
    return fetch(`${footballApiUrl}/leagues?team=${teamId}`, {
      headers: {
        'x-apisports-key': process.env.apiKey, // API key for authentication
      },
    }).then((rsp) => {
      if (rsp.ok) {
        return rsp.json().then((data) => {
          if (data.response) {
            return data.response; // Return the response data if available
          }
          return Promise.reject(
            errors.NOT_FOUND(`Leagues for team ${teamId} not found`)
          ); // Reject if leagues are not found for the team
        });
      }

      if (rsp.status === 404) {
        return Promise.reject(
          errors.NOT_FOUND(`Leagues for team ${teamId} not found`)
        ); // Reject if leagues are not found for the team
      }

      return Promise.reject(errors.INTERNAL_ERROR(`Error fetching leagues`)); // Reject if there's an internal error
    });
  }

  // Function to convert a selector object to a query string
  function selectorToQuery(selector) {
    return Object.entries(selector)
      .map(([key, value]) => `${key}=${value}`) // Convert each key-value pair to a query parameter
      .join('&'); // Join the parameters with '&'
  }

  // Internal function to get teams based on a selector
  function getTeamsInternal(teamSelector) {
    return fetch(`${footballApiUrl}/teams?${selectorToQuery(teamSelector)}`, {
      headers: {
        'x-apisports-key': process.env.apiKey, // API key for authentication
      },
    }).then((rsp) => {
      if (rsp.ok) {
        return rsp.json().then((data) => {
          if (rsp.status === 204 && data.errors?.bug) {
            return Promise.reject(errors.INTERNAL_ERROR(data.errors.bug)); // Reject if there's an internal error
          }

          if (data.errors?.plan) {
            return Promise.reject(errors.NOT_AUTHORIZED(data.errors.plan)); // Reject if the plan is not authorized
          }

          if (!data.response || data.results === 0) {
            return Promise.reject(errors.NOT_FOUND(`Team not found`)); // Reject if team is not found
          }

          return data.response; // Return the response data
        });
      }

      if (rsp.status === 404) {
        return Promise.reject(errors.NOT_FOUND(`Team not found`)); // Reject if team is not found
      }

      return Promise.reject(errors.INTERNAL_ERROR(`Error fetching team`)); // Reject if there's an internal error
    });
  }

  // Internal function to get leagues based on a selector
  function getLeaguesInternal(leagueSelector) {
    return fetch(
      `${footballApiUrl}/leagues?${selectorToQuery(leagueSelector)}`,
      {
        headers: {
          'x-apisports-key': process.env.apiKey, // API key for authentication
        },
      }
    ).then((rsp) => {
      if (rsp.ok) {
        return rsp.json().then((data) => {
          if (data.response && data.results != 0) {
            return data.response; // Return the response data if available
          }
          return Promise.reject(errors.NOT_FOUND(`League not found`)); // Reject if league is not found
        });
      }

      if (rsp.status === 404) {
        return Promise.reject(errors.NOT_FOUND(`League not found`)); // Reject if league is not found
      }

      return Promise.reject(errors.INTERNAL_ERROR(`Error fetching league`)); // Reject if there's an internal error
    });
  }
}