# Coordinate and Wallpaper Setup

This tutorial explains how to set the location used for solar-time calculations and assign an image to each solar phase.

## 1. Open Sun Wallpaper preferences

Open the **Extensions** app, find **Sun Wallpaper**, and select its preferences button. You can also open a terminal and run:

```sh
gnome-extensions prefs sunwallpaper@Nurdin027
```

The preferences window has a **Location** section and a **Wallpapers** section.

## 2. Find your coordinates

Coordinates use decimal degrees:

- **Latitude** ranges from `-90` to `90`. North of the equator is positive; south is negative.
- **Longitude** ranges from `-180` to `180`. East of the Prime Meridian is positive; west is negative.

For example, Bandung, Indonesia is approximately:

```text
Latitude:  -6.914468
Longitude: 107.583409
```

To find your own coordinates, open a map service, right-click or long-press your location, and copy the latitude and longitude it shows. Enter latitude in the **Latitude** field and longitude in the **Longitude** field. Keep the minus sign for southern or western coordinates.

The extension saves the values as you change them and requests new solar times. The **Location** row may take a moment to display a resolved place name. The place name is informational; the coordinates are what determine the solar times.

## 3. Choose the four wallpapers

In the **Wallpapers** section, select **Choose…** beside each phase. Pick an image file and select **Open** or **Select** in the file chooser.

Assign one image to each:

| Phase | When it is used |
| --- | --- |
| **Sunrise** | From sunrise through the morning transition |
| **Day** | From the morning transition until the evening transition |
| **Sunset** | From sunset through evening twilight |
| **Night** | From the end of evening twilight until the next sunrise |

The included sample files are `images/sunrise.png`, `images/day.png`, `images/sunset.png`, and `images/night.png`. You can choose other image files from anywhere on your computer. If you move or delete a selected file later, choose it again from its new location.

## 4. Confirm the setup

Close preferences and select the Sun Wallpaper indicator in the top panel. It displays the current time range and the solar times retrieved for the selected coordinates. The extension checks the phase once per minute and updates the desktop background when a phase changes. It also applies the current phase's wallpaper when you change a wallpaper selection.

Solar times are refreshed every six hours. An internet connection is needed for the solar-time service. The place-name lookup uses a separate service; if that lookup fails, the coordinates can still be used to calculate solar times.

## Coordinate examples

| Location | Latitude | Longitude |
| --- | ---: | ---: |
| Bandung, Indonesia | `-6.914468` | `107.583409` |
| London, United Kingdom | `51.5072` | `-0.1276` |
| New York, United States | `40.7128` | `-74.0060` |

These are approximate city-center coordinates. For the most relevant local solar times, use coordinates near the computer's actual location.
