// Import error definitions
import errors from '../commons/errors.mjs';

// Export default function that initializes the Foccacia services with the provided API data
export default function (apiData, fapiData) {
  // Throw an error if apiData is not provided
  if (!apiData) {
    throw new Error('focaccia-data must be provided');
  }

  // Throw an error if fapiData is not provided
  if (!fapiData) {
    throw new Error('fapi-data must be provided');
  }

  // Return an object with various methods for handling service requests
  return {
    getTeamsByName: getTeamsByNameInternal,
    getTeamsDetailed: getTeamsDetailedInternal,
    getLeaguesByTeam: getLeaguesByTeamInternal,
    createUser: createUserInternal,
    getUser: getUserInternal,
    getGroups: changeUserTokenToUserIdArgument(getGroupsInternal),
    updateGroup: changeUserTokenToUserIdArgument(updateGroupInternal),
    createGroup: changeUserTokenToUserIdArgument(createGroupInternal),
    deleteGroup: changeUserTokenToUserIdArgument(deleteGroupInternal),
    getGroupDetails: changeUserTokenToUserIdArgument(getGroupDetailsInternal),
    addTeamToGroup: changeUserTokenToUserIdArgument(addTeamToGroupInternal),
    removeTeamFromGroup: changeUserTokenToUserIdArgument(removeTeamFromGroupInternal),
  };

  // Function to change user token to user ID argument
  function changeUserTokenToUserIdArgument(internalFunction) {
    return function (...args) {
      const userToken = args.pop(); // Extract the user token from the arguments
      return apiData.convertTokenToId(userToken).then((userId) => {
        args.push(userId); // Add the user ID to the arguments
        return internalFunction.apply(this, args); // Call the internal function with the modified arguments
      });
    };
  }

  // Function to parse group ID
  function parseGroupId(groupId) {
    if (apiData.parseGroupId !== undefined) {
      return apiData.parseGroupId(groupId); // Use custom group ID parsing if available
    }

    return Promise.resolve(groupId); // Otherwise, return the group ID as is
  }

  // Function to parse parameters
  function parseParams(params) {
    if (!apiData.parseGroupId) {
      return Promise.resolve(params); // If no custom parsing is needed, return the parameters as is
    }

    for (const key in params) {
      if (params[key] === undefined) {
        return Promise.reject(errors.INVALID_DATA(`${key} must be provided`)); // Reject if any parameter is undefined
      }

      if (isNaN(params[key])) {
        return Promise.reject(errors.INVALID_DATA(`${key} must be a number`)); // Reject if any parameter is not a number
      }

      params[key] = parseInt(params[key]); // Parse the parameter as an integer
    }

    return Promise.resolve(params); // Return the parsed parameters
  }

  // Internal function to get teams by name
  function getTeamsByNameInternal(teamName) {
    return fapiData.getTeams({
      name: teamName, // Call the API to get teams by name
    });
  }

  // Internal function to get detailed information about teams
  function getTeamsDetailedInternal(teamName) {
    return apiData.getTeamsDetailed(teamName); // Call the API to get detailed information about teams
  }

  // Internal function to get leagues by team
  function getLeaguesByTeamInternal(teamId) {
    return fapiData.getLeagues({
      team: teamId, // Call the API to get leagues by team
    });
  }

  // Internal function to create a user
  function createUserInternal(userName) {
    if (!userName) {
      return Promise.reject(errors.INVALID_DATA(`userName must be provided`)); // Reject if username is not provided
    }

    return apiData.createUser(userName); // Call the API to create a user
  }

  // Internal function to get a user
  function getUserInternal(userName) {
    if (!userName) {
      return Promise.reject(errors.INVALID_DATA(`userName must be provided`)); // Reject if username is not provided
    }

    return apiData.getUser(userName); // Call the API to get a user
  }

  // Internal function to get groups
  function getGroupsInternal(userId) {
    return apiData.getGroups(userId); // Call the API to get groups
  }

  // Internal function to create a group
  function createGroupInternal(name, description, userId) {
    if (name && description) {
      return apiData.createGroup(name, description, userId); // Call the API to create a group
    }
    return Promise.reject(
      errors.INVALID_DATA(
        `To create a Group, a name and description must be provided`
      )
    );
  }

  // Internal function to update a group
  function updateGroupInternal(groupId, name, description, userId) {
    return parseGroupId(groupId).then((groupId) => {
      return apiData.getGroup(groupId).then((group) => {
        if (!name || !description)
          return Promise.reject(
            errors.INVALID_DATA(`Both name and description must be provided`)
          );

        if (group.ownerId === userId)
          return apiData.updateGroup(groupId, name, description); // Call the API to update the group

        return Promise.reject(
          errors.NOT_AUTHORIZED(
            `User with id ${userId} does not own group with id ${groupId}`
          )
        );
      });
    });
  }

  // Internal function to delete a group
  function deleteGroupInternal(groupId, userId) {
    return parseGroupId(groupId).then((groupId) => {
      return apiData.getGroup(groupId).then((group) => {
        if (group.ownerId === userId) return apiData.deleteGroup(groupId); // Call the API to delete the group
        return Promise.reject(
          errors.NOT_AUTHORIZED(
            `User with id ${userId} does not own group with id ${groupId}`
          )
        );
      });
    });
  }

  // Internal function to get group details
  function getGroupDetailsInternal(groupId, userId) {
    return parseGroupId(groupId).then((groupId) => {
      return apiData.getGroup(groupId).then((group) => {
        if (group.ownerId === userId) return apiData.getGroupDetails(groupId); // Call the API to get group details
        return Promise.reject(
          errors.NOT_AUTHORIZED(
            `User with id ${userId} does not own group with id ${groupId}`
          )
        );
      });
    });
  }

  // Internal function to add a team to a group
  function addTeamToGroupInternal(groupId, teamId, leagueId, season, userId) {
    return parseParams({ teamId, leagueId, season }).then(
      ({ teamId, leagueId, season }) => {
        return parseGroupId(groupId).then((groupId) => {
          return apiData.getGroup(groupId).then((group) => {
            if (group.ownerId === userId) {
              return apiData.addTeamToGroup(groupId, teamId, leagueId, season); // Call the API to add a team to the group
            }
            return Promise.reject(
              errors.NOT_AUTHORIZED(
                `User with id ${userId} does not own group with id ${groupId}`
              )
            );
          });
        });
      }
    );
  }

  // Internal function to remove a team from a group
  function removeTeamFromGroupInternal(groupId, groupTeamId, userId) {
    if (!groupTeamId) {
      return Promise.reject(
        errors.INVALID_DATA(`groupTeamId must be provided`)
      );
    }

    return parseParams({ groupTeamId }).then(({ groupTeamId }) => {
      return parseGroupId(groupId).then((groupId) => {
        return apiData.getGroup(groupId).then((group) => {
          if (group.ownerId === userId) {
            return apiData.removeTeamFromGroup(groupTeamId, groupId); // Call the API to remove a team from the group
          }
          return Promise.reject(
            errors.NOT_AUTHORIZED(
              `User with id ${userId} does not own group with id ${groupId}`
            )
          );
        });
      });
    });
  }
}