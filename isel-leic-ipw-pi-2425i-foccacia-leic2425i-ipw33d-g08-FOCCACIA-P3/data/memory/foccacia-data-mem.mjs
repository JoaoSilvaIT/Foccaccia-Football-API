// Import error definitions
import errors from '../../commons/errors.mjs';
// Import FAPI data initialization function
import fapiDataInit from '../../data/fapi-teams-data.mjs';
// Import crypto module for generating UUIDs
import crypto from 'crypto';

// Initialize FAPI data
const fapiData = fapiDataInit();

// Initialize user and group ID counters
let idNextUser = 0;
let idNextGroup = 0;

// User class definition
class User {
  constructor(name, token = crypto.randomUUID()) {
    this.id = ++idNextUser; // Increment and assign user ID
    this.name = name; // Assign user name
    this.userToken = token; // Assign user token
  }
}

// Group class definition
class Group {
  constructor(name, description, userId) {
    this.id = ++idNextGroup; // Increment and assign group ID
    this.name = name; // Assign group name
    this.description = description; // Assign group description
    this.ownerId = userId; // Assign owner ID
  }
}

// GroupTeam class definition
class GroupTeam {
  constructor(groupId, teamId, leagueId, season) {
    this.groupId = groupId; // Assign group ID
    this.teamId = teamId; // Assign team ID
    this.leagueId = leagueId; // Assign league ID
    this.season = season; // Assign season
  }
}

// Predefined users
const USERS = [
  new User('User1', 'c176eafd-25eb-45d3-a8cb-7218f3d63b3b'),
  new User('User2', '3efa8c5d-a9f4-4d71-be2d-8d9347e540c0'),
];

// Predefined groups
const GROUPS = [
  new Group('Group1', 'Description1', 1),
  new Group('Group2', 'Description2', 2),
];

// Predefined group teams
const GROUP_TEAMS = [
  new GroupTeam(1, 1, 1, 2021),
  new GroupTeam(1, 2, 1, 2021),
  new GroupTeam(2, 1, 1, 2021),
];

