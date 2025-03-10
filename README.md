This is a webthings.io gateway repository for my personal addons.

The current addons are all functional "as is" and the repo can be cloned directly on the "/home/pi/.webthings/" folder of the webthings io image offered on the Webthing.io gateway server (version 1.1) running on the Pi.

In order to push the addon onto the Things screen of the gateway, you'll need:

1. Ensure "Web Things" addon is enabled in your list of addons. The "Web Things" addon will offer you the possibility to enter your custom addon URL on the things screen. The "Web Things" addon comes by default with the image gateway, but might need to be updated if the image gateway changes. (*The version of the current webthings gateway.io image is 1.1)
2. You'll then need to add each addon by their URL with their specified port number (each addons: detonator-adapter, lcd-adapter or thermo-reader should be activated one-by-one and not together as this will overlap the server settings). Each URL addon on the Things screen are added using the following: http://<serverip>:<port>. In the case of my code, the main "Thermo Reader" addon starts the server at port 8888, since I set a static IP to the raspberry PI @192.168.3.99, my home device addon URL for the thermo-reader would be: http://192.168.3.99:8888
3. Once URL addon adeed, click on "done" and the the Things menu will identify your addon and add it to the running Things addons UI interface.

For more details see the following documentation: "https://webthings.io/"

Le dépôt GitHub WebthingsIoThermoDesignAddons contient trois addons principaux pour le gateway WebThings.io (Ces addons sont configurés pour être installés sur un Raspberry Pi et fonctionner sur le WebThings gateway.io):
1.	Addon Thermo Design (http://192.168.3.99:8888) - Utilise un capteur de température connecté via le GPIO 04 (w1) pour récupérer les données et utilise aussi le paquet Node.js lcdi2c pour mettre à jour la température sur l’affichage 2004 LCD Display Module HD44780 (20x4)
2.	Addon LCD (http://192.168.3.99:8889) - Utilise le paquet Node.js lcdi2c pour la communication I2C avec un écran LCD (affichage 2004 LCD Display Module HD44780 (20x4)) donnat à l'usager la possibilité d'entrer du Free Text sur l'affichage.
3.	Addon Detonator (http://192.168.3.99:8800)- Un detonateur fictif pour tester les differents senseurs existant sur le module (sonar distance sensor, LCD screen, piezo buzzer)

Link to this repository: https://github.com/NasTheRobotKing/WebthingsIoThermoDesignAddons

