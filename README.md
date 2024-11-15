## OnDemand/Passenger: Flask example app

This is a [Flask](http://flask.pocoo.org/) app for [the Passenger application server](https://www.phusionpassenger.com/) that has been modified to work with [OnDemand](https://openondemand.org/).

The app stack consists of Flask, React, and Tailwind CSS.

To run the app:
```
npm run build
```
to have the build rebuild when changes are made to the frontend:
```
npm run build-watch
```
If you make changes to the backend, you will need to recompile the app.

To setup the build environment, create a new sandbox app and follow the instructions outlined in the base dashboard repository to setup your config and build env on the OOD Portal.

There is currently one hardcoded line for development in ClusterInfo.js:

```  
const baseUrl = `${window.location.origin}/pun/sys/dor-hprc-web-tamudashboard-reu-branch`;
```

But this should be dynamic enough to work on your setup.

Components that you can edit are located in:
```
src/Charts
```