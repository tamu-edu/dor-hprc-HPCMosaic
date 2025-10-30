HPCMosaic is a modern modular dashboard developed by High Performance Research Computing (HPRC) at Texas A&M University. It provides researchers with an intuitive graphical interface for interacting with high-performance computing clusters, reducing the complexity of system management.

To setup/install HPCMosiac, see the instructions below. If you have any questions, please contact us at help@hprc.tamu.edu. If you find any bugs, you are also welcome to create an issue in this repo.

It is a [Flask](http://flask.pocoo.org/) app for [the Passenger application server](https://www.phusionpassenger.com/) that has been modified to work with [OnDemand](https://openondemand.org/).

The app stack consists of Flask, React, and Tailwind CSS.

## Cloning:
> git clone https://github.com/tamu-edu/dor-hprc-HPCMosaic.git  
> git submodule init  
> git submodule update  

## Getting started
After cloning the repo inside OOD (either sys or dev directory), enter the HPCMosaic directory and run the following command:
> ./setup.sh

Follow the prompts. You will have to set the cluster name for the dashboard, which will propogate to all relevant locations, as well as whether the enviornment is for development or production. After which all the Python dependencies in requirements.txt will be installed.

After running the setup script, the app should be ready to use.

On TAMU clusters, all installations went smoothly so far, without any issues. If you face any issues when trying to install the app, please contact help@hprc.tamu.edu for help.

## To have changes propogate to dashboard
After modifying code within the project, execute:

> npm run build 

And on a succesful run you will see the changes appear on the dashboard. Note that this is specifically for frontend changes. If backend changes (i.e. api modifications) are made, you will further have to go to the online portal, navigate to the help dropdown and click the 'Restart Web Server' option for the changes to propogate immediately.

## To have changes propogate every time frontend is modified
>npm run build-watch

## Extra info
The project includes submodules located in:
external/

Specifically, Drona Composer. The repo for which is https://github.com/tamu-edu/dor-hprc-drona-composer

Remember to pull and update submodules when updating the repository:
> git pull  
> git submodule update --remote
