This is a webthings.io gateway repository for addons.
The current addons are all functional "as is" and the depot can ne cloned under the "/home/pi/.webthings/" folder of the webthings io image offered on the Webthing.io gateway that will run on the Pi. 
In order to push the addon onto the Things screen of the gateway, you'll need 

1. Ensure "Web Things" addon is enabled (this addon will offer you the possibility to enter yout URL on teh tthings screen, addon comes by default with the image gateway, but might need to be updated if the image gateway changes, currentwebthinggateway.io image is 1.1)
2. You'll then need each addon by their URL with their specified port numbers (each addons: detonator-adapter, lcd-adapter or thermo-reader should be activated one-by-one and not together as this will overlap the server settings). In the case of our code, each addon starts it's own server at port 8888, ex: http://--deviceip--:8888, since I set a static IP to the raspberry PI (@192.168.3.99), my home device addon adddress would be: http://192.168.3.99:8888
3. Click in scanning in the Things menu will identify the running addon.

For more details see the following documentation: "https://webthings.io/"

Le dépôt GitHub WebthingsIoThermoDesignAddons contient trois addons principaux pour le gateway WebThings.io :
1.	Addon Thermo Design - Utilise un capteur de température connecté via le GPIO 04 (w1) pour récupérer les données et utilise aussi le paquet Node.js lcdi2c pour mettre à jour la température sur l’affichage 2004 LCD Display Module HD44780 (20x4)
2.	Addon LCD - Utilise le paquet Node.js lcdi2c pour la communication I2C avec un écran LCD (affichage 2004 LCD Display Module HD44780 (20x4))
Ces addons sont configurés pour être installés sur un Raspberry Pi et fonctionner sur le gateway WebThings.
3.	Addon Detonator - Un detonateur fictif pour tester les differents senseurs existant sur le module (sonar distance sensor, LCD screen, piezo buzzer)

Link to this repository: https://github.com/NasTheRobotKing/WebthingsIoThermoDesignAddons

