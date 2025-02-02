// Import error definitions and error codes
import errors, { ERROR_CODES } from '../../commons/errors.mjs';
// Import FAPI data initialization function
import fapiDataInit from '../fapi-teams-data.mjs';
// Import fetchElastic function for interacting with Elasticsearch
import { fetchElastic } from './fetch-elastic.mjs';
// Import crypto module for generating UUIDs
import crypto from 'crypto';

// Initialize FAPI data
const fapiData = fapiDataInit();

// Export default function that initializes the Foccacia data services
export default function () {
  // Create users index in Elasticsearch with mappings
  fetchElastic('PUT', '/users', {
    mappings: {
      properties: {
        name: { type: 'text' },
        userToken: { type: 'text' },
      },
    },
  }).then((resp) => {
    if (resp.error && resp.error.type !== 'resource_already_exists_exception') {
      console.log('Error creating users index:', resp.error);
    }
  });

  // Create groups index in Elasticsearch with mappings
  fetchElastic('PUT', '/groups', {
    mappings: {
      properties: {
        name: { type: 'text' },
        description: { type: 'text' },
        ownerId: { type: 'text' },
      },
    },
  }).then((resp) => {
    if (resp.error && resp.error.type !== 'resource_already_exists_exception') {
      console.log('Error creating groups index:', resp.error);
    }
  });

  // Create group_teams index in Elasticsearch with mappings
  fetchElastic('PUT', '/group_teams', {
    mappings: {
      properties: {
        groupId: { type: 'text' },
        teamId: { type: 'text' },
        leagueId: { type: 'text' },
        season: { type: 'integer' },
      },
    },
  }).then((resp) => {
    if (resp.error && resp.error.type !== 'resource_already_exists_exception') {
      console.log('Error creating group_teams index:', resp.error);
    }
  });

  // Return an object with various methods for handling service requests
  return {
    createUser,
    getUser,
    getGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupTeams,
    getGroupDetails,
    addTeamToGroup,
    removeTeamFromGroup,
    convertTokenToId,
    getTeamsDetailed,
  };

  // Function to get detailed information about teams
  function getTeamsDetailed(name) {
    return fapiData.getTeamsByName(name).then((teams) => {
      return Promise.all(
        teams.map((data) => {
          return fapiData.getLeaguesByTeam(data.team.id).then((leagues) => {
            return {
              id: data.team.id,
              name: data.team.name,
              logo: data.team.logo,
              venue: data.venue.name,
              leagues: leagues.map((league) => {
                return {
                  id: league.league.id,
                  name: league.league.name,
                  seasons: league.seasons,
                };
              }),
            };
          });
        })
      );
    });
  }

  // Function to convert an Elasticsearch group document to a group object
  function aGroupFromElastic(elasticGroup) {
    let group = Object.assign({ id: elasticGroup._id }, elasticGroup._source);
    return Promise.resolve(group);
  }

  // Function to convert an Elasticsearch group team document to a group team object
  function aGroupTeamFromElastic(elasticGroupTeam) {
    let groupTeam = Object.assign(
      { id: elasticGroupTeam._id },
      elasticGroupTeam._source
    );
    return Promise.resolve(groupTeam);
  }

  // Function to convert an Elasticsearch user document to a user object
  function aUserFromElastic(elasticUser) {
    let user = Object.assign({ id: elasticUser._id }, elasticUser._source);
    return Promise.resolve(user);
  }

  // Function to create a user
  function createUser(name) {
    const userToken = crypto.randomUUID(); // Generate a new user token

    return getUser(name)
      .then(() => {
        return Promise.reject(
          errors.CONFLICT(`User with name ${name} already exists`)
        ); // Reject if user already exists
      })
      .catch((err) => {
        if (err.code === ERROR_CODES.NotFound) {
          return fetchElastic('POST', '/users/_doc', { name, userToken }).then(
            (result) => {
              return aUserFromElastic({
                _source: { name, userToken },
                ...result,
              });
            }
          );
        }

        return Promise.reject(err); // Reject with the original error if it's not a NotFound error
      });
  }

  // Function to get a user by name
  function getUser(name) {
    const filter = {
      query: {
        match: {
          name: name,
        },
      },
    };

    return fetchElastic('POST', `/users/_search`, filter).then(
      (elasticUser) => {
        if (elasticUser.error) {
          return Promise.reject(errors.INTERNAL_ERROR(elasticUser.error)); // Reject if there's an internal error
        }

        if (elasticUser.hits.total.value === 0) {
          return Promise.reject(
            errors.NOT_FOUND(`User with name ${name} not found`)
          ); // Reject if user is not found
        }

        return aUserFromElastic(elasticUser.hits.hits[0]); // Return the found user
      }
    );
  }

  // Function to get groups by user ID
  function getGroups(userId) {
    const filter = {
      query: {
        match: {
          ownerId: userId,
        },
      },
    };

    return fetchElastic('POST', '/groups/_search', filter)
      .then((resp) => {
        if (resp.error) {
          return Promise.reject(errors.INTERNAL_ERROR(resp.error)); // Reject if there's an internal error
        }

        return resp.hits.hits;
      })
      .then((groups) => Promise.all(groups.map(aGroupFromElastic))); // Return the found groups
  }

  // Function to get a group by ID
  function getGroup(groupId) {
    return fetchElastic('GET', `/groups/_doc/${groupId}`).then(
      (elasticGroup) => {
        if (elasticGroup.found) {
          return aGroupFromElastic(elasticGroup); // Return the found group
        }

        return Promise.reject(errors.NOT_FOUND(elasticGroup)); // Reject if group is not found
      }
    );
  }

  // Function to create a group
  function createGroup(name, description, userId) {
    return fetchElastic('POST', '/groups/_doc', {
      name,
      description,
      ownerId: userId,
    }).then((result) =>
      aGroupFromElastic({
        _source: { name, description, ownerId: userId },
        ...result,
      })
    );
  }

  // Function to update a group
  function updateGroup(groupId, name, description) {
    return fetchElastic('POST', `/groups/_update/${groupId}`, {
      doc: {
        name,
        description,
      },
    }).then((result) => {
      if (result.result === 'updated') {
        return aGroupFromElastic({ _source: { name, description }, ...result }); // Return the updated group
      }

      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    });
  }

  // Function to delete a group
  function deleteGroup(groupId) {
    return fetchElastic(
      'DELETE',
      `/groups/_doc/${groupId}?refresh=wait_for`
    ).then((body) => {
      if (body.result != 'not_found') {
        return Promise.resolve(); // Return a resolved promise if group is deleted
      }

      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    });
  }

  // Function to get group teams by group ID
  function getGroupTeams(groupId) {
    const filter = {
      query: {
        match: {
          groupId: groupId,
        },
      },
    };

    return fetchElastic('POST', '/group_teams/_search', filter)
      .then((resp) => {
        if (resp.error) {
          return Promise.reject(errors.INTERNAL_ERROR(resp.error)); // Reject if there's an internal error
        }

        return resp.hits.hits;
      })
      .then((groupTeams) => Promise.all(groupTeams.map(aGroupTeamFromElastic))); // Return the found group teams
  }

  // Function to get group details by group ID
  function getGroupDetails(groupId) {
    return getGroup(groupId).then((group) => {
      return getGroupTeams(groupId).then((groupTeams) => {
        const teams = groupTeams.map((gt) => {
          return fapiData
            .getTeams({
              id: gt.teamId,
              league: gt.leagueId,
              season: gt.season,
            })
            .then(
              ([
                {
                  team: { name: teamName },
                  venue: { name: venueName },
                },
              ]) => {
                return fapiData
                  .getLeagues({
                    id: gt.leagueId,
                  })
                  .then(
                    ([
                      {
                        league: { name: leagueName },
                      },
                    ]) => {
                      return {
                        id: gt.id,
                        team: teamName,
                        venue: venueName,
                        league: leagueName,
                        season: gt.season,
                      };
                    }
                  );
              }
            );
        });

        return Promise.all(teams).then((teams) => {
          return {
            ...group,
            teams,
          };
        });
      });
    });
  }

  // Function to add a team to a group
  function addTeamToGroup(groupId, teamId, leagueId, season) {
    return getGroup(groupId)
      .then(() => {
        return fapiData.getTeams({
          id: teamId,
          league: leagueId,
          season: season,
        });
      })
      .then(() => {
        return fetchElastic('POST', '/group_teams/_search', {
          query: {
            bool: {
              must: [
                { match: { groupId: groupId } },
                { match: { teamId: teamId } },
                { match: { leagueId: leagueId } },
                { match: { season: season } },
              ],
            },
          },
        });
      })
      .then((team) => {
        if (team.hits.total.value > 0) {
          return Promise.reject(
            errors.CONFLICT(
              `Team with id ${teamId}, league id ${leagueId} and season ${season} already exists in group with id ${groupId}`
            )
          ); // Reject if team already exists in the group
        }

        return fetchElastic('POST', '/group_teams/_doc?refresh=wait_for', {
          groupId,
          teamId,
          leagueId,
          season,
        }).then((result) =>
          aGroupTeamFromElastic({
            _source: { groupId, teamId, leagueId, season },
            ...result,
          })
        );
      });
  }

  // Function to remove a team from a group
  function removeTeamFromGroup(groupTeamId, groupId) {
    return fetchElastic('POST', '/group_teams/_search', {
      query: {
        match: {
          _id: groupTeamId,
        },
      },
    })
      .then((team) => {
        if (team.hits.total.value === 0) {
          return Promise.reject(
            errors.NOT_FOUND(
              `Team with id ${groupTeamId} not found in group with id ${groupId}`
            )
          ); // Reject if team is not found in the group
        }

        return fetchElastic(
          'DELETE',
          `/group_teams/_doc/${team.hits.hits[0]._id}?refresh=wait_for`
        );
      })
      .then(() => {
        return Promise.resolve(); // Return a resolved promise if team is removed
      });
  }

  // Function to convert a user token to a user ID
  function convertTokenToId(userToken) {
    return fetchElastic('POST', `/users/_search`, {
      query: {
        match: {
          userToken: userToken,
        },
      },
    }).then((resp) => {
      if (resp.error) {
        return Promise.reject(errors.INTERNAL_ERROR(resp.error)); // Reject if there's an internal error
      }

      if (resp.hits.total.value === 0) {
        return Promise.reject(
          errors.NOT_FOUND(`User with token ${userToken} not found`)
        ); // Reject if user is not found
      }

      return Promise.resolve(resp.hits.hits[0]._id); // Return the user ID
    });
  }
}