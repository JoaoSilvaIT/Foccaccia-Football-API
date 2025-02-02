/**
 * Configures the express HTTP application (including routes and middlewares)
 */

import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';
import yaml from 'yamljs';
import cors from 'cors';
import path from 'path';
import hbs from 'hbs';
import url from 'url';

// Define the current directory and paths for public, views, and partials
const CURRENT_DIR = url.fileURLToPath(new URL('.', import.meta.url));
const PATH_PUBLIC = path.join(CURRENT_DIR, 'public');
const PATH_VIEWS = path.join(CURRENT_DIR, 'views');
const PATH_PARTIALS = path.join(PATH_VIEWS, 'partials');

// Import initialization functions and middleware
import { foccaciaWebApiInit, extractToken } from './foccacia-web-api.mjs';
import focacciaServicesInit from './foccacia-services.mjs';
import focacciaDataInit from '../data/elastic/foccacia-data-elastic.mjs';
import fapiDataInit from '../data/fapi-teams-data.mjs';
import focacciaSiteInit from './focaccia-web-site.mjs';

// Configure passport to serialize and deserialize user information
passport.serializeUser((userInfo, done) => {
  const user = {
    name: userInfo.name,
    token: userInfo.userToken,
  };
  done(null, user);
});

passport.deserializeUser((userInfo, done) => {
  done(null, userInfo);
});

// Configure session handler
const sessionHandler = session({
  secret: 'focaccia',
  resave: false,
  saveUninitialized: false,
  ttl: 3600,
});

// Export default function to configure the express app
export default function (app) {
  let focacciaAPI = undefined;
  let focacciaSite = undefined;

  try {
    // Initialize data, services, and API
    const focacciaData = focacciaDataInit();
    const fapiData = fapiDataInit();
    const focacciaServices = focacciaServicesInit(focacciaData, fapiData);

    focacciaAPI = foccaciaWebApiInit(focacciaServices);
    focacciaSite = focacciaSiteInit(focacciaServices);
  } catch (error) {
    console.error('Error initializing foccacia services:', error);
  }

  if (focacciaAPI && focacciaSite) {
    // Web Application Resources URIs
    const RESOURCES = {
      TEAMS: '/api/teams',
      TEAM: '/api/teams/:teamName',
      LEAGUES: '/api/leagues',
      USERS: '/api/users',
      GROUPS: '/api/groups',
      GROUP: '/api/groups/:groupId',
    };

    // Serve static files from the public directory
    app.use(express.static(PATH_PUBLIC));

    // Set the views directory and view engine
    app.set('views', PATH_VIEWS);
    app.set('view engine', 'hbs');
    app.set('view cache', false);

    // Register partials for handlebars
    hbs.registerPartials(PATH_PARTIALS);

    // Load and serve the Swagger API documentation
    const swaggerDocument = yaml.load('./docs/foccacia-api-spec.yaml');
    app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    // Enable CORS
    app.use(cors());

    // Parse JSON and URL-encoded data
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Use session and passport middlewares
    app.use(sessionHandler);
    app.use(passport.session());
    app.use(cookieParser());

    // Middleware to extract token from request
    app.use(RESOURCES.GROUP, extractToken);
    app.use(RESOURCES.GROUPS, extractToken);

    // Web Application Routes
    app.get(RESOURCES.TEAMS, focacciaAPI.getTeamsByName);
    app.get(RESOURCES.TEAM, focacciaAPI.getTeamDetailed);
    app.get(RESOURCES.LEAGUES, focacciaAPI.getLeaguesByTeam);
    app.post(RESOURCES.USERS, focacciaAPI.createUser);
    app.get(RESOURCES.GROUPS, focacciaAPI.getGroups);
    app.post(RESOURCES.GROUPS, focacciaAPI.createGroup);
    app.put(RESOURCES.GROUPS, focacciaAPI.updateGroup);
    app.delete(RESOURCES.GROUPS, focacciaAPI.deleteGroup);
    app.get(RESOURCES.GROUP, focacciaAPI.getGroupDetails);
    app.post(RESOURCES.GROUP, focacciaAPI.addTeamToGroup);
    app.delete(RESOURCES.GROUP, focacciaAPI.removeTeamFromGroup);

    // Middleware to set user information in response locals
    app.use('/site*', (req, res, next) => {
      if (req.user) res.locals.user = req.user;
      next();
    });

    // Middleware to authenticate requests for site groups
    app.use('/site/groups*', focacciaSite.authenticate);

    // Define routes for the site
    app.get('/site', focacciaSite.getHome);
    app.get('/site/login', focacciaSite.loginForm);
    app.post('/site/login', focacciaSite.login);
    app.get('/site/signup', focacciaSite.signupForm);
    app.post('/site/signup', focacciaSite.signup);
    app.get('/site/logout', focacciaSite.logout);
    app.get('/site/teams', focacciaSite.getTeamsByName);
    app.get('/site/leagues', focacciaSite.getLeaguesByTeam);
    app.get('/site/groups', focacciaSite.getAllGroups);
    app.post('/site/groups', focacciaSite.createGroup);
    app.post('/site/groups/update', focacciaSite.updateGroup);
    app.post('/site/groups/delete', focacciaSite.deleteGroup);
    app.get('/site/groups/:groupId', focacciaSite.getGroup);
    app.get('/site/groups/:groupId/addTeam', focacciaSite.addTeamToGroupForm);
    app.post('/site/groups/:groupId/addTeam/', focacciaSite.addTeamToGroup);
    app.post('/site/groups/removeTeam', focacciaSite.removeTeamFromGroup);

    // Error handling middleware for site routes
    app.use('/site*', focacciaSite.handlerError);

    console.log('Server-config loaded');
  }
}