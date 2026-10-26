import Gio from 'gi://Gio';
import St from 'gi://St';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {Extension} from
        'resource:///org/gnome/shell/extensions/extension.js';

const API_REFRESH_SECONDS = 6 * 60 * 60;
const CLOCK_REFRESH_SECONDS = 60;

export default class SunWallpaperExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._backgroundSettings = new Gio.Settings({
            schema_id: 'org.gnome.desktop.background',
        });
        this._session = new Soup.Session();
        this._apiTimeoutId = null;
        this._clockTimeoutId = null;
        this._settingsChangedId = null;
        this._solarTimes = null;
        this._currentPhase = null;
        this._apiRequestSerial = 0;

        this._indicator = new PanelMenu.Button(0.0, 'Sun Wallpaper');
        this._label = new St.Label({
            text: 'Loading solar data...',
            y_align: Clutter.ActorAlign.CENTER,
        });
        this._indicator.add_child(this._label);
        this._buildMenu();
        Main.panel.addToStatusArea(this.uuid, this._indicator);

        this._settingsChangedId = this._settings.connect(
            'changed',
            (_settings, key) => this._onSettingsChanged(key)
        );

        this._refreshApi();
        this._apiTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            API_REFRESH_SECONDS,
            () => {
                this._refreshApi();
                return GLib.SOURCE_CONTINUE;
            }
        );
        this._clockTimeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            CLOCK_REFRESH_SECONDS,
            () => {
                this._updatePhase();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    disable() {
        for (const id of [this._apiTimeoutId, this._clockTimeoutId]) {
            if (id !== null)
                GLib.source_remove(id);
        }

        this._apiTimeoutId = null;
        this._clockTimeoutId = null;

        if (this._settingsChangedId !== null) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }

        if (this._apiTimeoutId) {
            GLib.Source.remove(this._apiTimeoutId);
            this._apiTimeoutId = 0;
        }

        if (this._clockTimeoutId) {
            GLib.Source.remove(this._clockTimeoutId);
            this._clockTimeoutId = 0;
        }

        if (this._label) {
            this._label.destroy();
            this._label = null;
        }

        if (this._statusItem) {
            this._statusItem.destroy();
            this._statusItem = null;
        }

        if (this._locationItem) {
            this._locationItem.destroy();
            this._locationItem = null;
        }
        this._session?.abort();
        this._session = null;
        this._indicator?.destroy();
        this._indicator = null;
        this._label = null;
        this._statusItem = null;
        this._locationItem = null;
        this._settings = null;
        this._backgroundSettings = null;
    }

    _onSettingsChanged(key) {
        if (key === 'latitude' || key === 'longitude') {
            this._refreshApi();
            return;
        }

        if (key.startsWith('wallpaper-'))
            this._updatePhase(true);
    }

    _buildMenu() {
        this._statusItem = new PopupMenu.PopupMenuItem(
            'Waiting for API...'
        );
        this._statusItem.reactive = false;
        this._indicator.menu.addMenuItem(this._statusItem);
        this._indicator.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );
        this._locationItem = new PopupMenu.PopupMenuItem('Location: --');
        this._locationItem.reactive = false;
        this._indicator.menu.addMenuItem(this._locationItem);

        this._indicator.menu.addMenuItem(
            new PopupMenu.PopupSeparatorMenuItem()
        );
        const settingsItem = new PopupMenu.PopupMenuItem('Settings');
        settingsItem.connect('activate', () => this.openPreferences());
        this._indicator.menu.addMenuItem(settingsItem);
    }

    async _refreshApi() {
        if (!this._session || !this._settings)
            return;

        const session = this._session;
        const requestSerial = ++this._apiRequestSerial;
        const latitude = this._settings.get_double('latitude');
        const longitude = this._settings.get_double('longitude');
        const location = this._settings.get_string('location-name');
        const url =
            'https://api.sunrise-sunset.org/v2' +
            `?lat=${encodeURIComponent(latitude)}` +
            `&lng=${encodeURIComponent(longitude)}`;

        if (!this._solarTimes)
            this._label?.set_text('Loading solar data...');

        try {
            const message = Soup.Message.new('GET', url);
            const bytes = await new Promise((resolve, reject) => {
                session.send_and_read_async(
                    message,
                    GLib.PRIORITY_DEFAULT,
                    null,
                    (requestSession, result) => {
                        try {
                            resolve(
                                requestSession.send_and_read_finish(result)
                            );
                        } catch (error) {
                            reject(error);
                        }
                    }
                );
            });

            if (session !== this._session ||
                requestSerial !== this._apiRequestSerial)
                return;
            if (message.statusCode < 200 || message.statusCode >= 300)
                throw new Error(`HTTP ${message.statusCode}`);

            const data = JSON.parse(
                new TextDecoder().decode(bytes.get_data())
            );
            if (data.status && data.status !== 'OK')
                throw new Error(`API status: ${data.status}`);

            const result = data.results ?? data;
            const sunrise = result.golden_hour?.morning?.begin ?? result.sunrise;
            const day = result.golden_hour?.morning?.end ?? result.solar_noon;
            const sunset = result.golden_hour?.evening?.begin ?? result.sunset;
            const night = result.last_light ?? result.civil_twilight_end;

            if (![sunrise, day, sunset, night].every(Boolean)) {
                throw new Error(
                    'API response must contain sunrise, day, sunset and night times'
                );
            }

            const times = {
                sunrise: Date.parse(sunrise),
                day: Date.parse(day),
                sunset: Date.parse(sunset),
                night: Date.parse(night),
                labels: {
                    sunrise: this._formatTime(sunrise),
                    day: this._formatTime(day),
                    sunset: this._formatTime(sunset),
                    night: this._formatTime(night),
                },
            };

            if (![
                times.sunrise,
                times.day,
                times.sunset,
                times.night,
            ].every(Number.isFinite)) {
                throw new Error('API returned an invalid time');
            }

            this._solarTimes = times;
            this._locationItem.label.text = `Location: ${location || `${latitude}, ${longitude}`}`;
            this._updatePhase(true);
            log('Sun Wallpaper: solar times refreshed');
        } catch (error) {
            if (session !== this._session ||
                requestSerial !== this._apiRequestSerial)
                return;

            logError(error, 'Sun Wallpaper API request failed');
            if (!this._solarTimes) {
                this._label?.set_text('API Error');
                this._statusItem.label.text = `API Error: ${error.message}`;
            }
        }
    }

    _formatTime(value) {
        const match = value.match(/T(\d{2}:\d{2})/);
        return match ? match[1] : value;
    }

    _updatePhase(forceWallpaper = false) {
        if (!this._solarTimes)
            return;

        const now = Date.now();
        const times = this._solarTimes;
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const nextDayOffset = times.sunrise < today.getTime()
            ? 24 * 60 * 60 * 1000
            : 0;
        const sunrise = times.sunrise + nextDayOffset;
        const day = times.day + nextDayOffset;
        const sunset = times.sunset + nextDayOffset;
        const night = times.night + nextDayOffset;
        let phase;
        let from;
        let to;

        if (now >= sunrise && now < day) {
            phase = 'sunrise';
            from = times.labels.sunrise;
            to = times.labels.day;
        } else if (now >= day && now < sunset) {
            phase = 'day';
            from = times.labels.day;
            to = times.labels.sunset;
        } else if (now >= sunset && now < night) {
            phase = 'sunset';
            from = times.labels.sunset;
            to = times.labels.night;
        } else {
            phase = 'night';
            from = times.labels.night;
            to = times.labels.sunrise;
        }

        this._label.set_text(`${from} → ${to}`);
        this._statusItem.label.text =
            `Sunrise ${times.labels.sunrise} | Day ${times.labels.day} | ` +
            `Sunset ${times.labels.sunset} | Night ${times.labels.night}`;

        if (phase !== this._currentPhase || forceWallpaper) {
            this._currentPhase = phase;
            this._applyWallpaper(phase);
        }
    }

    _applyWallpaper(phase) {
        const uri = this._settings.get_string(`wallpaper-${phase}`);
        if (!uri)
            return;

        this._backgroundSettings.set_string('picture-uri', uri);
        this._backgroundSettings.set_string('picture-uri-dark', uri);
        log(`Sun Wallpaper: applied ${phase} wallpaper`);
    }
}
