This is a [Flask](http://flask.pocoo.org/) app for [the Passenger application server](https://www.phusionpassenger.com/) that has been modified to work with [OnDemand](https://openondemand.org/).

The app stack consists of Flask, React, and Tailwind CSS.

##How to clone with submodules
git clone https://github.com/tamu-edu/dor-hprc-HPCMosaic.git
git submodule init
git submodule update

## How to setup
To setup the build environment, create a new sandbox app and follow the instructions outlined in the base dashboard repository to setup your config and build env on the OOD Portal.

But this should be dynamic enough to work on your setup. Then you should be able to simply run:

bash setup.sh

And have the venv created, dependencies set up, etc.

## To have changes propogate to dashboard
npm run build 

##To have changes propogate every time frontend is modified
npm run build-watch

## Extra info
The project includes submodules located in:
external/
```

There is currently one hardcoded line for development in ClusterInfo.js:
const baseUrl = `${window.location.origin}/pun/sys/dor-hprc-web-tamudashboard-reu-branch`;
```

Remember to pull and update submodules when updating the repository:
git pull
git submodule update --remote
```
