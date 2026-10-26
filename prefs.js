import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class SunWallpaperPreferences
    extends ExtensionPreferences {

    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const session = new Soup.Session();
        let lookupTimeoutId = null;
        let lookupSerial = 0;
        const page = new Adw.PreferencesPage();

        const locationGroup = new Adw.PreferencesGroup({
            title: 'Location',
            description:
                'Location used to calculate solar times',
        });
        const latitudeRow = new Adw.SpinRow({
            title: 'Latitude',
            subtitle: 'Example: -6.914468',
            adjustment: new Gtk.Adjustment({
                lower: -90,
                upper: 90,
                step_increment: 0.000001,
                page_increment: 1,
                value: settings.get_double('latitude'),
            }),
            digits: 6,
        });
        const longitudeRow = new Adw.SpinRow({
            title: 'Longitude',
            subtitle: 'Example: 107.583409',
            adjustment: new Gtk.Adjustment({
                lower: -180,
                upper: 180,
                step_increment: 0.000001,
                page_increment: 1,
                value: settings.get_double('longitude'),
            }),
            digits: 6,
        });
        const locationRow = new Adw.EntryRow({
            title: 'Location',
            text: settings.get_string('location-name'),
        });
        locationRow.set_editable(false);

        const updateLocationName = async () => {
            const serial = ++lookupSerial;
            const latitude = settings.get_double('latitude');
            const longitude = settings.get_double('longitude');
            const url =
                'https://kodepos.vercel.app/detect' +
                `?latitude=${encodeURIComponent(latitude)}` +
                `&longitude=${encodeURIComponent(longitude)}`;

            locationRow.set_text('Looking up location...');

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

                if (serial !== lookupSerial)
                    return;

                if (message.statusCode < 200 || message.statusCode >= 300)
                    throw new Error(`HTTP ${message.statusCode}`);

                const response = JSON.parse(
                    new TextDecoder().decode(bytes.get_data())
                );
                const place = response.data;

                if (response.statusCode !== 200 || !place)
                    throw new Error('Location was not found');

                const name = [
                    place.village,
                    place.district,
                    place.regency,
                    place.province,
                ].filter(Boolean).join(', ');
                const value = place.code
                    ? `${name} (${place.code})`
                    : name;

                settings.set_string('location-name', value);
                locationRow.set_text(value);
            } catch (error) {
                if (serial !== lookupSerial)
                    return;

                locationRow.set_text('Location lookup failed');
                logError(error, 'Sun Wallpaper location lookup failed');
            }
        };

        const scheduleLocationLookup = () => {
            // Ignore any request started for the previous coordinates.
            lookupSerial++;

            if (lookupTimeoutId !== null)
                GLib.source_remove(lookupTimeoutId);

            lookupTimeoutId = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                700,
                () => {
                    lookupTimeoutId = null;
                    updateLocationName();
                    return GLib.SOURCE_REMOVE;
                }
            );
        };

        latitudeRow.adjustment.connect(
            'value-changed',
            scheduleLocationLookup
        );
        longitudeRow.adjustment.connect(
            'value-changed',
            scheduleLocationLookup
        );

        settings.bind(
            'latitude',
            latitudeRow.adjustment,
            'value',
            0
        );

        settings.bind(
            'longitude',
            longitudeRow.adjustment,
            'value',
            0
        );

        locationGroup.add(latitudeRow);
        locationGroup.add(longitudeRow);
        locationGroup.add(locationRow);

        const wallpaperGroup = new Adw.PreferencesGroup({
            title: 'Wallpapers',
            description: 'Choose an image for each solar phase',
        });

        const wallpaperOptions = [
            ['wallpaper-sunrise', 'Sunrise'],
            ['wallpaper-day', 'Day'],
            ['wallpaper-sunset', 'Sunset'],
            ['wallpaper-night', 'Night'],
        ];

        for (const [key, title] of wallpaperOptions) {
            const uri = settings.get_string(key);
            const row = new Adw.ActionRow({
                title,
                subtitle: uri ? Gio.File.new_for_uri(uri).get_basename() : 'No image selected',
            });
            const button = new Gtk.Button({
                label: 'Choose…',
                valign: Gtk.Align.CENTER,
            });

            button.connect('clicked', () => {
                const chooser = Gtk.FileChooserNative.new(
                    `Choose ${title} wallpaper`,
                    window,
                    Gtk.FileChooserAction.OPEN,
                    'Select',
                    'Cancel'
                );
                const filter = new Gtk.FileFilter();
                filter.set_name('Images');
                filter.add_mime_type('image/*');
                chooser.add_filter(filter);

                chooser.connect('response', (dialog, response) => {
                    if (response === Gtk.ResponseType.ACCEPT) {
                        const file = dialog.get_file();
                        if (file) {
                            settings.set_string(key, file.get_uri());
                            row.subtitle = file.get_basename();
                        }
                    }
                    dialog.destroy();
                });
                chooser.show();
            });

            row.add_suffix(button);
            row.activatable_widget = button;
            wallpaperGroup.add(row);
        }

        page.add(locationGroup);
        page.add(wallpaperGroup);

        window.add(page);

        if (!settings.get_string('location-name'))
            scheduleLocationLookup();

        window.connect('close-request', () => {
            if (lookupTimeoutId !== null)
                GLib.source_remove(lookupTimeoutId);
            lookupSerial++;
            session.abort();
            return false;
        });
    }
}