// Export default function that initializes the Foccacia data services
export default function () {
  return {
    createUser,
    getUser,
    getGroups,
    getGroup,
    createGroup,
    updateGroup,
    deleteGroup,
    getGroupDetails,
    addTeamToGroup,
    removeTeamFromGroup,
    convertTokenToId,
    parseGroupId,
  };

  // Function to parse group ID
  function parseGroupId(groupId) {
    if (!groupId) {
      return Promise.reject(errors.INVALID_DATA(`Group id must be provided`)); // Reject if group ID is not provided
    }

    if (isNaN(groupId)) {
      return Promise.reject(errors.INVALID_DATA(`Group id must be a number`)); // Reject if group ID is not a number
    }

    return Promise.resolve(groupId); // Return the group ID as is
  }

  // Function to create a user
  function createUser(name) {
    const existsUser = USERS.find((u) => u.name === name);

    if (existsUser) {
      return Promise.reject(
        errors.CONFLICT(`User with name ${name} already exists`)
      ); // Reject if user already exists
    }

    const user = new User(name); // Create a new user
    USERS.push(user); // Add the new user to the USERS array
    return Promise.resolve(user); // Return the created user
  }

  // Function to get a user by name
  function getUser(name) {
    const user = USERS.find((u) => u.name === name);
    if (!user) {
      return Promise.reject(
        errors.NOT_FOUND(`User with name ${name} not found`)
      ); // Reject if user is not found
    }

    return Promise.resolve(user); // Return the found user
  }

  // Function to get groups by user ID
  function getGroups(userId) {
    return Promise.resolve(GROUPS.filter((g) => g.ownerId === userId)); // Return groups owned by the user
  }

  // Function to get a group by ID
  function getGroup(groupId) {
    const group = GROUPS.find((g) => g.id === groupId);

    if (group == undefined) {
      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    }

    return Promise.resolve(group); // Return the found group
  }

  // Function to create a group
  function createGroup(name, description, userId) {
    const group = new Group(name, description, userId); // Create a new group
    GROUPS.push(group); // Add the new group to the GROUPS array
    return Promise.resolve(group); // Return the created group
  }

  // Function to update a group
  function updateGroup(groupId, name, description) {
    const group = GROUPS.find((g) => g.id === groupId);
    if (!group) {
      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    }
    if (name) group.name = name; // Update group name if provided
    if (description) group.description = description; // Update group description if provided

    return Promise.resolve(group); // Return the updated group
  }

  // Function to delete a group
  function deleteGroup(groupId) {
    const index = GROUPS.findIndex((g) => g.id === groupId);
    if (index === -1) {
      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    }
    GROUPS.splice(index, 1); // Remove the group from the GROUPS array
    return Promise.resolve(); // Return a resolved promise
  }

  // Function to get group details
  function getGroupDetails(groupId) {
    return getGroup(groupId).then((group) => {
      const teams = GROUP_TEAMS.filter((gt) => gt.groupId === groupId).map(
        (gt) => {
          return fapiData
            .getTeams({
              id: gt.teamId,
              league: gt.leagueId,
              season: gt.season,
            })
            .then(
              ([{ team: { name: teamName }, venue: { name: venueName } }]) => {
                return fapiData
                  .getLeagues({
                    id: gt.leagueId,
                  })
                  .then(
                    ([{ league: { name: leagueName } }]) => {
                      return {
                        team: teamName,
                        venue: venueName,
                        league: leagueName,
                        season: gt.season,
                      };
                    }
                  );
              }
            );
        }
      );

      return Promise.all(teams).then((teams) => {
        return {
          ...group,
          teams,
        };
      });
    });
  }

  // Function to add a team to a group
  function addTeamToGroup(groupId, teamId, leagueId, season) {
    const group = GROUPS.find((g) => g.id === groupId);
    if (!group) {
      return Promise.reject(
        errors.NOT_FOUND(`Group with id ${groupId} not found`)
      ); // Reject if group is not found
    }

    return fapiData
      .getTeams({
        id: teamId,
        league: leagueId,
        season: season,
      })
      .then(() => {
        const team = GROUP_TEAMS.find(
          (gt) =>
            gt.groupId === groupId &&
            gt.teamId === teamId &&
            gt.leagueId === leagueId &&
            gt.season === season
        );

        if (team) {
          return Promise.reject(
            errors.CONFLICT(
              `Team with id ${teamId}, league id ${leagueId} and season ${season} already exists in group with id ${groupId}`
            )
          ); // Reject if team already exists in the group
        }

        const groupTeam = new GroupTeam(groupId, teamId, leagueId, season); // Create a new GroupTeam
        GROUP_TEAMS.push(groupTeam); // Add the new GroupTeam to the GROUP_TEAMS array
        return Promise.resolve(groupTeam); // Return the created GroupTeam
      });
  }

  // Function to remove a team from a group
  function removeTeamFromGroup(groupId, groupTeamId) {
    const index = GROUP_TEAMS.findIndex(
      (gt) => gt.id === groupTeamId && gt.groupId === groupId
    );
    if (index === -1) {
      return Promise.reject(
        errors.NOT_FOUND(
          `Team with id ${teamId}, league id ${leagueId} and season ${season} not found in group with id ${groupId}`
        )
      ); // Reject if team is not found in the group
    }
    GROUP_TEAMS.splice(index, 1); // Remove the team from the GROUP_TEAMS array
    return Promise.resolve(); // Return a resolved promise
  }

  // Function to convert a user token to a user ID
  function convertTokenToId(userToken) {
    const user = USERS.find((u) => u.userToken === userToken);
    if (!user) {
      return Promise.reject(
        errors.NOT_FOUND(`User with token ${userToken} not found`)
      ); // Reject if user is not found
    }
    return Promise.resolve(user.id); // Return the user ID
  }
}