// Import error codes and error-to-HTTP response mapping functions
import ERROR_CODES from '../commons/errors.mjs';
import errorToHttp from './errors-to-http-responses.mjs';

// Export default function that takes focaccia_services as a parameter
export default function (focaccia_services) {
  // Throw an error if focaccia_services is not provided
  if (!focaccia_services) {
    throw new Error('focaccia_services must be provided');
  }

  // Return an object with various methods for handling requests
  return {
    authenticate,
    handlerError,
    logout,
    loginForm: processRequest(loginForm),
    signupForm: processRequest(signupForm),
    login: processRequest(login),
    signup: processRequest(signup),
    getHome: processRequest(getHome),
    getTeamsByName: processRequest(local_getTeamsByName),
    getLeaguesByTeam: processRequest(local_getLeaguesByTeam),
    getAllGroups: processRequest(local_getAllGroups),
    getGroup: processRequest(local_getGroup),
    updateGroup: processRequest(local_updateGroup),
    createGroup: processRequest(local_createGroup),
    deleteGroup: processRequest(local_deleteGroup),
    addTeamToGroup: processRequest(local_addTeamToGroup),
    addTeamToGroupForm: processRequest(local_addTeamToGroupForm),
    removeTeamFromGroup: processRequest(local_removeTeamFromGroup),
  };

  // Wrapper function to process requests and handle errors
  function processRequest(operation) {
    return function (req, res, next) {
      const opPromise = operation(req, res, next);
      return opPromise.catch(next);
    };
  }

  // Middleware to authenticate requests
  function authenticate(req, res, next) {
    const token = getToken(req);
    if (token) {
      req.token = token;
      next();
    } else {
      next(ERROR_CODES.NOT_AUTHORIZED('Please login first')); // Change to missing token
    }
  }

  // Function to get token from request
  function getToken(req) {
    const auth = req.isAuthenticated();
    if (!auth) {
      return undefined;
    }

    console.log('req.user:', req.session);

    return req.user.token;
  }

  // Render login form
  function loginForm(req, res, next) {
    return Promise.resolve(res.render('login-view.hbs'));
  }

  // Render signup form
  function signupForm(req, res, next) {
    return Promise.resolve(res.render('signup-view.hbs'));
  }

  // Handle login request
  function login(req, res, next) {
    const { username } = req.body;

    if (!username) {
      return Promise.reject(
        ERROR_CODES.INVALID_DATA('username must be provided')
      );
    }

    return focaccia_services.getUser(username).then((user) => {
      return new Promise((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.redirect('/site'));
          }
        });
      });
    });
  }

  // Handle signup request
  function signup(req, res, next) {
    const { username } = req.body;

    if (!username) {
      return Promise.reject(
        ERROR_CODES.INVALID_DATA('username must be provided')
      );
    }

    return focaccia_services.createUser(username).then((user) => {
      return new Promise((resolve, reject) => {
        req.login(user, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve(res.redirect('/site'));
          }
        });
      });
    });
  }

  // Handle logout request
  function logout(req, res, next) {
    return new Promise((resolve, reject) => {
      req.logout((err) => {
        if (err) {
          reject(err);
        } else {
          resolve(res.redirect('/site'));
        }
      });
    });
  }

  // Error handling middleware
  function handlerError(err, req, res, next) {
    console.log('ERROR (site):', err);
    getResponseError(res, err);
  }

  // Convert error to HTTP response and render error view
  function getResponseError(res, err) {
    const responseError = errorToHttp(err);
    res.status(responseError.status);
    return res.render('errors-view.hbs', {
      ...responseError.body,
      path: '/site',
      view: 'home',
    });
  }

  // Render home view
  function getHome(req, res, next) {
    return Promise.resolve(res.render('home-view.hbs', { token: req.token }));
  }

  // Get teams by name and render teams view
  function local_getTeamsByName(req, res, next) {
    const name = req.query.name;

    if (!name) {
      return Promise.resolve(res.render('teams-view.hbs'));
    }

    const teamsPromise = focaccia_services.getTeamsByName(name);
    return teamsPromise.then((teams) =>
      res.render('teams-view.hbs', { teams })
    );
  }

  // Get leagues by team and render leagues view
  function local_getLeaguesByTeam(req, res, next) {
    const teamId = req.query.team;
    const leaguesPromise = focaccia_services.getLeaguesByTeam(teamId);
    return leaguesPromise.then((leagues) =>
      res.render('leagues-view.hbs', { leagues, teamId })
    );
  }

  // Get all groups and render groups view
  function local_getAllGroups(req, res, next) {
    const groupsPromise = focaccia_services.getGroups(req.token);
    return groupsPromise.then((groups) => {
      res.render('groups-view.hbs', { groups, token: req.token });
    });
  }

  // Get group details and render group view
  function local_getGroup(req, res, next) {
    const groupId = req.params.groupId;
    const groupPromise = focaccia_services.getGroupDetails(groupId, req.token);

    return groupPromise.then((group) => {
      res.render('group-view.hbs', { group, token: req.token });
    });
  }

  // Update group and redirect to group view
  function local_updateGroup(req, res, next) {
    const { name, description, groupId } = req.body;
    const updatePromise = focaccia_services.updateGroup(
      groupId,
      name,
      description,
      req.token
    );
    return updatePromise.then(() => res.redirect(`/site/groups/${groupId}`));
  }

  // Create group and redirect to group view
  function local_createGroup(req, res, next) {
    const { name, description } = req.body;
    const createPromise = focaccia_services.createGroup(
      name,
      description,
      req.token
    );
    return createPromise.then((group) =>
      res.redirect(`/site/groups/${group.id}`)
    );
  }

  // Delete group and redirect to groups view
  function local_deleteGroup(req, res, next) {
    const groupId = req.body.groupId;
    const deletePromise = focaccia_services.deleteGroup(groupId, req.token);
    return deletePromise.then(() => res.redirect('/site/groups'));
  }

  // Add team to group and redirect to group view
  function local_addTeamToGroup(req, res, next) {
    const groupId = req.params.groupId;
    const { teamId, leagueId, season } = req.body;
    const addPromise = focaccia_services.addTeamToGroup(
      groupId,
      teamId,
      leagueId,
      season,
      req.token
    );
    return addPromise.then(() => res.redirect(`/site/groups/${groupId}`));
  }

  // Remove team from group and redirect to group view
  function local_removeTeamFromGroup(req, res, next) {
    const { groupTeamId, groupId } = req.body;

    const removePromise = focaccia_services.removeTeamFromGroup(
      groupId,
      groupTeamId,
      req.token
    );
    return removePromise.then(() => res.redirect(`/site/groups/${groupId}`));
  }

  // Render add team to group form
  function local_addTeamToGroupForm(req, res, next) {
    const groupId = req.params.groupId;
    const name = req.query.name;

    if (!name) {
      return Promise.resolve(res.render('add-team-view.hbs'));
    }

    return focaccia_services.getTeamsDetailed(name).then((teams) => {
      console.dir(teams, { depth: null });
      res.render('add-team-view.hbs', { teams, groupId });
    });
  }
}