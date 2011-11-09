const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const PanelMenu = imports.ui.panelMenu;
const PopupMenu = imports.ui.popupMenu;
const Lang = imports.lang;
const GLib = imports.gi.GLib;
const Pk = imports.gi.PackageKitGlib;
const St = imports.gi.St;
const Pango = imports.gi.Pango;
const Gtk = imports.gi.Gtk;

// 15 min
const CHECK_INTERVAL = 900000;

function Indicator() {
    this._init.apply(this, arguments);
}

Indicator.prototype = {
    __proto__: PanelMenu.SystemStatusButton.prototype,

    _init: function() {
        PanelMenu.SystemStatusButton.prototype._init.call(this, 'software-update-urgent');
        // The PackageKit client instance
        this._client = new Pk.Client();
        // List of updates
        this._packages = "";
        // FIXME
        this.menu.addMenuItem(new PopupMenu.PopupMenuItem(""));
        // Hide the menu by default
        this.actor.hide();
        // Check for updates at start
        Mainloop.timeout_add(5000, Lang.bind(this, this.checkUpdates));
    },

    checkUpdates: function() {
        this.displayResult(this._client.get_updates(Pk.PK_FILTER_ENUM_NONE, null, Lang.bind(this, this._updatesProgress)));
        // Query PackageKit in 15 mins
        Mainloop.timeout_add(CHECK_INTERVAL, Lang.bind(this, this.checkUpdates));
    },

    displayResult: function(result) {
        this._packages = result.get_package_array();
        if (this._packages.length > 0) {
            // Clear the menu
            this.menu.removeAll();
            // Set the tooltip
            this.setTooltip("%d updates".format(this._packages.length));
            // Add data in the menu
            let scroll_area = new St.ScrollView({ name: 'updates-scrollview',
                                               vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
                                               hscrollbar_policy: Gtk.PolicyType.NEVER,
                                               style_class: 'vfade' });
            let packages_list = new St.BoxLayout({vertical: true, style_class: "updates-box"});
            scroll_area.add_actor(packages_list);
            for (let i=0; i<this._packages.length; i++) {
                let package_name = new St.Label({text: '%s (%s)'.format(
                        this._packages[i].get_name(), 
                        this._packages[i].get_version()), 
                        style_class: "package-name"}
                );
                let package_desc = new St.Label({text: '%s'.format(
                        this._packages[i].get_summary()), 
                        style_class: "package-desc"}
                );
                if (package_desc.clutter_text) {
                    package_desc.clutter_text.line_wrap = true;
                    package_desc.clutter_text.line_wrap_mode = Pango.WrapMode.WORD_CHAR;
                    package_desc.clutter_text.ellipsize = Pango.EllipsizeMode.NONE;
                }
                packages_list.add_actor(package_name);
                packages_list.add_actor(package_desc);
            }
            this.menu.addActor(scroll_area);
            this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem())
            this.menu.addMenuItem(new PopupMenu.PopupMenuItem("Install updates..."));
            // Show the indicator
            this.actor.show();
        }
        else {
            // No updates, keep it hidden
            this.actor.hide();
        }
    },

    _updatesProgress: function(progress) {
    },

    enable: function() {
        Main.panel.addToStatusArea('packagekit', this);
    },

    disable: function() {
        this.destroy();
    }
}

function init() {
    return new Indicator();
}
