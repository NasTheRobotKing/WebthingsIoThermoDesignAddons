This is a webthings.io gateway repository for addons. 
The current addons are all functional "as is" and can be placed under the "/home/pi/.webthings/addons" path of the Webthing.io gateway running on the Pi. 
In order to push the addon onto the Things screen of the gateway, you'll need to refer to them by their URL with their specified port numbers, in the following case, port 8888 was used, ex: http://--deviceip--:8888

For more details see the following documentation: "https://webthings.io/"

Le dépôt GitHub WebthingsIoThermoDesignAddons contient trois addons principaux pour le gateway WebThings.io :
1.	Addon Thermo Design - Utilise un capteur de température connecté via le GPIO 04 (w1) pour récupérer les données et utilise aussi le paquet Node.js lcdi2c pour mettre à jour la température sur l’affichage 2004 LCD Display Module HD44780 (20x4)
2.	Addon LCD - Utilise le paquet Node.js lcdi2c pour la communication I2C avec un écran LCD (affichage 2004 LCD Display Module HD44780 (20x4))
Ces addons sont configurés pour être installés sur un Raspberry Pi et fonctionner sur le gateway WebThings.
3.	Addon Detonator - Un detonateur fictif pour tester les differents senseurs existant sur le module (sonar distance sensor, LCD screen, piezo buzzer)

Link to this repository: https://github.com/NasTheRobotKing/WebthingsIoThermoDesignAddons

