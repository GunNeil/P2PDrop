import Ember from 'ember';
import PrettyBytes from '../mixins/pretty-bytes';
import _ from 'lodash';

const {
  Component,
  run,
  inject
} = Ember;

export default Component.extend(PrettyBytes, {
  files: [],
  currentGUID: null,
  notify: inject.service("notify"),
  didInsertElement : function () {
    this.set("thumbnailContext", this);
    this.highlightSelected();
  },

  //Update the download/upload information
  updateSpeed : function (torrent, client) {
    var progress = Math.round((100 * torrent.progress).toFixed(1));
    return {
      peers : torrent.swarm.wires.length,
      progress : progress
    };
  },

  //once file metadata is received render the card
  renderCard : function (torrent, name) {
    let files = this.get("files");
    let guid = this.guid();
    let self = this;
    let notify = this.get("notify");
    this.set("currentGUID", guid);
    let file = Ember.Object.create({
      name: torrent.name,
      guid: guid,
      url: "",
      selected: false,
      isDownloading: true,
      progress: "0%"
    });
    files.pushObject(file);

    let progressInfo = '<b>File Name:</b> ' + torrent.name + '<br> '
    + '<b>Total Size:</b> ' + self.prettyBytes(torrent.info.length)  + '<br> '
    + '<b>Peers:</b> ' + torrent.numPeers + '<br> '
    + '<b>Download speed:</b> ' + self.prettyBytes(torrent.client.downloadSpeed) + '/s  <br>' +
    '<b>Upload speed:</b> ' + self.prettyBytes(torrent.client.uploadSpeed) + '/s';

    let progressInfoNotify = notify.info({ html: progressInfo , closeAfter: null});

    let message = self.get("notify").info(name +' sent you a file ' + torrent.name);
    //While downloading show loader
    torrent.on('download', function (chunkSize) {
      let changedFile = files.findProperty("guid", guid);
      progressInfo = progressInfo = '<b>File Name:</b> ' + torrent.name + '<br> '
      + '<b>Total Size:</b> ' + self.prettyBytes(torrent.info.length)  + '<br> '
      + '<b>Peers:</b> ' + torrent.numPeers + '<br> '
      + '<b>Download speed:</b> ' + self.prettyBytes(torrent.client.downloadSpeed) + '/s  <br>' +
      '<b>Upload speed:</b> ' + self.prettyBytes(torrent.client.uploadSpeed) + '/s';

      let updateSpeed = function () {
        let update = self.updateSpeed(torrent);
        progressInfoNotify.set("html", progressInfo);
        changedFile.set("progress", update.progress + "%");
        if (parseInt(update.progress) === 100) {
          run.later(self, function () {
            message.set('visible', false);
          }, 3000);
          changedFile.set("isDownloading", false);
          progressInfoNotify.set('visible', false);
          run.cancel(throttle);
        }
      };
      //Once downloaded destroy client //TODO
      //torrent.on('done', function () {
        //torrent.destroy();
      //});
      let throttle = run.throttle(self, updateSpeed, 10);
    });

    this.set("files", files);
  },

  //once file is downloaded append to anchor tag to download the file
  appendFile : function (file, callback) {
    let files = this.get("files");
    let guid = this.get("currentGUID");
    let changedFile = files.findProperty("guid", guid);
    let self = this;
    if (typeof file.getBlobURL === "function") {
      file.getBlobURL(function (err, url) {
        if (err) {
          throw err;
        }
        changedFile.set("url", url);
        self.highlightSelected(guid);
        callback(changedFile);
      });
    } else {
      changedFile.set("url", file.url);
      self.highlightSelected(guid);
      callback(changedFile);
    }

  },

  //generate guid
  guid: function () {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
      s4() + '-' + s4() + s4() + s4();
  },

  //highlight the selected file
  highlightSelected: function (guid) {
    let files = this.get("files");
    let prevFile = files.findProperty("selected", true);
    if (prevFile) {
      prevFile.set("selected", false);
    }
    if (guid) {
      let changedFile = files.findProperty("guid", guid);
      changedFile.set("selected", true);
    }
  },

  actions : {
    triggerActionBar : function (data) {
      this.highlightSelected(data.guid);
      this.sendAction("fileChange", data);
    },
    deleteCard : function (data) {
      let files = this.get("files");
      files.removeObject(data);
      this.set("files", files);
      this.sendAction("resetSelected", false);
    }
  }
});
