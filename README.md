## OnDemand/Passenger: Flask example app

This is a [Flask](http://flask.pocoo.org/) app for [the Passenger application server](https://www.phusionpassenger.com/) that has been modified to work with [OnDemand](https://openondemand.org/).

The app stack consists of Flask, React, and Tailwind CSS.

You will first need to source Node.js to start the app. Use:
```
source scl_source enable rh-nodejs14
```
Clone the repository with submodules:
```
git clone https://github.com/victoriaemily/dor-hprc-web-tamudashboard.git
git submodule init
git submodule update
```
Make sure you install any dependencies with 
```
npm i
```

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

The project includes submodules located in:
```
external/
```

Remember to pull and update submodules when updating the repository:
```
git pull
git submodule update --remote
```
