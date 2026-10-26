# Sun Wallpaper

Sun Wallpaper is a GNOME Shell extension that changes your desktop background according to the solar time at a chosen location. It uses four images for sunrise, daytime, sunset, and nighttime.

## Features

- Calculates solar phases from latitude and longitude.
- Applies a separate wallpaper for sunrise, day, sunset, and night.
- Shows the current solar phase and the day's solar times in the GNOME top bar menu.
- Refreshes solar data every six hours and checks the active phase every minute.
- Provides preferences to set coordinates and choose local image files.

## Requirements

- GNOME Shell 46, 47, 48, 49, or 50.
- An internet connection to retrieve solar times and resolve a location name.
- Four image files of your choice. The included `images/` folder contains sample wallpapers.

## Installation

### Install from a GNOME extension package

If you received Sun Wallpaper as an extension package, install it with GNOME Extensions or Extension Manager, then enable it.

### Install from this source folder

From the project directory, compile the settings schema and copy the extension into your personal GNOME extensions directory:

```sh
glib-compile-schemas schemas
mkdir -p ~/.local/share/gnome-shell/extensions/sunwallpaper@Nurdin027
cp -r extension.js prefs.js metadata.json schemas images ~/.local/share/gnome-shell/extensions/sunwallpaper@Nurdin027/
```

Then enable it:

```sh
gnome-extensions enable sunwallpaper@Nurdin027
```

Open the extension preferences to configure it:

```sh
gnome-extensions prefs sunwallpaper@Nurdin027
```

On GNOME Wayland, sign out and back in if the extension does not appear after installation. You can also enable and configure it in the GNOME Extensions app.

## Quick setup

1. Open **Sun Wallpaper** preferences.
2. Set the latitude and longitude for the location where the computer is used.
3. Choose an image for **Sunrise**, **Day**, **Sunset**, and **Night**.
4. Wait for the extension to retrieve solar times. It updates the desktop background automatically as each phase begins.

For detailed instructions, see [Coordinate and Wallpaper Setup](TUTORIAL.md).

## How the solar phases are selected

The extension retrieves sunrise, morning golden-hour end (or solar noon), evening golden-hour start (or sunset), and last light (or civil twilight end). It uses these times to select the active wallpaper. Solar data is refreshed every six hours; the phase is checked every minute.

## Troubleshooting

- **The panel says “API Error”:** Check your internet connection and confirm the coordinates are within the valid ranges: latitude −90 to 90, longitude −180 to 180.
- **A wallpaper does not change:** Confirm that an image is selected for the relevant phase and that the file remains available. Reopen preferences to select it again if it was moved or deleted.
- **The displayed location is blank or lookup failed:** The coordinates still drive solar-time calculations. The location name is only a label and may fail to resolve if its lookup service is unavailable.
- **The extension does not load after a source install:** Make sure the schema was compiled and that the files are in `~/.local/share/gnome-shell/extensions/sunwallpaper@Nurdin027/`. On Wayland, sign out and back in.

## Project files

- `extension.js` — solar-time retrieval, phase selection, panel indicator, and wallpaper changes.
- `prefs.js` — coordinate and wallpaper preferences.
- `schemas/org.gnome.shell.extensions.sunwallpaper.gschema.xml` — default settings and schema definition.
- `images/` — sample phase wallpapers.
